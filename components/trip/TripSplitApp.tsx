"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, Plus, Trash2, Users, Wallet } from "lucide-react";

import {
  createTripExpense,
  createTripSettlement,
  deleteTripExpense,
  deleteTripSettlement,
} from "@/app/actions/tripActions";
import {
  TRIP_MEMBERS,
  type TripExpense,
  type TripMember,
  type TripSettlement,
} from "@/lib/trip";
import { cn } from "@/lib/utils";

type TripSplitAppProps = Readonly<{
  initialExpenses: TripExpense[];
  initialSettlements: TripSettlement[];
}>;

type SplitMode = "equal" | "custom";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatMoney(value: number) {
  return currency.format(Math.round(value * 100) / 100);
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Split the total equally across the included members, giving any rounding
// remainder (in paise) to the first members so shares still sum to the total.
function equalShares(total: number, members: TripMember[]) {
  const shares = new Map<TripMember, number>();
  if (members.length === 0) return shares;
  const totalPaise = Math.round(total * 100);
  const base = Math.floor(totalPaise / members.length);
  let remainder = totalPaise - base * members.length;
  for (const member of members) {
    const paise = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    shares.set(member, paise / 100);
  }
  return shares;
}

type Balance = {
  person: TripMember;
  paid: number;
  share: number;
  net: number;
};

type Settlement = {
  from: TripMember;
  to: TripMember;
  amount: number;
};

function computeBalances(
  expenses: TripExpense[],
  settlements: TripSettlement[]
): Balance[] {
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  for (const expense of expenses) {
    paid.set(expense.paid_by, (paid.get(expense.paid_by) ?? 0) + expense.total_amount);
    for (const split of expense.splits) {
      share.set(split.person, (share.get(split.person) ?? 0) + split.amount);
    }
  }
  // A settlement payment reduces the payer's debt and what the receiver is owed.
  const settled = new Map<string, number>();
  for (const settlement of settlements) {
    settled.set(
      settlement.from_person,
      (settled.get(settlement.from_person) ?? 0) + settlement.amount
    );
    settled.set(
      settlement.to_person,
      (settled.get(settlement.to_person) ?? 0) - settlement.amount
    );
  }
  return TRIP_MEMBERS.map((person) => {
    const paidValue = paid.get(person) ?? 0;
    const shareValue = share.get(person) ?? 0;
    const settledValue = settled.get(person) ?? 0;
    return {
      person,
      paid: paidValue,
      share: shareValue,
      net: Math.round((paidValue - shareValue + settledValue) * 100) / 100,
    };
  });
}

// Greedy settle-up: match biggest debtor to biggest creditor until cleared.
function computeSettlements(balances: Balance[]): Settlement[] {
  const debtors = balances
    .filter((balance) => balance.net < -0.01)
    .map((balance) => ({ person: balance.person, amount: -balance.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((balance) => balance.net > 0.01)
    .map((balance) => ({ person: balance.person, amount: balance.net }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].person,
        to: creditors[j].person,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount <= 0.01) i += 1;
    if (creditors[j].amount <= 0.01) j += 1;
  }
  return settlements;
}

export function TripSplitApp({
  initialExpenses,
  initialSettlements,
}: TripSplitAppProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<TripMember>(TRIP_MEMBERS[0]);
  const [date, setDate] = useState(todayISO());
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [included, setIncluded] = useState<Record<TripMember, boolean>>(() =>
    Object.fromEntries(TRIP_MEMBERS.map((member) => [member, true])) as Record<
      TripMember,
      boolean
    >
  );
  const [customAmounts, setCustomAmounts] = useState<Record<TripMember, string>>(
    () =>
      Object.fromEntries(TRIP_MEMBERS.map((member) => [member, ""])) as Record<
        TripMember,
        string
      >
  );

  const [payFrom, setPayFrom] = useState<TripMember>(TRIP_MEMBERS[1]);
  const [payTo, setPayTo] = useState<TripMember>(TRIP_MEMBERS[0]);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());

  const totalAmount = Number.parseFloat(amount) || 0;

  const previewSplits = useMemo(() => {
    if (splitMode === "equal") {
      const members = TRIP_MEMBERS.filter((member) => included[member]);
      const shares = equalShares(totalAmount, members);
      return TRIP_MEMBERS.map((member) => ({
        person: member,
        amount: shares.get(member) ?? 0,
      }));
    }
    return TRIP_MEMBERS.map((member) => ({
      person: member,
      amount: Number.parseFloat(customAmounts[member]) || 0,
    }));
  }, [splitMode, included, customAmounts, totalAmount]);

  const splitTotal = previewSplits.reduce((sum, split) => sum + split.amount, 0);
  const remaining = Math.round((totalAmount - splitTotal) * 100) / 100;

  const balances = useMemo(
    () => computeBalances(initialExpenses, initialSettlements),
    [initialExpenses, initialSettlements]
  );
  const settlements = useMemo(() => computeSettlements(balances), [balances]);
  const grandTotal = initialExpenses.reduce(
    (sum, expense) => sum + expense.total_amount,
    0
  );

  function resetForm() {
    setDescription("");
    setAmount("");
    setPaidBy(TRIP_MEMBERS[0]);
    setDate(todayISO());
    setSplitMode("equal");
    setIncluded(
      Object.fromEntries(TRIP_MEMBERS.map((member) => [member, true])) as Record<
        TripMember,
        boolean
      >
    );
    setCustomAmounts(
      Object.fromEntries(TRIP_MEMBERS.map((member) => [member, ""])) as Record<
        TripMember,
        string
      >
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!description.trim()) {
      toast.error("Add a description");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    const splits = previewSplits.filter((split) => split.amount > 0);
    if (splits.length === 0) {
      toast.error("Add at least one person's share");
      return;
    }
    if (Math.abs(remaining) > 0.01) {
      toast.error("Shares must add up to the total");
      return;
    }

    startTransition(async () => {
      try {
        await createTripExpense({
          description: description.trim(),
          total_amount: totalAmount,
          paid_by: paidBy,
          expense_date: date,
          splits,
        });
        resetForm();
        toast.success("Expense added");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add expense");
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteTripExpense(id);
        toast.success("Expense deleted");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete");
      } finally {
        setDeletingId(null);
      }
    });
  }

  function handleRecordPayment(event: FormEvent) {
    event.preventDefault();
    if (payFrom === payTo) {
      toast.error("Payer and receiver must be different");
      return;
    }
    const value = Number.parseFloat(payAmount) || 0;
    if (value <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    startTransition(async () => {
      try {
        await createTripSettlement({
          from_person: payFrom,
          to_person: payTo,
          amount: value,
          settled_date: payDate,
        });
        setPayAmount("");
        setPayDate(todayISO());
        toast.success("Payment recorded");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not record payment");
      }
    });
  }

  function handleDeleteSettlement(id: string) {
    if (!window.confirm("Remove this payment?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteTripSettlement(id);
        toast.success("Payment removed");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove");
      } finally {
        setDeletingId(null);
      }
    });
  }

  function applyEqualToAll() {
    setSplitMode("equal");
    setIncluded(
      Object.fromEntries(TRIP_MEMBERS.map((member) => [member, true])) as Record<
        TripMember,
        boolean
      >
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 pb-16 pt-6 sm:max-w-lg">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Wallet className="size-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Trip Spendings
          </span>
        </div>
        <h1 className="text-2xl font-bold leading-tight">Uttarakhand Diaries</h1>
        <p className="text-sm font-medium text-foreground/80">
          Nainital · Almora · Kainchi Dham · Mukteshwar · Bhimtal
        </p>
        <p className="text-sm italic text-muted-foreground">
          &ldquo;The mountains are calling &amp; we must go.&rdquo;
        </p>
        <p className="text-xs text-muted-foreground">
          Thulunga, Jayshree &amp; Pragati — anyone can add an expense.
        </p>
      </header>

      {/* Balances */}
      <section className="order-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4" aria-hidden="true" />
            Balances
          </div>
          <span className="text-xs text-muted-foreground">
            Total spent {formatMoney(grandTotal)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {balances.map((balance) => {
            const settled = Math.abs(balance.net) < 0.01;
            const positive = balance.net > 0;
            return (
              <div
                key={balance.person}
                className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 p-2 text-center"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {balance.person}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    settled
                      ? "text-muted-foreground"
                      : positive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {settled
                    ? "settled"
                    : `${positive ? "+" : "-"}${formatMoney(Math.abs(balance.net))}`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {positive ? "gets back" : settled ? "all clear" : "owes"}
                </span>
                <span className="mt-0.5 border-t border-foreground/10 pt-0.5 text-[10px] font-medium tabular-nums text-foreground/70">
                  cost {formatMoney(balance.share)}
                </span>
              </div>
            );
          })}
        </div>

        {settlements.length > 0 ? (
          <div className="mt-3 space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Settle up</p>
            {settlements.map((settlement, index) => (
              <div
                key={`${settlement.from}-${settlement.to}-${index}`}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{settlement.from}</span>
                  <span className="text-muted-foreground"> pays </span>
                  <span className="font-medium">{settlement.to}</span>
                </span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(settlement.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Record a payment (settle up) */}
      <form
        onSubmit={handleRecordPayment}
        className="order-3 flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftRight className="size-4" aria-hidden="true" />
          Record a payment
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">From</span>
            <select
              value={payFrom}
              onChange={(event) => setPayFrom(event.target.value as TripMember)}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {TRIP_MEMBERS.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">To</span>
            <select
              value={payTo}
              onChange={(event) => setPayTo(event.target.value as TripMember)}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {TRIP_MEMBERS.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Amount (₹)</span>
            <input
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Date</span>
            <input
              type="date"
              value={payDate}
              onChange={(event) => setPayDate(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-600 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowLeftRight className="size-4" aria-hidden="true" />
          )}
          Record payment
        </button>

        {initialSettlements.length > 0 ? (
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Payments made</p>
            {initialSettlements.map((settlement) => (
              <div
                key={settlement.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{settlement.from_person}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-medium">{settlement.to_person}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDate(settlement.settled_date)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">
                    {formatMoney(settlement.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSettlement(settlement.id)}
                    disabled={isPending && deletingId === settlement.id}
                    aria-label="Remove payment"
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"
                  >
                    {isPending && deletingId === settlement.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    )}
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </form>

      {/* Add expense form */}
      <form
        onSubmit={handleSubmit}
        className="order-2 flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="size-4" aria-hidden="true" />
          Add expense
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Description</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Lunch at the beach"
            className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Amount (₹)</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Paid by</span>
          <div className="grid grid-cols-3 gap-2">
            {TRIP_MEMBERS.map((member) => (
              <button
                key={member}
                type="button"
                onClick={() => setPaidBy(member)}
                className={cn(
                  "h-11 rounded-lg border text-sm font-medium transition-colors",
                  paidBy === member
                    ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
                    : "border-input bg-transparent hover:bg-muted"
                )}
              >
                {member}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Split</span>
            <div className="inline-flex rounded-lg border border-input p-0.5">
              <button
                type="button"
                onClick={applyEqualToAll}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  splitMode === "equal"
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Equal
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("custom")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  splitMode === "custom"
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Custom
              </button>
            </div>
          </div>

          {splitMode === "equal" ? (
            <div className="grid grid-cols-3 gap-2">
              {TRIP_MEMBERS.map((member) => {
                const share = previewSplits.find((split) => split.person === member);
                const active = included[member];
                return (
                  <button
                    key={member}
                    type="button"
                    onClick={() =>
                      setIncluded((prev) => ({ ...prev, [member]: !prev[member] }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm transition-colors",
                      active
                        ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
                        : "border-input bg-transparent text-muted-foreground"
                    )}
                  >
                    <span className="font-medium">{member}</span>
                    <span className="text-xs tabular-nums">
                      {active ? formatMoney(share?.amount ?? 0) : "excluded"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {TRIP_MEMBERS.map((member) => (
                <label
                  key={member}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="font-medium">{member}</span>
                  <input
                    value={customAmounts[member]}
                    onChange={(event) =>
                      setCustomAmounts((prev) => ({
                        ...prev,
                        [member]: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                    placeholder="0"
                    className="h-10 w-28 rounded-lg border border-input bg-transparent px-3 text-right text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </label>
              ))}
            </div>
          )}

          <div
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
              Math.abs(remaining) < 0.01
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            )}
          >
            <span>Assigned {formatMoney(splitTotal)}</span>
            <span>
              {Math.abs(remaining) < 0.01
                ? "Balanced"
                : `${remaining > 0 ? "Left" : "Over"} ${formatMoney(Math.abs(remaining))}`}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add expense
        </button>
      </form>

      {/* Expense history */}
      <section className="order-4 flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold">History</h2>
        {initialExpenses.length === 0 ? (
          <p className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
            No expenses yet. Add the first one above.
          </p>
        ) : (
          initialExpenses.map((expense) => (
            <article
              key={expense.id}
              className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(expense.expense_date)} · Paid by{" "}
                    <span className="font-medium text-foreground">
                      {expense.paid_by}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">
                    {formatMoney(expense.total_amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(expense.id)}
                    disabled={isPending && deletingId === expense.id}
                    aria-label="Delete expense"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"
                  >
                    {isPending && deletingId === expense.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {expense.splits.map((split) => (
                  <span
                    key={`${expense.id}-${split.person}`}
                    className="rounded-full bg-muted/60 px-2.5 py-1 text-xs"
                  >
                    {split.person} {formatMoney(split.amount)}
                  </span>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
