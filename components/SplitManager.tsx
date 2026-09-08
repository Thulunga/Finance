"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, HandCoins, Trash2, Users } from "lucide-react";

import { deleteReceivable, settleReceivable } from "@/app/actions/splitActions";
import { useDashboard } from "@/components/DashboardProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatDate(date: string | undefined) {
  if (!date) {
    return "—";
  }

  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export function SplitManager() {
  const { receivables, resolveSplit, sectionVisibility, toggleSectionVisibility, owedByMe, settleOwedSplit } = useDashboard();
  const showBalances = sectionVisibility.receivables;
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const displayMoney = (value: number) => (showBalances ? formatCurrency(value) : "••••••");

  const pending = useMemo(
    () => receivables.filter((item) => !item.is_settled),
    [receivables]
  );

  const pendingOwedByMe = useMemo(
    () => owedByMe.filter((item) => !item.is_settled),
    [owedByMe]
  );
  const totalIOwe = pendingOwedByMe.reduce((total, item) => total + item.amount_owed, 0);

  const friendTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const item of pending) {
      totals.set(
        item.friend_name,
        (totals.get(item.friend_name) ?? 0) + item.amount_owed
      );
    }

    return Array.from(totals, ([friend_name, amount]) => ({ friend_name, amount })).sort(
      (a, b) => b.amount - a.amount
    );
  }, [pending]);

  const totalToCollect = friendTotals.reduce((total, item) => total + item.amount, 0);

  return (
    <div className="space-y-4">
    <Card className="border-amber-900/10 bg-card/95 shadow-sm dark:border-amber-300/10">
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Splits & receivables</CardTitle>
            <Button aria-label={showBalances ? "Hide receivable balances" : "Show receivable balances"} className="ml-auto" size="icon-sm" type="button" variant="ghost" onClick={() => toggleSectionVisibility("receivables")}>{showBalances ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</Button>
            <Badge variant="secondary">
              <Users aria-hidden="true" />
              {friendTotals.length} {friendTotals.length === 1 ? "friend" : "friends"}
            </Badge>
          </div>
          <CardDescription>
            Mark money as received the moment a friend settles up.
          </CardDescription>
        </div>
        <CardAction>
          <HandCoins
            className="size-5 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-emerald-50/60 p-4 dark:bg-emerald-950/25">
          <p className="text-sm text-muted-foreground">Total Money to Collect</p>
          <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-emerald-600 sm:text-4xl dark:text-emerald-400">
            {displayMoney(totalToCollect)}
          </p>

          {friendTotals.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {friendTotals.map((friend) => (
                <Badge
                  key={friend.friend_name}
                  variant="outline"
                  className="border-emerald-600/30 font-mono tabular-nums text-emerald-700 dark:text-emerald-300"
                >
                  {friend.friend_name}: {displayMoney(friend.amount)}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No pending receivables. Every split is settled.
          </p>
        ) : (
          <>
          <div className="rounded-lg border sm:hidden">
            <div className="divide-y">
              {pending.map((item) => (
                <div key={item.id} className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.expense?.description ?? "Deleted expense"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.expense?.date)} · {item.friend_name}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-medium tabular-nums">
                      {displayMoney(item.amount_owed)}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      className="border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                      type="button"
                      variant="outline"
                      onClick={() => resolveSplit(item.id, settleReceivable)}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      Received
                    </Button>
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => setDeleteTarget({ id: item.id, label: item.friend_name })}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">Remove split</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Expense</TableHead>
                  <TableHead>Friend</TableHead>
                  <TableHead className="text-right">Owed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                      {formatDate(item.expense?.date)}
                    </TableCell>
                    <TableCell className="max-w-[16rem]">
                      <p className="truncate text-sm font-medium">
                        {item.expense?.description ?? "Deleted expense"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.expense?.category ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{item.friend_name}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {displayMoney(item.amount_owed)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          className="border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() =>
                            resolveSplit(item.id, settleReceivable)
                          }
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Received
                        </Button>
                        <Button
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ id: item.id, label: item.friend_name })}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">Remove split</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this receivable?"
        description={deleteTarget ? `This will remove the amount owed by ${deleteTarget.label}.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) resolveSplit(deleteTarget.id, deleteReceivable);
          setDeleteTarget(null);
        }}
      />
    </Card>

    <Card className="border-sky-900/10 bg-card/95 shadow-sm dark:border-sky-300/10">
      <CardHeader>
        <CardTitle>You owe</CardTitle>
        <CardDescription>Expenses friends have split with you. Mark them paid once settled.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-sky-50/60 p-4 dark:bg-sky-950/25">
          <p className="text-sm text-muted-foreground">Total You Owe</p>
          <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-sky-600 sm:text-4xl dark:text-sky-400">
            {displayMoney(totalIOwe)}
          </p>
        </div>

        {pendingOwedByMe.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            You don&apos;t owe anyone right now.
          </p>
        ) : (
          <div className="rounded-lg border">
            <div className="divide-y">
              {pendingOwedByMe.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.expenses?.description ?? "Deleted expense"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.expenses?.date)} · {item.expenses?.category ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="font-mono text-sm font-medium tabular-nums">
                      {displayMoney(item.amount_owed)}
                    </p>
                    <Button
                      className="border-sky-600/40 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => settleOwedSplit(item.id, true)}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      Mark paid
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
