import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Dive Log Schema
 * Defines the data structure for the dive logging application
 */
export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    certification: v.optional(v.string()),
    totalDives: v.number(),
    maxDepth: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_email', ['email']),

  dives: defineTable({
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
    loggedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId']),

  buddies: defineTable({
    userId: v.string(),
    buddyId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    totalDives: v.number(),
    addedAt: v.number(),
  })
    .index('by_userId', ['userId']),

  diveSpots: defineTable({
    userId: v.string(),
    name: v.string(),
    location: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    description: v.optional(v.string()),
    maxDepth: v.optional(v.number()),
    difficulty: v.string(),
    creatures: v.array(v.string()),
    rating: v.optional(v.number()),
    visits: v.number(),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId']),
});
