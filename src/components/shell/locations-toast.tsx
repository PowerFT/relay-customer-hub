"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "OAuth state cookie missing — please try connecting again.",
  state_expired: "Connection request expired. Click Connect HighLevel again.",
  state_bad_signature: "OAuth state signature mismatch.",
  state_malformed: "OAuth state was malformed.",
  missing_params: "HighLevel didn't return an authorization code.",
  token_exchange_failed: "HighLevel rejected the token exchange.",
  server_misconfigured: "Server is missing OAuth credentials.",
};

export function LocationsToast() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const connected = params.get("connected");
  const error = params.get("error");

  useEffect(() => {
    if (connected) {
      toast.success("Location connected successfully");
    } else if (error) {
      toast.error(ERROR_MESSAGES[error] ?? `Connection failed: ${error}`);
    }
    if (connected || error) {
      router.replace(pathname, { scroll: false });
    }
  }, [connected, error, pathname, router]);

  return null;
}
