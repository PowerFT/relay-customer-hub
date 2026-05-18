"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DisconnectButton({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const disconnect = () => {
    startTransition(async () => {
      const res = await fetch(`/api/locations/${locationId}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.text();
        toast.error(`Disconnect failed: ${body || res.status}`);
        setConfirming(false);
        return;
      }
      toast.success(`${locationName ?? "Location"} disconnected`);
      setConfirming(false);
      router.refresh();
    });
  };

  if (confirming) {
    return (
      <div className="flex gap-2 items-center">
        <span className="text-xs text-text-secondary">Really disconnect?</span>
        <Button
          size="xs"
          variant="destructive"
          disabled={pending}
          onClick={disconnect}
        >
          {pending ? "Disconnecting…" : "Yes, disconnect"}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="xs"
      variant="outline"
      onClick={() => setConfirming(true)}
    >
      Disconnect
    </Button>
  );
}
