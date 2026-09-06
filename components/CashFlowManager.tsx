"use client";

import { useState } from "react";
import { ArrowDownToLine, CreditCard, Landmark, Pencil, PiggyBank, ShieldCheck, Sparkles, Trash2, TrendingUp } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/DashboardProvider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { calculateOverallKPIs } from "@/lib/budgetCalculations";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function CashFlowManager() {
  const {
    monthYear,
    budgets,
    expenses,
    cashExpenses,
    income,
    allocations,
    updateIncome,
    deleteIncome,
    updateAllocation,
    deleteAllocation,
    sectionVisibility,
  } = useDashboard();
  const showBalances = sectionVisibility["cash-flow"];
  const kpis = calculateOverallKPIs(budgets, expenses, monthYear, income, allocations, cashExpenses);
  const visibleIncome = income.filter((entry) => entry.month_year === monthYear);
  const visibleAllocations = allocations.filter((allocation) => allocation.month_year === monthYear);
  const displayMoney = (value: number) => (showBalances ? money.format(value) : "••••••");
  const pairedMoney = (monthly: number, total: number) => (
    <div className="space-y-1">
      <p className="break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{displayMoney(monthly)}</p>
      <p className="text-xs text-muted-foreground">Total: <span className="font-mono tabular-nums">{displayMoney(total)}</span></p>
    </div>
  );
  const totalFirstMoney = (total: number, monthly: number) => (
    <div className="space-y-1">
      <p className="break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{displayMoney(total)}</p>
      <p className="text-xs text-muted-foreground">This month: <span className="font-mono tabular-nums">{displayMoney(monthly)}</span></p>
    </div>
  );
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [incomeDraft, setIncomeDraft] = useState<{ date: string; description: string; amount: number } | null>(null);
  const [allocationDraft, setAllocationDraft] = useState<{
    date: string;
    month_year: string;
    allocation_type: "investment" | "emergency_fund";
    description: string;
    amount: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "income" | "allocation"; id: string; label: string } | null>(null);

  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "income") deleteIncome(deleteTarget.id);
    else deleteAllocation(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <section className="space-y-4">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 max-sm:[--card-spacing:--spacing(3)] max-sm:[&>div:last-child]:col-span-2 max-sm:[&_[data-slot=card-header]]:gap-1 max-sm:[&_[data-slot=card-title]]:text-sm max-sm:[&_[data-slot=card-description]]:line-clamp-2">
        <Card>
          <CardHeader><CardTitle>Monthly income</CardTitle><CardDescription>Salary and other credits</CardDescription><CardAction><ArrowDownToLine className="size-5 text-emerald-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0">{pairedMoney(kpis.totalIncome, kpis.cumulativeIncome)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Budget utilized</CardTitle><CardDescription>Net spending this month</CardDescription><CardAction><TrendingUp className="size-5 text-amber-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0"><div className="space-y-1"><p className="break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{displayMoney(kpis.totalSpent)}</p><p className="text-xs text-muted-foreground">This month</p></div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Credit card due</CardTitle><CardDescription>Carried balance after purchases and payments</CardDescription><CardAction><CreditCard className="size-5 text-violet-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0"><div className="space-y-1"><p className="break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{displayMoney(kpis.creditCardDue)}</p><p className="text-xs text-muted-foreground">Total outstanding</p></div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invested</CardTitle><CardDescription>Moved out of available cash</CardDescription><CardAction><Landmark className="size-5 text-sky-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0">{totalFirstMoney(kpis.cumulativeInvested, kpis.totalInvested)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Emergency fund</CardTitle><CardDescription>Money kept in reserve</CardDescription><CardAction><ShieldCheck className="size-5 text-emerald-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0">{totalFirstMoney(kpis.cumulativeEmergencyFund, kpis.totalEmergencyFund)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>After spending</CardTitle><CardDescription>Income less expenses</CardDescription><CardAction><TrendingUp className="size-5 text-emerald-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0">{pairedMoney(kpis.totalAfterSpending, kpis.cumulativeAfterSpending)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Liquid cash</CardTitle><CardDescription>Unallocated spending-account balance</CardDescription><CardAction><PiggyBank className="size-5 text-emerald-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0"><div className="space-y-1"><p className={`break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl ${kpis.cashAvailable < 0 ? "text-red-600" : "text-emerald-600"}`}>{displayMoney(kpis.cashAvailable)}</p><p className="text-xs text-muted-foreground">Total liquid balance</p></div></CardContent>
        </Card>
        <Card className="max-sm:col-span-2">
          <CardHeader><CardTitle>Total financial position</CardTitle><CardDescription>Cash, assets, and reserves minus card due</CardDescription><CardAction><Sparkles className="size-5 text-emerald-600" /></CardAction></CardHeader>
          <CardContent className="min-w-0"><p className="break-all font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-3xl">{displayMoney(kpis.totalFinancialPosition)}</p><p className="mt-1 text-xs text-muted-foreground">Overall position</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2"><CardTitle>Cash flow records</CardTitle><Badge variant="secondary">{visibleIncome.length + visibleAllocations.length} entries</Badge></div>
          <CardDescription>Edit or remove income and allocations for {monthYear}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between border-b pb-2"><div><p className="text-sm font-semibold">Income received</p><p className="text-xs text-muted-foreground">Salary and other credits</p></div><Badge variant="outline">{visibleIncome.length}</Badge></div>
            {visibleIncome.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No income recorded for {monthYear}.</p> : visibleIncome.map((entry) => editingIncomeId === entry.id && incomeDraft ? (
              <form key={entry.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_10rem_auto]" onSubmit={(event) => { event.preventDefault(); updateIncome(entry.id, incomeDraft); setEditingIncomeId(null); setIncomeDraft(null); }}>
                <Input aria-label="Income date" type="date" value={incomeDraft.date} onChange={(event) => setIncomeDraft({ ...incomeDraft, date: event.target.value })} />
                <Input aria-label="Income description" value={incomeDraft.description} onChange={(event) => setIncomeDraft({ ...incomeDraft, description: event.target.value })} />
                <Input aria-label="Income amount" placeholder="Amount in INR" min="0.01" step="0.01" type="number" value={incomeDraft.amount || ""} onChange={(event) => setIncomeDraft({ ...incomeDraft, amount: Number(event.target.value || 0) })} />
                <Button size="sm" type="submit">Done</Button>
              </form>
            ) : <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-emerald-600/15 bg-emerald-500/5 p-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><ArrowDownToLine className="size-4" aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{entry.description}</p><p className="text-xs text-muted-foreground">{entry.date}</p></div><p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{showBalances ? money.format(entry.amount) : "••••••"}</p><div className="flex shrink-0 gap-1"><Button aria-label={`Edit ${entry.description}`} size="icon-sm" type="button" variant="ghost" onClick={() => { setEditingIncomeId(entry.id); setIncomeDraft({ date: entry.date, description: entry.description, amount: entry.amount }); }}><Pencil className="size-4" /></Button><Button aria-label={`Delete ${entry.description}`} size="icon-sm" type="button" variant="ghost" onClick={() => setDeleteTarget({ type: "income", id: entry.id, label: entry.description })}><Trash2 className="size-4 text-destructive" /></Button></div></div>)}
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between border-b pb-2"><div><p className="text-sm font-semibold">Money set aside</p><p className="text-xs text-muted-foreground">Investments and emergency fund</p></div><Badge variant="outline">{visibleAllocations.length}</Badge></div>
            {visibleAllocations.length === 0 ? <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No allocations recorded for {monthYear}.</p> : visibleAllocations.map((allocation) => editingAllocationId === allocation.id && allocationDraft ? (
              <form key={allocation.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_10rem_auto]" onSubmit={(event) => { event.preventDefault(); updateAllocation(allocation.id, allocationDraft); setEditingAllocationId(null); setAllocationDraft(null); }}>
                <Input aria-label="Allocation date" type="date" value={allocationDraft.date} onChange={(event) => setAllocationDraft({ ...allocationDraft, date: event.target.value, month_year: event.target.value.slice(0, 7) })} />
                <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                  <Input aria-label="Allocation description" placeholder="Allocation description" value={allocationDraft.description} onChange={(event) => setAllocationDraft({ ...allocationDraft, description: event.target.value })} />
                  <Input aria-label="Allocation amount" placeholder="Amount in INR" min="0.01" step="0.01" type="number" value={allocationDraft.amount || ""} onChange={(event) => setAllocationDraft({ ...allocationDraft, amount: Number(event.target.value || 0) })} />
                  <select aria-label="Allocation type" className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm sm:col-span-2" value={allocationDraft.allocation_type} onChange={(event) => setAllocationDraft({ ...allocationDraft, allocation_type: event.target.value as "investment" | "emergency_fund" })}>
                    <option value="investment">Investment</option>
                    <option value="emergency_fund">Emergency fund</option>
                  </select>
                </div>
                <Button size="sm" type="submit">Done</Button>
              </form>
            ) : <div key={allocation.id} className="flex items-center gap-3 rounded-lg border border-sky-600/15 bg-sky-500/5 p-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">{allocation.allocation_type === "investment" ? <Landmark className="size-4" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{allocation.description}</p><p className="text-xs text-muted-foreground">{allocation.allocation_type === "investment" ? "Investment" : "Emergency fund"} · {allocation.date}</p></div><p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-sky-600 dark:text-sky-400">{showBalances ? money.format(allocation.amount) : "••••••"}</p><div className="flex shrink-0 gap-1"><Button aria-label={`Edit ${allocation.description}`} size="icon-sm" type="button" variant="ghost" onClick={() => { setEditingAllocationId(allocation.id); setAllocationDraft({ date: allocation.date, month_year: allocation.month_year, allocation_type: allocation.allocation_type, description: allocation.description, amount: allocation.amount }); }}><Pencil className="size-4" /></Button><Button aria-label={`Delete ${allocation.description}`} size="icon-sm" type="button" variant="ghost" onClick={() => setDeleteTarget({ type: "allocation", id: allocation.id, label: allocation.description })}><Trash2 className="size-4 text-destructive" /></Button></div></div>)}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this record?"
        description={deleteTarget ? `This will permanently remove ${deleteTarget.label}. This action cannot be undone.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}