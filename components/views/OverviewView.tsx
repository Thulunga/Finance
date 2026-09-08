"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  HandCoins,
  Landmark,
  ReceiptText,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { SectionVisibilityToggle } from "@/components/SectionVisibilityToggle";
import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { calculateOverallKPIs } from "@/lib/budgetCalculations";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const quickLinks = [
  { href: "/expenses", label: "Expenses", description: "Add and review spending", icon: ReceiptText },
  { href: "/cash-flow", label: "Cash flow", description: "Income and allocations", icon: Wallet },
  { href: "/budgets", label: "Budgets", description: "Category limits", icon: Target },
  { href: "/assets", label: "Assets", description: "EPF and fixed deposits", icon: Landmark },
  { href: "/analytics", label: "Analytics", description: "Trends and pressure", icon: BarChart3 },
  { href: "/groups", label: "Groups", description: "Shared expenses", icon: Users },
  { href: "/split", label: "Receivables", description: "Who owes whom", icon: HandCoins },
];

export function OverviewView() {
  const {
    monthYear,
    budgets,
    expenses,
    cashExpenses,
    income,
    allocations,
    epfHistory,
    fdAccounts,
    receivables,
    groups,
    sectionVisibility,
  } = useDashboard();

  const kpis = calculateOverallKPIs(budgets, expenses, monthYear, income, allocations, cashExpenses);
  const show = sectionVisibility["cash-flow"];
  const latestEpf = epfHistory[0]?.balance ?? 0;
  const totalFd = fdAccounts.reduce((sum, account) => sum + account.amount, 0);
  const pendingReceivables = receivables
    .filter((item) => !item.is_settled)
    .reduce((total, item) => total + item.amount_owed, 0);
  const netWorth = kpis.totalFinancialPosition + latestEpf + totalFd;
  const displayMoney = (value: number) => (show ? money.format(value) : "••••••");

  const stats = [
    { label: "Net worth", value: netWorth, accent: "text-emerald-600 dark:text-emerald-400", hint: "Cash, assets, reserves" },
    { label: "Liquid cash", value: kpis.cashAvailable - pendingReceivables, accent: "text-sky-600 dark:text-sky-400", hint: "Available to spend" },
    { label: "Spent this month", value: kpis.totalSpent, accent: "text-amber-600 dark:text-amber-400", hint: "Across all categories" },
    { label: "Budget remaining", value: kpis.totalRemaining, accent: kpis.isOverBudget ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400", hint: "Left for the month" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        description="A quick snapshot of your finances and shortcuts to every section."
        actions={<SectionVisibilityToggle label="dashboard" section="cash-flow" />}
      />

      <section className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn("break-all font-mono text-xl font-semibold tabular-nums sm:text-2xl", stat.accent)}>
                {displayMoney(stat.value)}
              </p>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold tracking-tight">Jump to</h2>
          {groups.length > 0 ? (
            <Badge variant="secondary" className="gap-1">
              <Users className="size-3" aria-hidden="true" />
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-xl border bg-card/70 p-4 shadow-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tracking-tight">{link.label}</p>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card/70 p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <p className="text-sm font-medium">
            After spending this month:{" "}
            <span className="font-mono tabular-nums">{displayMoney(kpis.totalAfterSpending)}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
