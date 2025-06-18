import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction, internalQuery, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Must support structured outputs, used to generate chat title and tags
// const utilityModel = process.env.ELF_UTILITY_MODEL ?? 'google/gemini-2.0-flash-lite-001';

async function exchangeMessages(
    ctx: MutationCtx,
    userId: Id<"users">,
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
    });
    await ctx.scheduler.runAfter(0, internal.chat.generateResponse, {
        messageId: modelMsgId,
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

export const updateChatInfo = internalMutation({
    args: {
        chatId: v.id("chats"),
        title: v.string(),
        tags: v.array(v.string()),
    },

    handler: async (ctx, args) => {
        await ctx.db.patch(args.chatId, {
            title: args.title,
            tags: args.tags,
        });
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
        chatId: v.id("chats"),
        messageId: v.id("messages"),
        keyId: v.id("keys"),
        model: v.string(),
        isNew: v.boolean(),
    },

    handler: async (ctx, args) => {
        const keySecret = await ctx.runQuery(internal.chat.getKeySecret, { keyId: args.keyId });
        const messages = await ctx.runQuery(internal.chat.loadMessageHistoryAsContext, { chatId: args.chatId });
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${keySecret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: args.model,
                messages,
                stream: true,
            }),
        });
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let msgBuf = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                // Append new chunk to buffer
                buffer += decoder.decode(value, { stream: true });
                // Process complete lines from buffer
                while (true) {
                    const lineEnd = buffer.indexOf('\n');
                    if (lineEnd === -1) break;
                    const line = buffer.slice(0, lineEnd).trim();
                    buffer = buffer.slice(lineEnd + 1);
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0].delta.content;
                            if (content) {
                                msgBuf += content;
                                await ctx.runMutation(internal.chat.streamMessageText, { messageId: args.messageId, newText: msgBuf });
                            }
                        } catch (e) {
                            // Ignore invalid JSON
                        }
                    }
                }
            }
        } finally {
            reader.cancel();
        }
        await ctx.runMutation(internal.chat.markMessageDone, { messageId: args.messageId });
        if (args.isNew) {
            // messages.push({ role: 'assistant', content: msgBuf });
            // messages.push({ role: 'user', content: 'Please generate chat info (metadata) based on the message content above, strictly follow the provided schema. Example: {"title": "Chat Title", "tags": ["tag1", "tag2"]}' });
            // const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            //     method: 'POST',
            //     headers: {
            //         Authorization: `Bearer ${keySecret}`,
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({
            //         model: utilityModel,
            //         messages,
            //         response_format: {
            //             type: 'json_schema',
            //             json_schema: {
            //                 name: 'chat_info',
            //                 strict: true,
            //                 schema: {
            //                     type: 'object',
            //                     properties: {
            //                         title: {
            //                             type: 'string',
            //                             description: 'Very short chat title',
            //                         },
            //                         tags: {
            //                             type: 'array',
            //                             description: 'Between 1 and 3 relevant single word tags',
            //                             items: {
            //                                 type: 'string',
            //                             },
            //                         },
            //                     },
            //                     required: ['title', 'tags'],
            //                     additionalProperties: false,
            //                 },
            //             },
            //         },
            //     }),
            // });
            // const data = await response.json();
            // const chatInfo = data.choices[0].message.content;
            // await ctx.runMutation(internal.chat.updateChatInfo, {
            //     chatId: args.chatId,
            //     title: chatInfo.title,
            //     tags: chatInfo.tags,
            // });
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
        await exchangeMessages(ctx, userId, chatId, key._id, args.model, args.messageText, true);
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
        await exchangeMessages(ctx, userId, chat._id, key._id, args.model, args.text, false);
    },
});

export const getChat = query({
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
        return chat;
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
