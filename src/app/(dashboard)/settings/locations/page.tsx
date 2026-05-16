import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Plug } from "lucide-react";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { DisconnectButton } from "@/components/shell/disconnect-button";
import { LocationsToast } from "@/components/shell/locations-toast";
import { requireCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  const country = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : "";
  const area = digits.length >= 10 ? `(${digits.slice(-10, -7)}) ` : "";
  return `${country}${area}••• ${last4}`;
}

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  token_expired: "Token expired",
  disconnected: "Disconnected",
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const tone =
    status === "connected"
      ? "bg-success/10 text-success"
      : status === "token_expired"
        ? "bg-warning/15 text-warning"
        : "bg-danger/10 text-danger";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
        tone,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "connected" && "bg-success",
          status === "token_expired" && "bg-warning",
          status === "disconnected" && "bg-danger",
        )}
      />
      {label}
    </span>
  );
}

export default async function LocationsPage() {
  const user = await requireCurrentUser();
  const rows = await db
    .select()
    .from(schema.locations)
    .where(eq(schema.locations.createdBy, user.id));

  const activeCount = rows.filter((r) => r.status === "connected").length;
  const remaining = Math.max(0, 3 - activeCount);

  return (
    <main className="p-6 max-w-5xl">
      <LocationsToast />

      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HighLevel locations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Each connected sub-account brings in one WhatsApp number. MVP needs 3.
          </p>
        </div>
        {rows.length > 0 && (
          <Link
            href="/api/oauth/connect"
            className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg px-2.5 h-8 text-sm font-medium"
          >
            Connect another
          </Link>
        )}
      </header>

      {remaining > 0 && rows.length > 0 && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-warning/10 border border-warning/30 text-sm text-warning-foreground flex items-center gap-2">
          <Plug size={16} className="text-warning" />
          <span className="text-text-primary">
            Connect <strong>{remaining}</strong> more {remaining === 1 ? "location" : "locations"} to complete MVP setup.
          </span>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3">
          {rows.map((loc) => (
            <Card key={loc.id} className="p-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-text-primary truncate">
                    {loc.name ?? "Unnamed location"}
                  </h3>
                  <StatusBadge status={loc.status} />
                </div>
                <p className="text-sm text-text-secondary font-mono">
                  {maskPhone(loc.whatsappNumber)}
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  Connected{" "}
                  {loc.connectedAt
                    ? formatDistanceToNow(loc.connectedAt, { addSuffix: true })
                    : "—"}
                </p>
              </div>
              <DisconnectButton locationId={loc.id} locationName={loc.name} />
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <Card className="p-10 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-4">
        <Plug size={28} />
      </div>
      <h2 className="text-lg font-semibold">No locations connected yet</h2>
      <p className="text-sm text-text-secondary max-w-md mt-1">
        Connect at least 3 HighLevel sub-accounts to start receiving WhatsApp messages.
      </p>
      <Link
        href="/api/oauth/connect"
        className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg px-4 h-9 mt-5 text-sm font-medium"
      >
        Connect HighLevel
      </Link>
    </Card>
  );
}
