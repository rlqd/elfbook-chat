import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const messageTypes = [
  "outgoing",
  "loading",
  "reasoning",
  "streaming",
  "incomplete",
  "complete",
] as const;
export type MessageType = typeof messageTypes[number];

const elfTables = {
  spaces: defineTable({
    userId: v.id("users"),
    title: v.string(),
    order: v.float64(),
  }).index("by_user", ["userId"]),

  categories: defineTable({
    userId: v.id("users"),
    spaceId: v.id("spaces"),
    title: v.string(),
    order: v.float64(),
  }).index("by_user", ["userId"]),

  chats: defineTable({
    userId: v.id("users"),
    catId: v.id("categories"),
    title: v.string(),
    created: v.int64(),
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
