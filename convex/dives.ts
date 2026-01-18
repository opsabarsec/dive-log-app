import { mutation, query } from 'convex/server';
import { v } from 'convex/values';

/**
 * Get all dives for a user
 */
export const getDives = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('dives')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

/**
 * Create a new dive log
 */
export const createDive = mutation({
  args: {
    userId: v.string(),
    location: v.string(),
    diveDate: v.number(),
    duration: v.number(),
    maxDepth: v.number(),
    avgDepth: v.number(),
    waterType: v.string(),
    notes: v.optional(v.string()),
    buddyIds: v.array(v.string()),
    equipment: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('dives', {
      userId: args.userId,
      location: args.location,
      diveDate: args.diveDate,
      duration: args.duration,
      maxDepth: args.maxDepth,
      avgDepth: args.avgDepth,
      waterType: args.waterType,
      notes: args.notes,
      buddyIds: args.buddyIds,
      equipment: args.equipment,
      loggedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update a dive log
 */
export const updateDive = mutation({
  args: {
    diveId: v.id('dives'),
    updates: v.object({
      notes: v.optional(v.string()),
      buddyIds: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.diveId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a dive log
 */
export const deleteDive = mutation({
  args: { diveId: v.id('dives') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.diveId);
  },
});

/**
 * Get dive statistics for a user
 */
export const getDiveStats = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const dives = await ctx.db
      .query('dives')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    if (dives.length === 0) {
      return {
        totalDives: 0,
        maxDepth: 0,
        avgDepth: 0,
        totalTime: 0,
      };
    }

    const maxDepth = Math.max(...dives.map((d) => d.maxDepth));
    const avgDepth = dives.reduce((sum, d) => sum + d.avgDepth, 0) / dives.length;
    const totalTime = dives.reduce((sum, d) => sum + d.duration, 0);

    return {
      totalDives: dives.length,
      maxDepth,
      avgDepth,
      totalTime,
    };
  },
});
