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
        await ctx.db.patch(args.spaceId, {
            title: args.title,
            order: args.order,
        });
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
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
        return spaces.sort((a, b) => a.order - b.order);
    },
});
