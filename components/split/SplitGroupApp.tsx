"use client";

import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Check,
  Loader2,
  Lock,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import {
  addSplitExpense,
  addSplitMember,
  addSplitSettlement,
  deleteSplitExpense,
  deleteSplitSettlement,
  removeSplitMember,
} from "@/app/actions/splitGroupActions";
import {
  computeBalances,
  computeSettlements,
  equalShares,
  formatDate,
  formatMoney,
  todayISO,
  type SplitGroupData,
} from "@/lib/splitGroups";
import { cn } from "@/lib/utils";

type SplitGroupAppProps = Readonly<{
  slug: string;
  passcode: string | null;
  data: SplitGroupData;
  onChanged: () => Promise<void>;
}>;

type SplitMode = "equal" | "custom";

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SplitGroupApp({ slug, passcode, data, onChanged }: SplitGroupAppProps) {
  const { group } = data;
  const currency = group.currency;
  const memberNames = useMemo(
    () => data.members.map((member) => member.name),
    [data.members]
  );

  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const firstMember = memberNames[0] ?? "";

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(firstMember);
  const [date, setDate] = useState(todayISO());
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const [payFrom, setPayFrom] = useState(memberNames[1] ?? firstMember);
  const [payTo, setPayTo] = useState(firstMember);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());

  const [newMember, setNewMember] = useState("");

  const isIncluded = (name: string) => included[name] ?? true;
  const effectivePaidBy = memberNames.includes(paidBy) ? paidBy : firstMember;

  const totalAmount = Number.parseFloat(amount) || 0;

  const previewSplits = useMemo(() => {
    if (splitMode === "equal") {
      const active = memberNames.filter((name) => isIncluded(name));
      const shares = equalShares(totalAmount, active);
      return memberNames.map((name) => ({
        person: name,
        amount: shares.get(name) ?? 0,
      }));
    }
    return memberNames.map((name) => ({
      person: name,
      amount: Number.parseFloat(customAmounts[name] ?? "") || 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitMode, included, customAmounts, totalAmount, memberNames]);

  const splitTotal = previewSplits.reduce((sum, split) => sum + split.amount, 0);
  const remaining = Math.round((totalAmount - splitTotal) * 100) / 100;

  const balances = useMemo(
    () => computeBalances(data.members, data.expenses, data.settlements),
    [data.members, data.expenses, data.settlements]
  );
  const suggestions = useMemo(() => computeSettlements(balances), [balances]);
  const grandTotal = data.expenses.reduce(
    (sum, expense) => sum + expense.total_amount,
    0
  );

  function refresh() {
    return onChanged();
  }

  function resetExpenseForm() {
    setDescription("");
    setAmount("");
    setPaidBy(firstMember);
    setDate(todayISO());
    setSplitMode("equal");
    setIncluded({});
    setCustomAmounts({});
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: group.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  function handleAddExpense(event: FormEvent) {
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
        await addSplitExpense({
          slug,
          passcode,
          description: description.trim(),
          total_amount: totalAmount,
          paid_by: effectivePaidBy,
          expense_date: date,
          splits,
        });
        resetExpenseForm();
        await refresh();
        toast.success("Expense added");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add expense");
      }
    });
  }

  function handleDeleteExpense(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    setBusyId(id);
    startTransition(async () => {
      try {
        await deleteSplitExpense({ slug, passcode, expenseId: id });
        await refresh();
        toast.success("Expense deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete");
      } finally {
        setBusyId(null);
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
        await addSplitSettlement({
          slug,
          passcode,
          from_person: payFrom,
          to_person: payTo,
          amount: value,
          settled_date: payDate,
        });
        setPayAmount("");
        setPayDate(todayISO());
        await refresh();
        toast.success("Payment recorded");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not record payment");
      }
    });
  }

  function handleDeleteSettlement(id: string) {
    if (!window.confirm("Remove this payment?")) return;
    setBusyId(id);
    startTransition(async () => {
      try {
        await deleteSplitSettlement({ slug, passcode, settlementId: id });
        await refresh();
        toast.success("Payment removed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove");
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleAddMember(event: FormEvent) {
    event.preventDefault();
    if (!newMember.trim()) {
      toast.error("Enter a name");
      return;
    }
    startTransition(async () => {
      try {
        await addSplitMember({ slug, passcode, name: newMember.trim() });
        setNewMember("");
        await refresh();
        toast.success("Person added");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add person");
      }
    });
  }

  function handleRemoveMember(memberId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this group?`)) return;
    setBusyId(memberId);
    startTransition(async () => {
      try {
        await removeSplitMember({ slug, passcode, memberId });
        await refresh();
        toast.success("Person removed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove person");
      } finally {
        setBusyId(null);
      }
    });
  }

  const balanced = Math.abs(remaining) < 0.01;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Wallet className="size-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Split Group
            </span>
            {group.has_passcode ? (
              <span
                className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                title="Protected by a passcode"
              >
                <Lock className="size-3" aria-hidden="true" />
                Protected
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.members.length} {data.members.length === 1 ? "person" : "people"} ·
            Total spent {formatMoney(grandTotal, currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <Share2 className="size-4" aria-hidden="true" />
            )}
            Share link
          </button>
          <Link
            href="/split-groups"
            className="flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Plus className="size-4" aria-hidden="true" />
            New group
          </Link>
        </div>
      </header>

      {/* Balances + settle-up */}
      <section className="mb-6 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" aria-hidden="true" />
          Balances
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {balances.map((balance) => {
            const settled = Math.abs(balance.net) < 0.01;
            const positive = balance.net > 0;
            return (
              <div
                key={balance.person}
                className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-3 text-center"
              >
                <span className="max-w-full truncate text-xs font-medium text-muted-foreground">
                  {balance.person}
                </span>
                <span
                  className={cn(
                    "text-base font-semibold tabular-nums",
                    settled
                      ? "text-muted-foreground"
                      : positive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {settled
                    ? "settled"
                    : `${positive ? "+" : "-"}${formatMoney(Math.abs(balance.net), currency)}`}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {settled ? "all clear" : positive ? "gets back" : "owes"}
                </span>
                <span className="mt-0.5 border-t border-foreground/10 pt-0.5 text-[10px] font-medium tabular-nums text-foreground/70">
                  cost {formatMoney(balance.share, currency)}
                </span>
              </div>
            );
          })}
        </div>

        {suggestions.length > 0 ? (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Suggested settle-up
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((settlement, index) => (
                <div
                  key={`${settlement.from}-${settlement.to}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{settlement.from}</span>
                    <span className="text-muted-foreground"> pays </span>
                    <span className="font-medium">{settlement.to}</span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(settlement.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Two-column working area on desktop */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          {/* Add expense */}
          <form
            onSubmit={handleAddExpense}
            className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
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
                placeholder="e.g. Dinner, cab, tickets"
                className={inputClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Amount</span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Paid by</span>
              <div className="flex flex-wrap gap-2">
                {memberNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPaidBy(name)}
                    className={cn(
                      "h-10 rounded-lg border px-3 text-sm font-medium transition-colors",
                      effectivePaidBy === name
                        ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
                        : "border-input bg-transparent hover:bg-muted"
                    )}
                  >
                    {name}
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
                    onClick={() => {
                      setSplitMode("equal");
                      setIncluded({});
                    }}
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {memberNames.map((name) => {
                    const share = previewSplits.find((split) => split.person === name);
                    const active = isIncluded(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() =>
                          setIncluded((prev) => ({
                            ...prev,
                            [name]: !(prev[name] ?? true),
                          }))
                        }
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm transition-colors",
                          active
                            ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
                            : "border-input bg-transparent text-muted-foreground"
                        )}
                      >
                        <span className="max-w-full truncate font-medium">{name}</span>
                        <span className="text-xs tabular-nums">
                          {active ? formatMoney(share?.amount ?? 0, currency) : "excluded"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {memberNames.map((name) => (
                    <label key={name} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">{name}</span>
                      <input
                        value={customAmounts[name] ?? ""}
                        onChange={(event) =>
                          setCustomAmounts((prev) => ({
                            ...prev,
                            [name]: event.target.value,
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
                  balanced
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                )}
              >
                <span>Assigned {formatMoney(splitTotal, currency)}</span>
                <span>
                  {balanced
                    ? "Balanced"
                    : `${remaining > 0 ? "Left" : "Over"} ${formatMoney(Math.abs(remaining), currency)}`}
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

          {/* Record a payment */}
          <form
            onSubmit={handleRecordPayment}
            className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10"
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
                  onChange={(event) => setPayFrom(event.target.value)}
                  className={inputClass}
                >
                  {memberNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">To</span>
                <select
                  value={payTo}
                  onChange={(event) => setPayTo(event.target.value)}
                  className={inputClass}
                >
                  {memberNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Amount</span>
                <input
                  value={payAmount}
                  onChange={(event) => setPayAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Date</span>
                <input
                  type="date"
                  value={payDate}
                  onChange={(event) => setPayDate(event.target.value)}
                  className={inputClass}
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

            {data.settlements.length > 0 ? (
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Payments made</p>
                {data.settlements.map((settlement) => (
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
                        {formatMoney(settlement.amount, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSettlement(settlement.id)}
                        disabled={isPending && busyId === settlement.id}
                        aria-label="Remove payment"
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"
                      >
                        {isPending && busyId === settlement.id ? (
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

          {/* Members */}
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="size-4" aria-hidden="true" />
              People
            </div>
            <div className="flex flex-wrap gap-2">
              {data.members.map((member) => (
                <span
                  key={member.id}
                  className="flex items-center gap-1.5 rounded-full bg-muted/60 py-1 pl-3 pr-1 text-sm"
                >
                  {member.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    disabled={isPending && busyId === member.id}
                    aria-label={`Remove ${member.name}`}
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"
                  >
                    {isPending && busyId === member.id ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-3" aria-hidden="true" />
                    )}
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleAddMember} className="flex items-center gap-2">
              <input
                value={newMember}
                onChange={(event) => setNewMember(event.target.value)}
                placeholder="Add a person"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={isPending}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold">History</h2>
          {data.expenses.length === 0 ? (
            <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              No expenses yet. Add the first one on the left.
            </p>
          ) : (
            data.expenses.map((expense) => (
              <article
                key={expense.id}
                className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
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
                      {formatMoney(expense.total_amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(expense.id)}
                      disabled={isPending && busyId === expense.id}
                      aria-label="Delete expense"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40"
                    >
                      {isPending && busyId === expense.id ? (
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
                      {split.person} {formatMoney(split.amount, currency)}
                    </span>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
