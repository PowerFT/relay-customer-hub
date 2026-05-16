import { headers } from "next/headers";
import { Webhook } from "svix";

import { db, schema } from "@/db";
import { deriveInitials, pickTone } from "@/lib/auth";

export const runtime = "nodejs";

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses?: { email_address: string; id: string }[];
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
  };
};

function primaryEmail(data: ClerkUserEvent["data"]): string | null {
  const list = data.email_addresses ?? [];
  if (list.length === 0) return null;
  const primary = list.find((e) => e.id === data.primary_email_address_id);
  return (primary ?? list[0]).email_address;
}

function fullName(data: ClerkUserEvent["data"]): string | null {
  const first = (data.first_name ?? "").trim();
  const last = (data.last_name ?? "").trim();
  const joined = [first, last].filter(Boolean).join(" ");
  return joined || null;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "CLERK_WEBHOOK_SECRET not set" }, { status: 500 });
  }

  const hdrs = await headers();
  const svixId = hdrs.get("svix-id");
  const svixTimestamp = hdrs.get("svix-timestamp");
  const svixSignature = hdrs.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "missing svix headers" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: ClerkUserEvent;
  try {
    event = new Webhook(secret).verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    console.warn("clerk webhook signature failed", err);
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const name = fullName(event.data);
    await db
      .insert(schema.users)
      .values({
        clerkId: event.data.id,
        email: primaryEmail(event.data),
        name,
        initials: deriveInitials(name),
        tone: pickTone(event.data.id),
      })
      .onConflictDoUpdate({
        target: schema.users.clerkId,
        set: {
          email: primaryEmail(event.data),
          name,
          initials: deriveInitials(name),
        },
      });
  }

  // user.deleted: ignore for MVP — keep historical assignee references intact.

  return Response.json({ ok: true });
}
