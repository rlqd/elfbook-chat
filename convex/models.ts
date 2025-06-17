import { v } from "convex/values";
import { query, internalMutation, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { ModelProvider } from "./schema";
import { internal } from "./_generated/api";

export const listModels = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("models")
            .collect();
    },
});

export const saveModels = internalMutation({
  args: {
    models: v.array(v.any()),
    provider: v.string(),
    idField: v.string(),
  },
  handler: async (ctx, args) => {
    const models = await ctx.db
        .query("models")
        .filter(q => q.eq(q.field("provider"), args.provider))
        .collect();
    const idMap = new Map<string,Id<"models">>();
    models.forEach(m => idMap.set(m.id, m._id));
    for (const model of args.models) {
        const externalId = model[args.idField];
        const recordId = idMap.get(externalId);
        if (recordId) {
            await ctx.db.patch(recordId, { details: model });
        } else {
            await ctx.db.insert('models', {
                id: externalId,
                provider: args.provider as ModelProvider,
                details: model,
            });
        }
    }
  },
});

export const syncOpenRouterModels = internalAction({
  handler: async (ctx) => {
    const resp = await fetch('https://openrouter.ai/api/v1/models');
    const obj = await resp.json();
    if (!('data' in obj)) {
        throw new Error('Data is missing in models api response:\n' + JSON.stringify(obj));
    }
    await ctx.runMutation(internal.models.saveModels, {
        provider: 'openrouter',
        models: obj.data,
        idField: 'id',
    });
  },
});
