import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getCurrentUser } from "@/lib/auth";
import { fetchStats } from "@/lib/dashboard/stats";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  // TEMP: hard-coded greeting name for demo. Revert to the line below
  // when the demo is over.
  //   const firstName = user?.name?.split(" ")[0] ?? "there";
  await getCurrentUser(); // still auth-gate
  const firstName = "Mike";
  const stats = await fetchStats({ range: "7d", locationId: "all" });

  return (
    <DashboardClient greeting={greeting()} firstName={firstName} stats={stats} />
  );
}
