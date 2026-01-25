// convex/dives.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertDive = mutation({
  args: {
    user_id: v.string(),
    dive_number: v.number(),
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
  },
  handler: async (ctx, args) => {
    const { user_id, dive_number } = args;
    const now = Date.now(); // ms since epoch

    const existing = await ctx.db
      .query("dives")
      .withIndex("by_dive_number", q =>
        q.eq("user_id", user_id).eq("dive_number", dive_number)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updated_at: now,
      });
      return { id: existing._id, action: "updated" };
    }

    const id = await ctx.db.insert("dives", {
      ...args,
      logged_at: now,
      updated_at: now,
    });
    return { id, action: "inserted" };
  },
});

export const getDiveById = query({
  args: { id: v.id("dives") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
