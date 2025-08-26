import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * User Management Actions for FinHelm.ai
 */

/**
 * Create a new user with validation
 */
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"), v.literal("viewer"))),
    profileImage: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    organizationRole: v.optional(v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role || "user",
      profileImage: args.profileImage,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // If organization specified, create user-organization relationship
    if (args.organizationId) {
      await ctx.db.insert("userOrganizations", {
        userId,
        organizationId: args.organizationId,
        role: args.organizationRole || "member",
        permissions: ["read", "write"],
        joinedAt: now,
        isActive: true,
      });
    }

    console.log(`User created: ${args.email} with ID: ${userId}`);
    return userId;
  },
});

/**
 * Get user profile with organization information
 */
export const getUserProfile = query({
  args: { 
    userId: v.optional(v.id("users")),
    email: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    if (!args.userId && !args.email) {
      throw new Error("Either userId or email must be provided");
    }

    let user;
    if (args.userId) {
      user = await ctx.db.get(args.userId);
    } else {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .first();
    }

    if (!user) {
      return null;
    }

    // Get user organizations
    const userOrgs = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const organizations = await Promise.all(
      userOrgs.map(async (userOrg) => {
        const org = await ctx.db.get(userOrg.organizationId);
        return {
          ...org,
          userRole: userOrg.role,
          permissions: userOrg.permissions,
          joinedAt: userOrg.joinedAt,
        };
      })
    );

    return {
      ...user,
      organizations,
    };
  },
});

/**
 * Update user profile
 */
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    preferences: v.optional(v.object({
      timezone: v.string(),
      language: v.string(),
      notifications: v.object({
        email: v.boolean(),
        sms: v.boolean(),
        inApp: v.boolean(),
      }),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updateData.name = args.name;
    if (args.profileImage !== undefined) updateData.profileImage = args.profileImage;
    if (args.preferences !== undefined) updateData.preferences = args.preferences;

    await ctx.db.patch(args.userId, updateData);
    console.log(`User profile updated: ${args.userId}`);
    return true;
  },
});

/**
 * Update user last login timestamp
 */
export const recordUserLogin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.userId, {
      lastLoginAt: now,
      updatedAt: now,
    });
    
    return true;
  },
});

/**
 * Deactivate user (soft delete)
 */
export const deactivateUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Deactivate user
    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Deactivate user-organization relationships
    const userOrgs = await ctx.db
      .query("userOrganizations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    await Promise.all(
      userOrgs.map((userOrg) =>
        ctx.db.patch(userOrg._id, { isActive: false })
      )
    );

    console.log(`User deactivated: ${args.userId}`);
    return true;
  },
});