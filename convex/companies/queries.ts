import { v } from "convex/values";
import { query } from "../_generated/server";

export const getByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    return company;
  },
});