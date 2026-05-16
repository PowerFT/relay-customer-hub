"use client";

import { ErrorState } from "@/components/shell/error-state";

export default function SettingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} segment="settings" />;
}
