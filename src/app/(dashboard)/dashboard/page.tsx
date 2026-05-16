import { getCurrentUser } from "@/lib/auth";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <main className="p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Here&apos;s the inbox snapshot. Stat cards and charts arrive in Row 20+.
        </p>
      </header>
    </main>
  );
}
