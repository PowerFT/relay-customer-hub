import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentUser();
  if (!dbUser) redirect("/sign-in");

  const clerk = await currentUser();
  const shellUser = {
    name: dbUser.name ?? "Agent",
    role: dbUser.role === "admin" ? "Admin" : "Support Agent",
    initials: dbUser.initials ?? "??",
    imageUrl: clerk?.imageUrl ?? null,
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar user={shellUser} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={shellUser} />
        <div className="flex-1 min-w-0 min-h-0">{children}</div>
      </div>
    </div>
  );
}
