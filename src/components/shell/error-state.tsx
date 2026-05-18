"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

const REPORT_EMAIL = "support@example.com";

export function ErrorState({
  error,
  reset,
  segment,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  segment: string;
}) {
  useEffect(() => {
    console.error(`[${segment}] error.tsx caught`, error);
  }, [error, segment]);

  const subject = encodeURIComponent(`Bug report — ${segment}`);
  const bodyLines = [
    `Where: ${segment}`,
    error.digest ? `Digest: ${error.digest}` : null,
    `Message: ${error.message}`,
  ].filter(Boolean) as string[];
  const body = encodeURIComponent(bodyLines.join("\n"));
  const mailto = `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-danger/10 text-danger flex items-center justify-center">
        <AlertTriangle size={26} />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
      <p className="text-sm text-text-secondary max-w-md">
        {error.message || "The page failed to load. Try again — if it keeps happening, send us a bug report."}
      </p>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={reset}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover"
        >
          Try again
        </button>
        <a
          href={mailto}
          className="px-3 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-canvas"
        >
          Report issue
        </a>
      </div>
    </div>
  );
}
