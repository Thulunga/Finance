"use client";

import { useState } from "react";
import { CalendarRange, LoaderCircle, Plus, SlidersHorizontal, Users } from "lucide-react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { CashFlowEntryForms } from "@/components/CashFlowEntryForms";
import { SplitManager } from "@/components/SplitManager";

import { BudgetManager } from "@/components/BudgetManager";
import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { calculateOverallKPIs } from "@/lib/budgetCalculations";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function DashboardTopBar() {
  const [cashFlowOpen, setCashFlowOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [receivablesOpen, setReceivablesOpen] = useState(false);
  const { monthYear, selectMonth, isLoadingMonth, budgets, expenses } = useDashboard();
  const kpis = calculateOverallKPIs(budgets, expenses, monthYear);

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card/70 p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-lg">
            <CalendarRange aria-hidden="true" />
            {monthFormatter.format(new Date(`${monthYear}-01T00:00:00Z`))}
          </Badge>
          {isLoadingMonth ? (
            <Badge variant="outline">
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Loading
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Budget command center
        </h1>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {currencyFormatter.format(kpis.totalSpent)} spent of{" "}
          {currencyFormatter.format(kpis.totalAllocated)} ·{" "}
          <span
            className={cn(
              kpis.isOverBudget
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {currencyFormatter.format(kpis.totalRemaining)} left this month
          </span>
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
        <Input
          aria-label="Dashboard month"
          className="min-w-0 flex-1 sm:w-[10rem] sm:flex-none"
          type="month"
          value={monthYear}
          onChange={(event) => selectMonth(event.target.value)}
        />

        <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
          <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" variant="outline" />}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Adjust budgets
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Monthly allocations</DialogTitle>
              <DialogDescription>
                Update category limits for {monthYear}. Changes apply instantly.
              </DialogDescription>
            </DialogHeader>
            <BudgetManager />
          </DialogContent>
        </Dialog>
        <Dialog open={cashFlowOpen} onOpenChange={setCashFlowOpen}>
          <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" variant="outline" />}>
            <Plus className="size-4" aria-hidden="true" />
            Cash flow
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add cash flow</DialogTitle>
              <DialogDescription>Record income or move money into an investment or emergency fund.</DialogDescription>
            </DialogHeader>
            <CashFlowEntryForms onCompleted={() => setCashFlowOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
          <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" />}>
            <Plus className="size-4" aria-hidden="true" />
            Add expense
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add expense</DialogTitle>
              <DialogDescription>Record a personal expense or split it with friends.</DialogDescription>
            </DialogHeader>
            <ExpenseForm onCompleted={() => setExpenseOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={receivablesOpen} onOpenChange={setReceivablesOpen}>
          <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" variant="outline" />}>
            <Users className="size-4" aria-hidden="true" />
            Receivables
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Receivables</DialogTitle>
              <DialogDescription>Review and settle money friends owe you.</DialogDescription>
            </DialogHeader>
            <SplitManager />
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
