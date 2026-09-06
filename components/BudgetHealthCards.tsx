"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, PiggyBank, TrendingDown, Wallet } from "lucide-react";

import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  calculateCategoryHealth,
  calculateOverallKPIs,
  type CategoryHealth,
  type HealthStatus,
} from "@/lib/budgetCalculations";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

const INDICATOR_CLASS: Record<HealthStatus, string> = {
  healthy: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
  warning: "[&_[data-slot=progress-indicator]]:bg-amber-500",
  critical: "[&_[data-slot=progress-indicator]]:bg-red-500",
  exceeded: "[&_[data-slot=progress-indicator]]:bg-red-600",
};

const PERCENTAGE_CLASS: Record<HealthStatus, string> = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  exceeded: "text-red-600 dark:text-red-400",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: "On track",
  warning: "Watch closely",
  critical: "Near limit",
  exceeded: "Over budget",
};

const STATUS_CLASS: Record<HealthStatus, string> = {
  healthy: "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-red-600/25 bg-red-500/10 text-red-700 dark:text-red-300",
  exceeded: "border-red-600/30 bg-red-600/15 text-red-700 dark:text-red-300",
};

function CategoryRow({
  health,
  showBalances,
}: Readonly<{ health: CategoryHealth; showBalances: boolean }>) {
  const displayMoney = (value: number) => (showBalances ? formatCurrency(value) : "••••••");

  return (
    <div className="grid gap-3 rounded-lg border bg-background/70 p-3 sm:grid-cols-[minmax(11rem,0.8fr)_minmax(12rem,1.5fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {health.status === "healthy" ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
          <p className="truncate text-sm font-semibold">{health.category}</p>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge variant="outline" className={cn("h-5", STATUS_CLASS[health.status])}>{STATUS_LABEL[health.status]}</Badge>
          {health.isUnbudgeted ? <Badge variant="outline" className="h-5">No allocation</Badge> : null}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Spent {displayMoney(health.spent)} of {displayMoney(health.allocated)}</span>
          <span className={cn("font-mono font-semibold tabular-nums", PERCENTAGE_CLASS[health.status])}>{health.percentage.toFixed(0)}%</span>
        </div>
        <Progress className={cn("h-2", INDICATOR_CLASS[health.status])} value={Math.min(health.percentage, 100)} />
      </div>

      <div className="text-left sm:min-w-28 sm:text-right">
        <p className={cn("font-mono text-sm font-semibold tabular-nums", health.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
          {health.remaining < 0 ? `${displayMoney(Math.abs(health.remaining))} over` : `${displayMoney(health.remaining)} left`}
        </p>
        <p className="text-xs text-muted-foreground">Remaining</p>
      </div>
    </div>
  );
}

export function BudgetHealthCards() {
  const { budgets, expenses, monthYear, sectionVisibility, toggleSectionVisibility } = useDashboard();
  const showBalances = sectionVisibility.budget;
  const displayMoney = (value: number) => (showBalances ? formatCurrency(value) : "••••••");

  const categoryHealth = useMemo(
    () => calculateCategoryHealth(budgets, expenses, monthYear),
    [budgets, expenses, monthYear]
  );
  const kpis = useMemo(
    () => calculateOverallKPIs(budgets, expenses, monthYear),
    [budgets, expenses, monthYear]
  );
  const statusCounts = useMemo(
    () => categoryHealth.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] ?? 0) + 1 }), {} as Partial<Record<HealthStatus, number>>),
    [categoryHealth]
  );

  let overallStatus: HealthStatus = "healthy";

  if (kpis.isOverBudget) {
    overallStatus = "exceeded";
  } else if (kpis.percentage >= 75) {
    overallStatus = "warning";
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Monthly Budget</CardTitle>
            <CardDescription>Allocated across all categories</CardDescription>
            <CardAction>
              <Wallet className="size-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
              {displayMoney(kpis.totalAllocated)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Net Spent</CardTitle>
            <CardDescription>Your share only, friends excluded</CardDescription>
            <CardAction>
              <TrendingDown
                className="size-5 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
              {displayMoney(kpis.totalSpent)}
            </p>
            <Progress
              className={INDICATOR_CLASS[overallStatus]}
              value={Math.min(kpis.percentage, 100)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Remaining Balance</CardTitle>
            <CardDescription>
              {kpis.isOverBudget ? "You are over budget" : "Available to spend"}
            </CardDescription>
            <CardAction>
              <PiggyBank
                className={cn(
                  "size-5",
                  kpis.isOverBudget
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
                aria-hidden="true"
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl",
                kpis.isOverBudget
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {displayMoney(kpis.totalRemaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><CardTitle>Category health</CardTitle><Badge variant="secondary">{categoryHealth.length} categories</Badge><Button aria-label={showBalances ? "Hide budget balances" : "Show budget balances"} className="ml-auto" size="icon-sm" type="button" variant="ghost" onClick={() => toggleSectionVisibility("budget")}>{showBalances ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</Button></div>
          <CardDescription>
            Net spending progress against each allocation for {monthYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {categoryHealth.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b pb-3 text-xs text-muted-foreground">
              <span><strong className="text-emerald-600 dark:text-emerald-400">{statusCounts.healthy ?? 0}</strong> on track</span>
              <span><strong className="text-amber-600 dark:text-amber-400">{(statusCounts.warning ?? 0) + (statusCounts.critical ?? 0)}</strong> need attention</span>
              <span><strong className="text-red-600 dark:text-red-400">{statusCounts.exceeded ?? 0}</strong> over budget</span>
            </div>
          ) : null}
          {categoryHealth.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Allocate a budget above to start tracking category health.
            </p>
          ) : (
            categoryHealth.map((health) => (
              <CategoryRow
                key={health.category}
                health={health}
                showBalances={showBalances}
              />
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
