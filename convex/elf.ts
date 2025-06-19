import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    },

    handler: async (ctx, args) => {
        if (typeof args.title === 'undefined' && typeof args.order === 'undefined') {
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

export const addKey = mutation({
    args: {
        title: v.string(),
        value: v.string(),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        return await ctx.db.insert("keys", {
            userId,
            provider: 'openrouter',
            ...args,
        });
    },
});

export const listKeys = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        return await ctx.db
            .query("keys")
            .withIndex("by_user", q => q.eq("userId", userId))
            .collect();
    },
});

export const getSettings = query({
    args: {
        spaceId: v.id("spaces"),
    },

    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        return await ctx.db
            .query("settings")
            .withIndex("by_user", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("spaceId"), args.spaceId))
            .first();
    },
});

export const editSettings = mutation({
    args: {
        spaceId: v.id("spaces"),
        selectedModel: v.optional(v.string()),
        selectedKey: v.optional(v.union(v.null(), v.id("keys"))),
    },

    handler: async (ctx, args) => {
        if (typeof args.selectedModel === 'undefined' && typeof args.selectedKey === 'undefined') {
            throw new Error("No changes");
        }
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }
        const settings = await ctx.db
            .query("settings")
            .withIndex("by_user", q => q.eq("userId", userId))
            .filter(q => q.eq(q.field("spaceId"), args.spaceId))
            .first();
        if (!settings) {
            const space = await ctx.db.get(args.spaceId);
            if (!space || space.userId !== userId) {
                throw new Error("Space not found");
            }
            await ctx.db.insert("settings", {
                userId,
                spaceId: args.spaceId,
                selectedModel: args.selectedModel,
                selectedKey: args.selectedKey,
            });
        } else {
            const updates: Partial<typeof args> = {};
            if (typeof args.selectedKey !== 'undefined') {
                updates.selectedKey = args.selectedKey;
            }
            if (typeof args.selectedModel !== 'undefined') {
                updates.selectedModel = args.selectedModel;
            }
            await ctx.db.patch(settings._id, updates);
        }
    },
});
