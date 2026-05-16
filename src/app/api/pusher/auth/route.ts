import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/db";
import { requireCurrentUser } from "@/lib/auth";
import { authorizeChannel } from "@/lib/pusher/server";

export const runtime = "nodejs";

/**
 * Pusher private-channel auth.
 *
 * The browser POSTs socket_id + channel_name here (form-encoded by
 * pusher-js). We verify the current user has access to whatever the
 * channel references, then return Pusher's authorization payload.
 *
 * Channel naming convention (MVP):
 *   - `private-location-{locationId}`     — anyone who created the location
 *   - `private-conversation-{convId}`     — anyone with access to the parent location
 *
 * Reject everything else; we don't expose presence channels yet.
 */

export async function POST(req: Request) {
  const user = await requireCurrentUser();

  const formData = await req.formData();
  const socketId = formData.get("socket_id");
  const channelName = formData.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "missing socket_id or channel_name" }, { status: 400 });
  }

  const locationMatch = channelName.match(/^private-location-(.+)$/);
  const conversationMatch = channelName.match(/^private-conversation-(.+)$/);

  if (locationMatch) {
    const locationId = locationMatch[1];
    const loc = await db.query.locations.findFirst({
      where: and(
        eq(schema.locations.id, locationId),
        eq(schema.locations.createdBy, user.id),
      ),
    });
    if (!loc) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.json(authorizeChannel(socketId, channelName));
  }

  if (conversationMatch) {
    const conversationId = conversationMatch[1];
    const conv = await db.query.conversations.findFirst({
      where: eq(schema.conversations.id, conversationId),
      with: { /* location join — we go through the locations table below */ },
    });
    if (!conv) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    // Reuse the location ownership check.
    const owner = await db.query.locations.findFirst({
      where: and(
        eq(schema.locations.id, conv.locationId),
        eq(schema.locations.createdBy, user.id),
      ),
    });
    if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.json(authorizeChannel(socketId, channelName));
  }

  return NextResponse.json({ error: "unsupported channel" }, { status: 403 });
}
