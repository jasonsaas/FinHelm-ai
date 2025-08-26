import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  accounts: defineTable({
    name: v.string(),
    balance: v.number(),
    type: v.string(),
    lastSync: v.string(),
  }),
  
  messages: defineTable({
    content: v.string(),
    userId: v.string(),
    timestamp: v.string(),
  }),
});