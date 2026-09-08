import { redirect } from "next/navigation";

import { DashboardProvider } from "@/components/DashboardProvider";
import { loadDashboardData } from "@/lib/dashboardData";

/** Loads the shared dashboard dataset and mounts the client context for a page. */
export async function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const data = await loadDashboardData();

  if (!data) {
    redirect("/login");
  }

  return <DashboardProvider {...data}>{children}</DashboardProvider>;
}
