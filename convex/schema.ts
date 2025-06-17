import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const messageTypes = [
  "outgoing",
  "loading",
  "reasoning",
  "streaming",
  "incomplete",
  "complete",
] as const;
export type MessageType = typeof messageTypes[number];

export const modelProviders = [
  "openrouter",
] as const;
export type ModelProvider = typeof modelProviders[number];

const elfTables = {
  models: defineTable({
    provider: v.union(...modelProviders.map(p => v.literal(p))),
    id: v.string(),
    details: v.any(),
  }),

  keys: defineTable({
    userId: v.id("users"),
    provider: v.union(...modelProviders.map(p => v.literal(p))),
    value: v.string(),
  }).index("by_user", ["userId"]),

  spaces: defineTable({
    userId: v.id("users"),
    title: v.string(),
    order: v.float64(),
    // todo: colours
  }).index("by_user", ["userId"]),

  tags: defineTable({
    userId: v.id("users"),
    spaceId: v.id("spaces"),
    title: v.string(),
  }).index("by_user", ["userId"]),

  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    created: v.int64(),
    tags: v.array(v.string()),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    userId: v.id("users"),
    chatId: v.id("chats"),
    type: v.union(...messageTypes.map(t => v.literal(t))),
    body: v.string(),
    streamId: v.optional(v.string()),
    created: v.int64(),
    replyMsgId: v.optional(v.id("messages")),
    replaceMsgId: v.optional(v.id("messages")),
  }).index("by_user", ["userId"])
    .index("by_chat", ["chatId"]),

  snippets: defineTable({
    userId: v.id("users"),
    chatId: v.id("chats"),
    msgId: v.id("messages"),
    highlight: v.optional(v.object({
      index: v.number(),
      length: v.number(),
    })),
    title: v.string(),
    created: v.int64(),
  }).index("by_user", ["userId"])
    .index("by_chat", ["chatId"]),
};

export default defineSchema({
  ...authTables,
  ...elfTables,
});
