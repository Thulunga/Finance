"use client";

import { useState } from "react";
import { Landmark, PiggyBank, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/DashboardProvider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

export function AssetBalances() {
  const {
    epfHistory,
    fdAccounts,
    editFdAccount,
    removeFdAccount,
    sectionVisibility,
  } = useDashboard();
  const showBalances = sectionVisibility["assets"];
  const displayMoney = (value: number) => (showBalances ? money.format(value) : "••••••");
  const latestEpf = epfHistory[0] ?? null;
  const totalFd = fdAccounts.reduce((sum, account) => sum + account.amount, 0);

  const [editingFdId, setEditingFdId] = useState<string | null>(null);
  const [fdDraft, setFdDraft] = useState<{
    bank_name: string;
    amount: number;
    interest_rate: number | null;
    maturity_date: string | null;
    note: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  return (
    <section className="space-y-4">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>EPF balance</CardTitle>
            <CardDescription>Latest recorded balance</CardDescription>
            <CardAction><PiggyBank className="size-5 text-sky-600" /></CardAction>
          </CardHeader>
          <CardContent className="min-w-0">
            <p className="break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{latestEpf ? displayMoney(latestEpf.balance) : "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestEpf ? `Updated ${dateFormatter.format(new Date(`${latestEpf.recorded_at}T00:00:00Z`))}` : "No balance recorded yet"}
            </p>
          </CardContent>
        </Card>
        <Card className="max-sm:col-span-2 sm:col-span-1">
          <CardHeader>
            <CardTitle>Fixed deposits</CardTitle>
            <CardDescription>Total across all FDs</CardDescription>
            <CardAction><Landmark className="size-5 text-violet-600" /></CardAction>
          </CardHeader>
          <CardContent className="min-w-0">
            <p className="break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{displayMoney(totalFd)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{fdAccounts.length} {fdAccounts.length === 1 ? "deposit" : "deposits"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2"><CardTitle>Fixed deposit accounts</CardTitle><Badge variant="secondary">{fdAccounts.length} entries</Badge></div>
          <CardDescription>Edit or remove your fixed deposits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fdAccounts.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No fixed deposits recorded yet.</p>
          ) : (
            fdAccounts.map((account) =>
              editingFdId === account.id && fdDraft ? (
                <form
                  key={account.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    editFdAccount(account.id, fdDraft);
                    setEditingFdId(null);
                    setFdDraft(null);
                  }}
                >
                  <Input aria-label="Bank name" placeholder="Bank name" value={fdDraft.bank_name} onChange={(event) => setFdDraft({ ...fdDraft, bank_name: event.target.value })} />
                  <Input aria-label="FD amount" placeholder="Amount in INR" min="0.01" step="0.01" type="number" value={fdDraft.amount || ""} onChange={(event) => setFdDraft({ ...fdDraft, amount: Number(event.target.value || 0) })} />
                  <Input aria-label="Interest rate" placeholder="Interest rate %" min="0" step="0.01" type="number" value={fdDraft.interest_rate ?? ""} onChange={(event) => setFdDraft({ ...fdDraft, interest_rate: event.target.value ? Number(event.target.value) : null })} />
                  <Input aria-label="Maturity date" type="date" value={fdDraft.maturity_date ?? ""} onChange={(event) => setFdDraft({ ...fdDraft, maturity_date: event.target.value || null })} />
                  <Input aria-label="Note" className="sm:col-span-2" placeholder="Note (optional)" value={fdDraft.note} onChange={(event) => setFdDraft({ ...fdDraft, note: event.target.value })} />
                  <Button className="sm:col-span-2" size="sm" type="submit">Done</Button>
                </form>
              ) : (
                <div key={account.id} className="flex items-center gap-3 rounded-lg border border-violet-600/15 bg-violet-500/5 p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <Landmark className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{account.bank_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.interest_rate ? `${account.interest_rate}% · ` : ""}
                      {account.maturity_date ? `Matures ${dateFormatter.format(new Date(`${account.maturity_date}T00:00:00Z`))}` : "No maturity date"}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">{showBalances ? money.format(account.amount) : "••••••"}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      aria-label={`Edit ${account.bank_name}`}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingFdId(account.id);
                        setFdDraft({
                          bank_name: account.bank_name,
                          amount: account.amount,
                          interest_rate: account.interest_rate,
                          maturity_date: account.maturity_date,
                          note: account.note ?? "",
                        });
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button aria-label={`Delete ${account.bank_name}`} size="icon-sm" type="button" variant="ghost" onClick={() => setDeleteTarget({ id: account.id, label: account.bank_name })}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            )
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this fixed deposit?"
        description={deleteTarget ? `This will permanently remove ${deleteTarget.label}. This action cannot be undone.` : ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeFdAccount(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}
