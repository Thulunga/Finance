import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, ChevronRight } from "lucide-react";

import { BudgetHealthCards } from "@/components/BudgetHealthCards";
import { CashFlowManager } from "@/components/CashFlowManager";
import { AssetBalances } from "@/components/AssetBalances";
import { DashboardProvider } from "@/components/DashboardProvider";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { RecentTransactions } from "@/components/RecentTransactions";
import { SectionVisibilityToggle } from "@/components/SectionVisibilityToggle";
import { loadDashboardData } from "@/lib/dashboardData";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await loadDashboardData();

  if (!data) {
    redirect("/login");
  }

  return (
    <DashboardProvider {...data}>
      <div className="space-y-4 sm:space-y-6">
        <DashboardTopBar />

        <section aria-labelledby="cash-flow-heading" className="space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3 px-1">
            <div className="min-w-0"><h2 id="cash-flow-heading" className="text-lg font-semibold tracking-tight">Cash overview</h2><p className="text-sm text-muted-foreground">See what came in, what was used, and what remains liquid.</p></div>
            <SectionVisibilityToggle label="cash overview" section="cash-flow" />
          </div>
          <CashFlowManager />
        </section>

        <section aria-labelledby="assets-heading" className="space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3 px-1">
            <div className="min-w-0"><h2 id="assets-heading" className="text-lg font-semibold tracking-tight">Assets</h2><p className="text-sm text-muted-foreground">Track your EPF balance and fixed deposits outside daily cash flow.</p></div>
            <SectionVisibilityToggle label="assets" section="assets" />
          </div>
          <AssetBalances />
        </section>

        <section aria-labelledby="budget-heading" className="space-y-3 sm:space-y-4">
          <div className="px-1">
            <h2 id="budget-heading" className="text-lg font-semibold tracking-tight">
              Budget overview
            </h2>
            <p className="text-sm text-muted-foreground">
              Track category limits and spending progress for the selected month.
            </p>
          </div>
          <BudgetHealthCards />
        </section>

        <Link
          href="/analytics"
          className="flex items-center gap-3 rounded-xl border bg-card/70 p-4 shadow-sm transition-colors hover:bg-muted/40 sm:p-5"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-tight">Analytics</p>
            <p className="text-sm text-muted-foreground">Category pressure, allocation mix, and monthly trends.</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>

        <section aria-labelledby="activity-heading" className="space-y-3 sm:space-y-4">
          <div className="px-1">
            <h2 id="activity-heading" className="text-lg font-semibold tracking-tight">
              Activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Review the transactions recorded for this month.
            </p>
          </div>
          <RecentTransactions />
        </section>
      </div>
    </DashboardProvider>
  );
}
