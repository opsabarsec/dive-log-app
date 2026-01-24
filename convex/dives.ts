import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Generate a URL for uploading dive photos
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

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
    diveNumber: v.optional(v.number()),
    diveDate: v.number(),
    location: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    site: v.optional(v.string()),
    duration: v.number(),
    maxDepth: v.number(),
    temperature: v.optional(v.number()),
    waterType: v.string(),
    visibility: v.optional(v.number()),
    weather: v.optional(v.string()),
    suitThickness: v.optional(v.number()),
    leadWeights: v.optional(v.number()),
    clubName: v.optional(v.string()),
    clubWebsite: v.optional(v.string()),
    instructorName: v.optional(v.string()),
    notes: v.optional(v.string()),
    photoStorageId: v.optional(v.id('_storage')),
    buddyIds: v.array(v.string()),
    equipment: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('dives', {
      userId: args.userId,
      diveNumber: args.diveNumber,
      diveDate: args.diveDate,
      location: args.location,
      latitude: args.latitude,
      longitude: args.longitude,
      site: args.site,
      duration: args.duration,
      maxDepth: args.maxDepth,
      temperature: args.temperature,
      waterType: args.waterType,
      visibility: args.visibility,
      weather: args.weather,
      suitThickness: args.suitThickness,
      leadWeights: args.leadWeights,
      clubName: args.clubName,
      clubWebsite: args.clubWebsite,
      instructorName: args.instructorName,
      notes: args.notes,
      photoStorageId: args.photoStorageId,
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
      diveNumber: v.optional(v.number()),
      diveDate: v.optional(v.number()),
      location: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      site: v.optional(v.string()),
      duration: v.optional(v.number()),
      maxDepth: v.optional(v.number()),
      temperature: v.optional(v.number()),
      waterType: v.optional(v.string()),
      visibility: v.optional(v.number()),
      weather: v.optional(v.string()),
      suitThickness: v.optional(v.number()),
      leadWeights: v.optional(v.number()),
      clubName: v.optional(v.string()),
      clubWebsite: v.optional(v.string()),
      instructorName: v.optional(v.string()),
      notes: v.optional(v.string()),
      photoStorageId: v.optional(v.id('_storage')),
      buddyIds: v.optional(v.array(v.string())),
      equipment: v.optional(v.array(v.string())),
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
        totalTime: 0,
      };
    }

    const maxDepth = Math.max(...dives.map((d) => d.maxDepth));
    const totalTime = dives.reduce((sum, d) => sum + d.duration, 0);

    return {
      totalDives: dives.length,
      maxDepth,
      totalTime,
    };
  },
});

/**
 * Get unique club names and instructor names for autocomplete
 */
export const getAutocompleteData = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const dives = await ctx.db
      .query('dives')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    const clubNames = new Set<string>();
    const instructorNames = new Set<string>();
    const clubWebsites = new Map<string, string>();

    dives.forEach((dive) => {
      if (dive.clubName) {
        clubNames.add(dive.clubName);
        if (dive.clubWebsite) {
          clubWebsites.set(dive.clubName, dive.clubWebsite);
        }
      }
      if (dive.instructorName) {
        instructorNames.add(dive.instructorName);
      }
    });

    return {
      clubNames: Array.from(clubNames),
      instructorNames: Array.from(instructorNames),
      clubWebsites: Object.fromEntries(clubWebsites),
    };
  },
});

/**
 * Get the URL for a dive photo
 */
export const getDivePhotoUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
