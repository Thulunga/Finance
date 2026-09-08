import { DashboardShell } from "@/components/DashboardShell";
import { FinancialAnalytics } from "@/components/FinancialAnalytics";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <DashboardShell>
      <div className="space-y-4 sm:space-y-6">
        <PageHeader title="Analytics" description="Category pressure, allocation mix, and monthly trends." />
        <FinancialAnalytics />
      </div>
    </DashboardShell>
  );
}
