import { v } from "convex/values";
import { query } from "./_generated/server";

export const getByUserId = query({
  args: {
    userId: v.string(),
    status: v.optional(v.string()),
    vendorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("bills")
      .filter((q) => q.eq(q.field("userId"), args.userId));

    const bills = await q.collect();
    
    // Filter by status if provided
    let filteredBills = bills;
    if (args.status && args.status !== "all") {
      filteredBills = bills.filter(bill => {
        if (args.status === "paid") return bill.balance === 0;
        if (args.status === "unpaid") return bill.balance > 0;
        if (args.status === "overdue") {
          const dueDate = new Date(bill.dueDate);
          return dueDate < new Date() && bill.balance > 0;
        }
        return true;
      });
    }
    
    // Filter by vendor if provided
    if (args.vendorId) {
      filteredBills = filteredBills.filter(bill => bill.vendorId === args.vendorId);
    }
    
    return filteredBills;
  },
});