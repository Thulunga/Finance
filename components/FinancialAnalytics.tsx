"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Eye, EyeOff, Sparkles, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateCategoryHealth, calculateOverallKPIs } from "@/lib/budgetCalculations";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const BAR_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  color: "var(--popover-foreground)",
};

function formatCurrency(value: number) {
  return currency.format(value);
}

export function FinancialAnalytics() {
  const {
    budgets,
    expenses,
    cashExpenses,
    monthYear,
    income,
    allocations,
    sectionVisibility,
    toggleSectionVisibility,
  } = useDashboard();
  const showBudget = sectionVisibility.budget;
  const showCash = sectionVisibility["cash-flow"];
  const categoryHealth = useMemo(
    () => calculateCategoryHealth(budgets, expenses, monthYear),
    [budgets, expenses, monthYear]
  );
  const kpis = useMemo(
    () => calculateOverallKPIs(budgets, expenses, monthYear, income, allocations, cashExpenses),
    [budgets, expenses, monthYear, income, allocations, cashExpenses]
  );
  const biggestCategory = [...categoryHealth].sort((a, b) => b.spent - a.spent)[0];
  const monthIncome = income.filter((item) => item.month_year === monthYear).reduce((sum, item) => sum + item.amount, 0);
  const monthInvested = allocations.filter((item) => item.month_year === monthYear && item.allocation_type === "investment").reduce((sum, item) => sum + item.amount, 0);
  const monthEmergency = allocations.filter((item) => item.month_year === monthYear && item.allocation_type === "emergency_fund").reduce((sum, item) => sum + item.amount, 0);
  const totalAllocated = categoryHealth.reduce((sum, item) => sum + item.allocated, 0);
  const allocationData = [
    { name: "Invested", value: monthInvested },
    { name: "Emergency fund", value: monthEmergency },
  ].filter((item) => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Financial landscape</CardTitle>
          <Badge variant="secondary">{monthYear}</Badge>
          <Button
            className="ml-auto"
            size="icon-sm"
            type="button"
            variant="ghost"
            aria-label={showBudget || showCash ? "Hide analytics balances" : "Show analytics balances"}
            onClick={() => {
              toggleSectionVisibility("budget");
              toggleSectionVisibility("cash-flow");
            }}
          >
            {showBudget || showCash ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </Button>
        </div>
        <CardDescription>A deeper view of category pressure, cash movement, and where this month’s money went.</CardDescription>
      </CardHeader>
      <CardContent>
        {!showBudget && !showCash ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"><Eye className="size-5" aria-hidden="true" />Balances are hidden</div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-emerald-500/5 p-3"><p className="text-xs text-muted-foreground">Budget utilization</p><p className="mt-1 font-mono text-xl font-semibold tabular-nums">{kpis.percentage.toFixed(0)}%</p><p className="text-xs text-muted-foreground">{formatCurrency(kpis.totalSpent)} of {formatCurrency(kpis.totalAllocated)}</p></div>
              <div className="rounded-lg border bg-sky-500/5 p-3"><p className="text-xs text-muted-foreground">Income coverage</p><p className="mt-1 font-mono text-xl font-semibold tabular-nums">{monthIncome > 0 ? ((kpis.totalSpent / monthIncome) * 100).toFixed(0) : "0"}%</p><p className="text-xs text-muted-foreground">Spending versus income</p></div>
              <div className="rounded-lg border bg-violet-500/5 p-3"><p className="text-xs text-muted-foreground">Credit card due</p><p className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatCurrency(kpis.creditCardDue)}</p><p className="text-xs text-muted-foreground">Outstanding liability</p></div>
              <div className="rounded-lg border bg-amber-500/5 p-3"><p className="text-xs text-muted-foreground">Set aside this month</p><p className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatCurrency(monthInvested + monthEmergency)}</p><p className="text-xs text-muted-foreground">Investment + reserve</p></div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="min-w-0 rounded-lg border bg-background/60 p-3 sm:p-4">
                <div className="mb-5 flex items-center gap-2"><BarChart3 className="size-4 text-emerald-600" aria-hidden="true" /><div><p className="text-sm font-semibold">Category pressure</p><p className="text-xs text-muted-foreground">Compare spent and remaining budget by category</p></div></div>
                {categoryHealth.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Add budgets or expenses to build your landscape.</p> : <><div className="h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryHealth} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}><CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="category" width={104} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [formatCurrency(Number(value)), name === "spent" ? "Spent" : "Remaining"]} /><Bar dataKey="spent" name="spent" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14}>{categoryHealth.map((item, index) => <Cell key={item.category} fill={BAR_COLORS[index % BAR_COLORS.length]} />)}</Bar><Bar dataKey="remaining" name="remaining" fill="#d1d5db" radius={[0, 4, 4, 0]} barSize={14} /></BarChart></ResponsiveContainer></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" />Spent</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-gray-300" />Remaining</span></div></>}
              </div>

              <div className="space-y-4 rounded-lg border bg-background/60 p-3 sm:p-4">
                <div className="flex items-center gap-2"><Sparkles className="size-4 text-amber-600" aria-hidden="true" /><p className="text-sm font-semibold">What stands out</p></div>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3"><WalletCards className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /><p>{biggestCategory ? <><strong>{biggestCategory.category}</strong> is your largest spending category this month at <strong>{formatCurrency(biggestCategory.spent)}</strong>.</> : "Add an expense to reveal your biggest spending category."}</p></div>
                  <div className="flex gap-3"><ArrowUpRight className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden="true" /><p><strong>{formatCurrency(monthInvested + monthEmergency)}</strong> was moved away from spending cash this month.</p></div>
                  <div className="flex gap-3"><ArrowDownRight className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" /><p><strong>{formatCurrency(kpis.creditCardDue)}</strong> remains outstanding on your credit card.</p></div>
                </div>
                <div className="border-t pt-3"><p className="mb-2 text-xs font-medium text-muted-foreground">Allocation mix</p>{allocationData.length > 0 ? <div className="h-36"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={54} paddingAngle={4}>{allocationData.map((item, index) => <Cell key={item.name} fill={index === 0 ? "#0ea5e9" : "#10b981"} />)}</Pie><Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} /></PieChart></ResponsiveContainer></div> : <p className="text-xs text-muted-foreground">No allocations recorded this month.</p>}</div>
                <div className="border-t pt-3 text-xs text-muted-foreground"><p>Allocation coverage</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(totalAllocated > 0 ? (kpis.totalSpent / totalAllocated) * 100 : 0, 100)}%` }} /></div><p className="mt-1">{formatCurrency(kpis.totalSpent)} spent from {formatCurrency(totalAllocated)} allocated</p></div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Categories tracked</p><p className="mt-1 font-semibold tabular-nums">{categoryHealth.length}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Income entries</p><p className="mt-1 font-semibold tabular-nums">{income.filter((item) => item.month_year === monthYear).length}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Available after allocations</p><p className="mt-1 font-mono font-semibold tabular-nums">{formatCurrency(kpis.cashAvailable)}</p></div></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
