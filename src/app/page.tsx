import { redirect } from "next/navigation";

/**
 * Root entry point. Once the Clerk middleware is in place (Row 5+), an
 * unauthenticated visitor hitting `/` will be 307'd to `/dashboard` and then
 * to `/sign-in` by the middleware. Authenticated users skip straight through.
 *
 * Server component — no client JS shipped for the redirect.
 */
export default function RootRedirect() {
  redirect("/dashboard");
}
