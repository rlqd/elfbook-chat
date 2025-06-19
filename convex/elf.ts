import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const addSpace = mutation({
    args: {
        title: v.string(),
        order: v.float64(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        return await ctx.db.insert("spaces", {
            userId,
            ...args,
        });
    },
});

export const editSpace = mutation({
    args: {
        spaceId: v.id("spaces"),
        title: v.optional(v.string()),
        order: v.optional(v.float64()),
        color: v.optional(v.string()),
    },

    handler: async (ctx, args) => {
        if (typeof args.title === 'undefined' && typeof args.order === 'undefined' && typeof args.color === 'undefined') {
            throw new Error("No changes");
        }
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const space = await ctx.db.get(args.spaceId);
        if (!space || space.userId !== userId) {
            throw new Error("Space not found");
        }
        const updates: Partial<typeof args> = {};
        if (typeof args.title !== 'undefined') {
            updates.title = args.title;
        }
        if (typeof args.order !== 'undefined') {
            updates.order = args.order;
        }
        if (typeof args.color !== 'undefined') {
            updates.color = args.color;
        }
        await ctx.db.patch(args.spaceId, updates);
    },
});

export const listSpaces = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const spaces = await ctx.db
            .query("spaces")
            .withIndex("by_user", q => q.eq("userId", userId))
            .collect();
        return spaces.sort((a, b) => a.order - b.order);
    },
});

export const getSpace = query({
    args: {
        spaceId: v.id("spaces"),
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
        return space;
    },
});

export const listTags = query({
    args: {
        spaceId: v.id("spaces"),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const tags = await ctx.db
            .query("tags")
            .withIndex("by_user", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("spaceId"), args.spaceId))
            .collect();
        return tags.sort((a,b) => a.title.localeCompare(b.title));
    },
});

export const listChats = query({
    args: {
        spaceId: v.id("spaces"),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const chats = await ctx.db
            .query("chats")
            .withIndex("by_user", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("spaceId"), args.spaceId))
            .collect();
        return chats.sort((a,b) => Number(b.created - a.created));
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

export const editChatTitle = mutation({
    args: {
        chatId: v.id("chats"),
        title: v.string(),
    },

    handler: async (ctx, args) => {
        if (!args.title.length) {
            throw new Error("No changes");
        }
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const chat = await ctx.db.get(args.chatId);
        if (!chat || chat.userId !== userId) {
            throw new Error("Space not found");
        }
        await ctx.db.patch(args.chatId, { title: args.title });
    },
});

export const addChatTag = mutation({
    args: {
        chatId: v.id("chats"),
        tag: v.string(),
    },

    handler: async (ctx, args) => {
        if (!args.tag.length) {
            throw new Error("No changes");
        }
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const chat = await ctx.db.get(args.chatId);
        if (!chat || chat.userId !== userId) {
            throw new Error("Space not found");
        }
        if (chat.tags.includes(args.tag)) {
            return;
        }
        await ctx.db.patch(args.chatId, { tags: [...chat.tags, args.tag] });
        await ctx.runMutation(internal.elf.attachTag, {
            userId,
            spaceId: chat.spaceId,
            title: args.tag,
        });
    },
});

export const delChatTag = mutation({
    args: {
        chatId: v.id("chats"),
        tag: v.string(),
    },

    handler: async (ctx, args) => {
        if (!args.tag.length) {
            throw new Error("No changes");
        }
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const chat = await ctx.db.get(args.chatId);
        if (!chat || chat.userId !== userId) {
            throw new Error("Space not found");
        }
        if (!chat.tags.includes(args.tag)) {
            return;
        }
        await ctx.db.patch(args.chatId, { tags: chat.tags.filter(t => t != args.tag) });
        await ctx.runMutation(internal.elf.detachTag, {
            userId,
            title: args.tag,
        });
    },
});

export const attachTag = internalMutation({
    args: {
        title: v.string(),
        userId: v.id("users"),
        spaceId: v.id("spaces"),
    },

    handler: async (ctx, args) => {
        const tagDoc = await ctx.db.query("tags")
            .withIndex('by_user', q => q.eq("userId", args.userId))
            .filter(q => q.eq(q.field("title"), args.title))
            .first();
        if (tagDoc) {
            await ctx.db.patch(tagDoc._id, {
                chatNum: (tagDoc.chatNum ?? 0) + 1,
            });
        } else {
            await ctx.db.insert('tags', {
                userId: args.userId,
                spaceId: args.spaceId,
                title: args.title,
                chatNum: 1,
            });
        }
    },
});

export const detachTag = internalMutation({
    args: {
        userId: v.id("users"),
        title: v.string(),
    },

    handler: async (ctx, args) => {
        const tagDoc = await ctx.db.query("tags")
            .withIndex('by_user', q => q.eq("userId", args.userId))
            .filter(q => q.eq(q.field("title"), args.title))
            .first();
        if (!tagDoc?.chatNum) {
            return;
        }
        if (tagDoc.chatNum > 1) {
            await ctx.db.patch(tagDoc._id, {
                chatNum: tagDoc.chatNum - 1,
            });
        } else {
            await ctx.db.delete(tagDoc._id);
        }
    },
});
