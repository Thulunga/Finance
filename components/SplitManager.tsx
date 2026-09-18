"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Check, Eye, EyeOff, HandCoins, Plus, RotateCcw, Trash2, Users } from "lucide-react";

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
import { Input } from "@/components/ui/input";

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
  if (!date) return "—";
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SplitManager() {
  const {
    receivables,
    addReceivable,
    toggleReceivableSettled,
    removeReceivable,
    sectionVisibility,
    toggleSectionVisibility,
  } = useDashboard();
  const showBalances = sectionVisibility.receivables;
  const displayMoney = (value: number) => (showBalances ? formatCurrency(value) : "••••••");

  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const pending = useMemo(
    () => receivables.filter((item) => !item.is_settled),
    [receivables]
  );
  const settled = useMemo(
    () => receivables.filter((item) => item.is_settled),
    [receivables]
  );

  const personTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of pending) {
      totals.set(item.person_name, (totals.get(item.person_name) ?? 0) + item.amount);
    }
    return Array.from(totals, ([person_name, total]) => ({ person_name, total })).sort(
      (a, b) => b.total - a.total
    );
  }, [pending]);

  const totalToCollect = personTotals.reduce((sum, item) => sum + item.total, 0);
  const canSubmit = Boolean(personName.trim()) && amount > 0 && Boolean(date);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    addReceivable({
      person_name: personName.trim(),
      amount,
      note: note.trim() || null,
      receivable_date: date,
    });
    setPersonName("");
    setAmount(0);
    setNote("");
    setDate(today());
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      {/* Add receivable */}
      <Card className="border-amber-900/10 bg-card/95 shadow-sm dark:border-amber-300/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" aria-hidden="true" />
            Add a receivable
          </CardTitle>
          <CardDescription>Record money someone owes you.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block space-y-1.5 text-sm font-medium">
              Who owes you?
              <Input
                placeholder="e.g. Rahul"
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5 text-sm font-medium">
                Amount
                <Input
                  className="font-mono tabular-nums"
                  min="0"
                  step="0.01"
                  type="number"
                  value={amount || ""}
                  onChange={(event) => setAmount(Number(event.target.value || 0))}
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Date
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium">
              Note (optional)
              <Input
                placeholder="What it was for"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <Button className="w-full" disabled={!canSubmit} type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Add receivable
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-amber-900/10 bg-card/95 shadow-sm dark:border-amber-300/10">
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Receivables</CardTitle>
              <Button
                aria-label={showBalances ? "Hide receivable balances" : "Show receivable balances"}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => toggleSectionVisibility("receivables")}
              >
                {showBalances ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
              <Badge variant="secondary">
                <Users aria-hidden="true" />
                {personTotals.length} {personTotals.length === 1 ? "person" : "people"}
              </Badge>
            </div>
            <CardDescription>Mark as received when someone settles up.</CardDescription>
          </div>
          <CardAction>
            <HandCoins className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-emerald-50/60 p-4 dark:bg-emerald-950/25">
            <p className="text-sm text-muted-foreground">Total money to collect</p>
            <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-emerald-600 sm:text-4xl dark:text-emerald-400">
              {displayMoney(totalToCollect)}
            </p>
            {personTotals.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {personTotals.map((person) => (
                  <Badge
                    key={person.person_name}
                    variant="outline"
                    className="border-emerald-600/30 font-mono tabular-nums text-emerald-700 dark:text-emerald-300"
                  >
                    {person.person_name}: {displayMoney(person.total)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          {pending.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No pending receivables. Add one on the left.
            </p>
          ) : (
            <div className="rounded-lg border">
              <div className="divide-y">
                {pending.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.person_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(item.receivable_date)}
                        {item.note ? ` · ${item.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="shrink-0 font-mono text-sm font-medium tabular-nums">
                        {displayMoney(item.amount)}
                      </p>
                      <Button
                        className="border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => toggleReceivableSettled(item.id, true)}
                      >
                        <Check className="size-4" aria-hidden="true" />
                        Received
                      </Button>
                      <Button
                        size="icon"
                        type="button"
                        variant="ghost"
                        onClick={() => setDeleteTarget({ id: item.id, label: item.person_name })}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Remove receivable</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settled.length > 0 ? (
            <div>
              <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Settled</p>
              <div className="rounded-lg border">
                <div className="divide-y">
                  {settled.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-muted-foreground line-through">
                          {item.person_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(item.settled_date ?? item.receivable_date)}
                          {item.note ? ` · ${item.note}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                          {displayMoney(item.amount)}
                        </p>
                        <Button
                          aria-label="Mark as pending"
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                          onClick={() => toggleReceivableSettled(item.id, false)}
                        >
                          <RotateCcw className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                          onClick={() => setDeleteTarget({ id: item.id, label: item.person_name })}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">Remove receivable</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this receivable?"
        description={
          deleteTarget ? `This will permanently remove the amount owed by ${deleteTarget.label}.` : ""
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeReceivable(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
