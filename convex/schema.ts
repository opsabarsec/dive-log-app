// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  dives: defineTable({
    user_id: v.string(),
    dive_number: v.optional(v.number()),
    dive_date: v.number(),
    location: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    site: v.optional(v.string()),
    duration: v.number(),
    max_depth: v.number(),
    temperature: v.optional(v.number()),
    water_type: v.string(),
    visibility: v.optional(v.number()),
    weather: v.optional(v.string()),
    suit_thickness: v.optional(v.number()),
    lead_weights: v.optional(v.number()),
    club_name: v.optional(v.string()),
    club_website: v.optional(v.string()),
    instructor_name: v.optional(v.string()),
    notes: v.optional(v.string()),
    photo_storage_id: v.optional(v.string()),
    buddy_ids: v.array(v.string()),
    equipment: v.array(v.string()),
    logged_at: v.number(),
    updated_at: v.number(),
  }).index("by_dive_number", ["user_id", "dive_number"]),
});

export default schema;
