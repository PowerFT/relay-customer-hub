import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import type { User } from "@/db/schema";

/** Avatar tone rotation — 6 brand-friendly hues for user chips/avatars. */
export const USER_TONES = [
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
  "fuchsia",
] as const;
export type UserTone = (typeof USER_TONES)[number];

/** Stable hash so a given Clerk user always lands on the same tone. */
export function pickTone(seed: string): UserTone {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return USER_TONES[h % USER_TONES.length];
}

/** "Sam Sneed" → "SS"; "Sam" → "SA"; null/empty → "??" */
export function deriveInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns the row from our `users` table for the currently-signed-in Clerk
 * session, lazily upserting if the Clerk webhook hasn't yet synced.
 *
 * Returns null only when there's no Clerk session at all (anonymous).
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.clerkId, userId),
  });
  if (existing) return existing;

  // Lazy create on first sign-in if the webhook is delayed or missed.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;

  const [row] = await db
    .insert(schema.users)
    .values({
      clerkId: userId,
      email,
      name,
      initials: deriveInitials(name),
      tone: pickTone(userId),
    })
    .onConflictDoUpdate({
      target: schema.users.clerkId,
      set: { email, name },
    })
    .returning();

  return row ?? null;
}

/** Throws if no session — use in server actions / route handlers that require auth. */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
