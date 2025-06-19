import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { streamLLMResponse, generateChatMetadata } from "./lib/openrouter";

async function exchangeMessages(
    ctx: MutationCtx,
    userId: Id<"users">,
    spaceId: Id<"spaces">,
    chatId: Id<"chats">,
    keyId: Id<"keys">,
    model: string,
    userText: string,
    isNew: boolean,
): Promise<void> {
    const userMsgId = await ctx.db.insert("messages", {
        userId,
        chatId,
        type: "outgoing",
        body: userText,
        created: BigInt(Date.now()),
    });
    const modelMsgId = await ctx.db.insert("messages", {
        userId,
        chatId,
        type: "loading",
        body: "",
        created: BigInt(Date.now()),
        replyMsgId: userMsgId,
        model,
    });
    await ctx.scheduler.runAfter(0, internal.chat.generateResponse, {
        messageId: modelMsgId,
        userId,
        spaceId,
        chatId,
        keyId,
        model,
        isNew,
    });
}

export const getKeySecret = internalQuery({
    args: {
        keyId: v.id("keys"),
    },

    handler: async (ctx, args) => {
        const key = await ctx.db.get(args.keyId);
        if (!key) {
            throw new Error("Key not found");
        }
        return key.value;
    },
});

// TODO: this is a dirty hack, migrate to redis streams asap
export const streamMessageText = internalMutation({
    args: {
        messageId: v.id("messages"),
        newText: v.string(),
    },

    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, {
            type: 'streaming',
            body: args.newText,
        });
    },
});

export const markMessageDone = internalMutation({
    args: {
        messageId: v.id("messages"),
    },

    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, {
            type: 'complete',
        });
    },
});

export const saveChatMetadata = internalMutation({
    args: {
        userId: v.id("users"),
        spaceId: v.id("spaces"),
        chatId: v.id("chats"),
        title: v.string(),
        tags: v.array(v.string()),
    },

    handler: async (ctx, args) => {
        await ctx.db.patch(args.chatId, {
            title: args.title,
            tags: args.tags,
        });
        for (const tag of args.tags) {
            await ctx.runMutation(internal.elf.attachTag, {
                userId: args.userId,
                spaceId: args.spaceId,
                title: tag,
            });
        }
    },
});

export const loadMessageHistoryAsContext = internalQuery({
    args: {
        chatId: v.id("chats"),
    },

    handler: async (ctx, args) => {
        const messages = await ctx.db.query("messages")
            .withIndex("by_chat", q => q.eq("chatId", args.chatId))
            .filter(q => q.or(
                q.eq(q.field("type"), "outgoing"),
                q.eq(q.field("type"), "complete"),
            ))
            .collect();
        return messages.map(m => {
            return {
                role: m.type === 'outgoing' ? 'user' : 'assistant',
                content: m.body,
            };
        });
    },
});

export const generateResponse = internalAction({
    args: {
        userId: v.id("users"),
        spaceId: v.id("spaces"),
        chatId: v.id("chats"),
        messageId: v.id("messages"),
        keyId: v.id("keys"),
        model: v.string(),
        isNew: v.boolean(),
    },

    handler: async (ctx, args) => {
        const keySecret = await ctx.runQuery(internal.chat.getKeySecret, { keyId: args.keyId });
        const messages = await ctx.runQuery(internal.chat.loadMessageHistoryAsContext, { chatId: args.chatId });
        if (!messages.length) {
            throw new Error('No context found to generate response');
        }
        let msgBuf = '';
        for await (const chunk of streamLLMResponse(keySecret, args.model, messages)) {
            msgBuf += chunk;
            await ctx.runMutation(internal.chat.streamMessageText, { messageId: args.messageId, newText: msgBuf });
        }
        await ctx.runMutation(internal.chat.markMessageDone, { messageId: args.messageId });
        if (args.isNew) {
            const chatMetadata = await generateChatMetadata(
                keySecret,
                messages[messages.length - 1],
                { role: 'assistant', content: msgBuf },
            );
            if (chatMetadata) {
                await ctx.runMutation(internal.chat.saveChatMetadata, {
                    userId: args.userId,
                    spaceId: args.spaceId,
                    chatId: args.chatId,
                    ...chatMetadata,
                });
            }
        }
    },
});

export const startChat = mutation({
    args: {
        spaceId: v.id("spaces"),
        model: v.string(),
        keyId: v.id("keys"),
        messageText: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const space = await ctx.db.get(args.spaceId);
        if (!space || space.userId !== userId) {
            throw new Error("Space not found");
        }
        const key = await ctx.db.get(args.keyId);
        if (!key || key.userId !== userId) {
            throw new Error("Key not found");
        }
        const dateFormatterForDefaultTitle = new Intl.DateTimeFormat(undefined, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        });
        const chatId = await ctx.db.insert("chats", {
            userId,
            spaceId: args.spaceId,
            title: `Chat at ${dateFormatterForDefaultTitle.format()}`,
            created: BigInt(Date.now()),
            tags: [],
        });
        await exchangeMessages(ctx, userId, space._id, chatId, key._id, args.model, args.messageText, true);
        return chatId;
    },
});

export const sendMessage = mutation({
    args: {
        chatId: v.id("chats"),
        model: v.string(),
        keyId: v.id("keys"),
        text: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const chat = await ctx.db.get(args.chatId);
        if (!chat || chat.userId !== userId) {
            throw new Error("Chat not found");
        }
        const key = await ctx.db.get(args.keyId);
        if (!key || key.userId !== userId) {
            throw new Error("Key not found");
        }
        await exchangeMessages(ctx, userId, chat.spaceId, chat._id, key._id, args.model, args.text, false);
    },
});

export const listMessages = query({
    args: {
        chatId: v.id("chats"),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const chat = await ctx.db.get(args.chatId);
        if (!chat || chat.userId !== userId) {
            throw new Error("Chat not found");
        }
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_chat", q => q.eq("chatId", args.chatId))
            .collect();
        return messages;
    },
});
