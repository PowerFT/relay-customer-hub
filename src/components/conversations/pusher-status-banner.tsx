"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { getPusherClient } from "@/lib/pusher/client";

/**
 * Pusher's connection state can flap on flaky networks. When disconnected
 * the channel rail/list will look stale because no realtime invalidations
 * fire — surface a sticky banner so the user knows.
 *
 * Reconnect countdown is approximate; pusher-js retries automatically.
 */
export function PusherStatusBanner() {
  const [state, setState] = useState<"connected" | "connecting" | "unavailable" | "failed" | "disconnected">("connected");
  const [retryIn, setRetryIn] = useState<number | null>(null);

  useEffect(() => {
    let client;
    try {
      client = getPusherClient();
    } catch {
      // Pusher env vars missing — render nothing.
      return;
    }
    const onState = ({ current }: { current: string }) => {
      setState(current as typeof state);
    };
    client.connection.bind("state_change", onState);
    // Initial sync deferred via setTimeout(0) so it doesn't fire as a
    // synchronous setState-in-effect (react-hooks/set-state-in-effect rule).
    const initialState = client.connection.state as typeof state;
    const initial = setTimeout(() => setState(initialState), 0);
    return () => {
      clearTimeout(initial);
      client?.connection.unbind("state_change", onState);
    };
  }, []);

  useEffect(() => {
    if (state === "connected" || state === "connecting") {
      // Defer setState so it doesn't fire synchronously inside the effect.
      const t = setTimeout(() => setRetryIn(null), 0);
      return () => clearTimeout(t);
    }
    let seconds = 5;
    const initial = setTimeout(() => setRetryIn(seconds), 0);
    const id = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        setRetryIn(null);
        clearInterval(id);
      } else {
        setRetryIn(seconds);
      }
    }, 1_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [state]);

  if (state === "connected") return null;

  const isConnecting = state === "connecting";

  return (
    <div className="sticky top-0 z-30 bg-warning/15 text-text-primary border-b border-warning/30 px-4 py-2 text-xs flex items-center gap-2">
      {isConnecting ? (
        <Wifi size={14} className="animate-pulse" />
      ) : (
        <WifiOff size={14} />
      )}
      <span className="font-medium">
        {isConnecting
          ? "Reconnecting to live updates…"
          : "Live updates unavailable"}
      </span>
      {retryIn != null && !isConnecting && (
        <span className="text-text-secondary">Retrying in {retryIn}s</span>
      )}
    </div>
  );
}
