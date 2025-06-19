import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
