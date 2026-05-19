/**
 * Shared scope helper for conversation/location authorization.
 *
 * Returns the Drizzle WHERE clause that says "the current user owns this
 * location" — with a fallback for demo-seeded locations (created_by IS
 * NULL). Seeded fixtures intentionally have a null owner so every Clerk
 * account sees the same demo data without per-user re-seeding.
 *
 * Drop the `isNull` branch when the demo data is retired.
 */

import { eq, isNull, or, type SQL } from "drizzle-orm";

import { schema } from "@/db";

export function locationOwnedByOrDemo(userId: string): SQL {
  return or(
    eq(schema.locations.createdBy, userId),
    isNull(schema.locations.createdBy),
  )!;
}
