# Convex Database Files Explained

This folder contains the backend logic for **Convex**, the serverless database used by this application. If you've never used Convex before, this guide explains why these files exist and what they do.

---

## What is Convex?

Convex is a **serverless backend-as-a-service** that combines:
- A real-time database
- Serverless functions (no server to manage)
- Built-in file storage

Unlike traditional databases (PostgreSQL, MongoDB), you don't write raw SQL or set up a database server. Instead, you define your data structure and operations in **TypeScript files**, and Convex handles the rest.

---

## Why Are These Files Needed?

When you run `npx convex deploy`, Convex reads these TypeScript files and:
1. Creates/updates database tables based on `schema.ts`
2. Deploys your functions from `dives.ts` and `files.ts` as serverless endpoints
3. Makes everything accessible via the Convex API

Your FastAPI backend then calls these Convex endpoints over HTTP.

---

## File Breakdown

### `schema.ts` — The Data Structure

**Purpose:** Defines the shape of your database tables (like a SQL `CREATE TABLE` statement).

```typescript
dives: defineTable({
  user_id: v.string(),
  dive_number: v.number(),
  photo_storage_id: v.string(),
  // ...
})
```

**Why it's needed:**
- Convex is **strongly typed** — every field must be declared with its type
- Provides validation: Convex rejects data that doesn't match the schema
- Enables autocompletion and type checking in your IDE
- Indexes (like `by_dive_number`) speed up queries

**Key fields in our schema:**
| Field | Type | Purpose |
|-------|------|---------|
| `user_id` | string | Identifies who owns the dive |
| `dive_number` | number | Unique dive number per user |
| `photo_storage_id` | string | Links to uploaded photo in Convex storage |
| `logged_at` / `updated_at` | number | Timestamps (managed by the mutation) |

---

### `dives.ts` — Database Operations

**Purpose:** Defines **mutations** (write operations) and **queries** (read operations) for the `dives` table.

Think of this as your "database API" — these are the only ways to interact with the `dives` table.

#### `upsertDive` (mutation)
```typescript
export const upsertDive = mutation({
  args: { ... },        // Input validation
  handler: async (ctx, args) => {
    // Insert or update logic
  }
});
```
- **Upsert** = "update if exists, insert if not"
- Uses the index `by_dive_number` to check if a dive already exists
- Automatically sets `logged_at` on insert and `updated_at` on every save

#### `getDiveById` (query)
```typescript
export const getDiveById = query({
  args: { id: v.id("dives") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});
```
- Retrieves a single dive by its Convex document ID
- `v.id("dives")` ensures the ID is valid for the `dives` table

**Why mutations/queries are separate from schema:**
- Schema defines *what* data looks like
- Mutations/queries define *how* you interact with it
- This separation allows business logic (timestamps, validation) in one place

---

### `files.ts` — File Storage

**Purpose:** Handles photo uploads using Convex's built-in file storage.

```typescript
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

**How file uploads work:**

1. **Client calls `generateUploadUrl`** → Gets a secure, temporary upload URL
2. **Client uploads file directly to that URL** → File goes straight to Convex storage
3. **Convex returns a `storageId`** → A permanent reference to the file
4. **Store `storageId` in your database** → Link the file to a dive record

**Why this approach?**
- Files don't pass through your backend (faster, no server memory limits)
- Convex handles storage, CDN, and serving files
- Storage IDs are stable — the file URL may change, but the ID never does

---

## How It All Connects

```
┌─────────────────┐     HTTP      ┌─────────────────┐
│  FastAPI        │ ────────────► │  Convex Cloud   │
│  (Python)       │               │                 │
└─────────────────┘               │  ┌───────────┐  │
                                  │  │ schema.ts │  │ ← Defines tables
                                  │  └───────────┘  │
                                  │  ┌───────────┐  │
                                  │  │ dives.ts  │  │ ← CRUD operations
                                  │  └───────────┘  │
                                  │  ┌───────────┐  │
                                  │  │ files.ts  │  │ ← File uploads
                                  │  └───────────┘  │
                                  └─────────────────┘
```

**Example flow for logging a dive with a photo:**

1. FastAPI calls `files.generateUploadUrl` → gets upload URL
2. Photo is uploaded to that URL → returns `storageId`
3. FastAPI calls `dives.upsertDive` with dive data + `photo_storage_id`
4. Convex validates against `schema.ts` and saves to database

---

## The `_generated/` Folder

You'll notice a `_generated/` subfolder — **don't edit these files**. They're auto-generated by Convex and provide:
- TypeScript types for your schema
- Type-safe function references
- API client helpers

These regenerate automatically when you run `npx convex dev` or `npx convex deploy`.

---

## Common Commands

```bash
# Start local development (watches for changes)
npx convex dev

# Deploy to production
npx convex deploy

# Open the Convex dashboard
npx convex dashboard
```

---

## Learn More

- [Convex Documentation](https://docs.convex.dev)
- [Schema Reference](https://docs.convex.dev/database/schemas)
- [Mutations & Queries](https://docs.convex.dev/functions)
- [File Storage](https://docs.convex.dev/file-storage)
