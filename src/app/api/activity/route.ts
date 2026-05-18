import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { requireCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/activity?limit=6&locationId=
 *
 * UNION of recent agent-relevant events ordered by createdAt desc.
 * Pulls from messages (new inbound) and the system-message rows that
 * Rows 18 (assignment) and 19 (resolve) write. We can't easily detect
 * 'escalations' yet — that signal lands when Row 24 wires the priority
 * change flow. For MVP we cover the three live signals.
 */

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 25;

type Row = {
  id: string;
  type: "inbound" | "resolved" | "assigned" | "system";
  title: string;
  subtitle: string | null;
  channel: string;
  conversationId: string;
  createdAt: string;
};

export async function GET(req: Request) {
  const user = await requireCurrentUser();
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );
  const locationId = url.searchParams.get("locationId");

  const locationFilter = locationId && locationId !== "all"
    ? sql`AND c.location_id = ${locationId}`
    : sql`AND c.location_id IN (SELECT id FROM locations WHERE created_by = ${user.id})`;

  // Single union with a top-level limit. Server-side ordering on
  // m.sent_at means we don't load every message.
  const raw = await db.execute(sql`
    WITH recent AS (
      SELECT
        m.id::text AS id,
        CASE
          WHEN m.direction = 'inbound' THEN 'inbound'
          WHEN m.direction = 'system' AND m.body ILIKE 'resolved by%' THEN 'resolved'
          WHEN m.direction = 'system' AND m.body ILIKE '% assigned this conversation to %' THEN 'assigned'
          WHEN m.direction = 'system' THEN 'system'
          ELSE NULL
        END AS type,
        c.id::text AS conversation_id,
        c.channel,
        ct.name AS contact_name,
        m.body AS body,
        COALESCE(m.sent_at, m.created_at) AS created_at
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN contacts ct ON ct.id = c.contact_id
      WHERE
        (m.direction = 'inbound' OR m.direction = 'system')
        ${locationFilter}
      ORDER BY COALESCE(m.sent_at, m.created_at) DESC
      LIMIT ${limit * 4}
    )
    SELECT * FROM recent WHERE type IS NOT NULL ORDER BY created_at DESC LIMIT ${limit}
  `);
  const rows =
    (raw as unknown as { rows?: unknown[] }).rows ??
    (raw as unknown as unknown[]);

  const data: Row[] = [];
  for (const r of rows) {
    const row = r as {
      id: string;
      type: Row["type"];
      conversation_id: string;
      channel: string;
      contact_name: string | null;
      body: string | null;
      created_at: string | Date;
    };
    const contact = row.contact_name ?? "Unknown";
    let title = "";
    let subtitle: string | null = null;
    if (row.type === "inbound") {
      title = `New ${humanChannel(row.channel)} from ${contact}`;
      subtitle = row.body;
    } else if (row.type === "resolved") {
      title = `${contact} resolved`;
      subtitle = row.body;
    } else if (row.type === "assigned") {
      title = row.body ?? "Assignment update";
      subtitle = contact;
    } else {
      title = row.body ?? "Update";
      subtitle = contact;
    }
    data.push({
      id: row.id,
      type: row.type,
      title,
      subtitle,
      channel: row.channel,
      conversationId: row.conversation_id,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
    });
  }

  return NextResponse.json({ items: data });
}

function humanChannel(c: string): string {
  switch (c) {
    case "whatsapp": return "WhatsApp";
    case "messenger": return "Messenger";
    case "instagram": return "Instagram";
    case "tiktok": return "TikTok";
    case "linkedin": return "LinkedIn";
    case "webchat": return "Webchat";
    case "email": return "Email";
    case "sms": return "SMS";
    default: return c;
  }
}
