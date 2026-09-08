import { redirect } from "next/navigation";

import { AnalyticsTopBar } from "@/components/AnalyticsTopBar";
import { DashboardProvider } from "@/components/DashboardProvider";
import { FinancialAnalytics } from "@/components/FinancialAnalytics";
import { loadDashboardData } from "@/lib/dashboardData";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await loadDashboardData();

  if (!data) {
    redirect("/login");
  }

  return (
    <DashboardProvider {...data}>
      <div className="space-y-4 sm:space-y-6">
        <AnalyticsTopBar />
        <FinancialAnalytics />
      </div>
    </DashboardProvider>
  );
}
