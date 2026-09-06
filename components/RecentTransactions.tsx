"use client";

import { useMemo, useState } from "react";
import { EditExpenseDialog } from "@/components/EditExpenseDialog";
import { CreditCard, Eye, EyeOff, ListFilter, Pencil, ReceiptText, Trash2, Users } from "lucide-react";

import { useDashboard, type ExpenseWithSplits } from "@/components/DashboardProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_CATEGORIES = "__all__";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function SplitStatus({ expense }: Readonly<{ expense: ExpenseWithSplits }>) {
  const splits = expense.split_receivables;

  if (splits.length === 0) {
    return <span className="text-xs text-muted-foreground">Personal</span>;
  }

  const friendCount = new Set(splits.map((split) => split.friend_name)).size;
  const pending = splits
    .filter((split) => !split.is_settled)
    .reduce((total, split) => total + split.amount_owed, 0);

  if (pending === 0) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-600/30 text-emerald-700 dark:text-emerald-300"
      >
        <Users aria-hidden="true" />
        Settled
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-amber-600/30 font-mono text-amber-700 tabular-nums dark:text-amber-300"
    >
      <Users aria-hidden="true" />
      Split with {friendCount} {friendCount === 1 ? "friend" : "friends"} (
      {formatCurrency(pending)} pending)
    </Badge>
  );
}

export function RecentTransactions() {
  const { expenses, categories, monthYear, removeExpense, isLoadingMonth, sectionVisibility, toggleSectionVisibility } =
    useDashboard();
  const showBalances = sectionVisibility.transactions;
  const displayMoney = (value: number) => (showBalances ? formatCurrency(value) : "••••••");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseWithSplits | null>(null);
  const [editTarget, setEditTarget] = useState<ExpenseWithSplits | null>(null);

  const visibleExpenses = useMemo(
    () =>
      categoryFilter === ALL_CATEGORIES
        ? expenses
        : expenses.filter((expense) => expense.category === categoryFilter),
    [expenses, categoryFilter]
  );

  const netTotal = visibleExpenses.reduce(
    (total, expense) => total + expense.my_share,
    0
  );

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Spending ledger</CardTitle>
              <Badge variant="secondary">{visibleExpenses.length} entries</Badge>
            </div>
            <CardDescription>{monthYear} · {categoryFilter === ALL_CATEGORIES ? "All categories" : categoryFilter}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="font-mono tabular-nums">{displayMoney(netTotal)} net</Badge>
            <Button aria-label={showBalances ? "Hide transaction balances" : "Show transaction balances"} size="icon-sm" type="button" variant="ghost" onClick={() => toggleSectionVisibility("transactions")}>{showBalances ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</Button>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
          <ListFilter className="ml-1 size-4 text-muted-foreground" aria-hidden="true" />
          <Select value={categoryFilter} onValueChange={(next) => setCategoryFilter(next ?? ALL_CATEGORIES)}>
            <SelectTrigger className="h-9 flex-1 border-0 bg-transparent shadow-none" aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {visibleExpenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
            <ReceiptText className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {isLoadingMonth
                ? "Loading transactions…"
                : "No transactions match this view yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleExpenses.map((expense) => (
              <div key={expense.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-background/70 p-2.5 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3 sm:p-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:size-9"><ReceiptText className="size-3.5 sm:size-4" aria-hidden="true" /></div>
                  <div className="min-w-0 space-y-0.5"><p className="truncate text-sm font-semibold">{expense.description}</p><p className="truncate text-[11px] text-muted-foreground">{formatDate(expense.date)} · {expense.category}</p><div className="flex flex-wrap gap-1">{expense.is_credit_card_payment ? <Badge className="h-5" variant="outline"><CreditCard className="size-3" aria-hidden="true" /> Card payment</Badge> : expense.is_credit_card ? <Badge className="h-5" variant="outline"><CreditCard className="size-3" aria-hidden="true" /> Card</Badge> : null}<SplitStatus expense={expense} /></div></div>
                </div>
                <div className="flex items-center gap-1 sm:block sm:text-right"><p className="hidden text-xs text-muted-foreground sm:block">Net share</p><p className="font-mono text-sm font-semibold tabular-nums sm:text-base">{displayMoney(expense.my_share)}</p><div className="flex justify-end gap-0.5 sm:gap-1"><Button aria-label={`Edit ${expense.description}`} size="icon-sm" type="button" variant="ghost" onClick={() => setEditTarget(expense)}><Pencil className="size-3.5 sm:size-4" aria-hidden="true" /><span className="sr-only">Edit {expense.description}</span></Button><Button aria-label={`Delete ${expense.description}`} className="hover:text-destructive" size="icon-sm" type="button" variant="ghost" onClick={() => setDeleteTarget(expense)}><Trash2 className="size-3.5 sm:size-4" aria-hidden="true" /><span className="sr-only">Delete {expense.description}</span></Button></div></div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this expense?"
        description={deleteTarget ? `This will permanently remove ${deleteTarget.description} and its split records.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeExpense(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
      <EditExpenseDialog
        key={editTarget?.id ?? "edit-expense"}
        expense={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
      />
    </Card>
  );
}
