"use client";

import { startTransition, useMemo, useState } from "react";
import { Check, CircleHelp, CreditCard, LoaderCircle, Plus, ReceiptText, Trash2, Users, WalletCards } from "lucide-react";

import { createExpense } from "@/app/actions/expenseActions";
import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FALLBACK_CATEGORIES = [
  "Rent & Utilities",
  "Food & Groceries",
  "Travel & Fuel",
  "Lifestyle & Dining",
  "Discretionary",
];

type FriendSplit = {
  id: string;
  friend_name: string;
  friend_user_id: string | null;
  amount_owed: number;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function createSplitRow(): FriendSplit {
  return {
    id: crypto.randomUUID(),
    friend_name: "",
    friend_user_id: null,
    amount_owed: 0,
  };
}

function FriendPicker({
  value,
  disabled,
  onSelect,
}: Readonly<{
  value: string;
  disabled?: boolean;
  onSelect: (name: string, userId: string | null) => void;
}>) {
  const { friends } = useDashboard();
  const [open, setOpen] = useState(false);
  const filtered = friends.filter((friend) =>
    friend.user_code.toLowerCase().includes(value.trim().toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Input
            disabled={disabled}
            placeholder="Friend name or user code"
            value={value}
            onChange={(event) => {
              onSelect(event.target.value, null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        }
      />
      {friends.length > 0 ? (
        <PopoverContent align="start" className="w-64 p-1">
          {filtered.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">No matching friends. You can still type a name.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((friend) => (
                <button
                  key={friend.user_id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onSelect(friend.user_code, friend.user_id);
                    setOpen(false);
                  }}
                >
                  <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {friend.user_code}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

export function ExpenseForm({
  onCompleted,
}: Readonly<{ onCompleted?: () => void }>) {
  const { categories, addExpense } = useDashboard();
  const categoryOptions = categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const [date, setDate] = useState(getToday());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categoryOptions[0] ?? "");
  const [totalAmount, setTotalAmount] = useState(0);
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [isCreditCardPayment, setIsCreditCardPayment] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [splits, setSplits] = useState<FriendSplit[]>([createSplitRow()]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const friendTotal = useMemo(
    () => splits.reduce((total, split) => total + split.amount_owed, 0),
    [splits]
  );
  const myShare = Math.max(totalAmount - (isShared ? friendTotal : 0), 0);
  const splitExceedsTotal = isShared && friendTotal > totalAmount;
  const canSubmit =
    Boolean(date && description.trim() && category && totalAmount > 0) &&
    !splitExceedsTotal &&
    !isCommitting;

  function updateSplit(id: string, nextSplit: Partial<FriendSplit>) {
    setStatus("idle");
    setSplits((current) =>
      current.map((split) =>
        split.id === id ? { ...split, ...nextSplit } : split
      )
    );
  }

  function splitEqually() {
    if (splits.length === 0 || totalAmount <= 0) {
      return;
    }

    const peopleCount = splits.length + 1;
    const friendShare = Math.floor((totalAmount * 100) / peopleCount) / 100;

    setStatus("idle");
    setSplits((current) =>
      current.map((split) => ({ ...split, amount_owed: friendShare }))
    );
  }

  function resetForm() {
    setDate(getToday());
    setDescription("");
    setCategory(categoryOptions[0] ?? "");
    setTotalAmount(0);
    setIsCreditCard(false);
    setIsCreditCardPayment(false);
    setIsShared(false);
    setSplits([createSplitRow()]);
  }

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsCommitting(true);
    setStatus("idle");

    startTransition(async () => {
      try {
        const savedExpense = await createExpense({
          date,
          description,
          total_amount: totalAmount,
          is_credit_card: isCreditCard || isCreditCardPayment,
          is_credit_card_payment: isCreditCardPayment,
          category,
          is_shared: isShared,
          my_share: isShared ? myShare : totalAmount,
          splits: isShared
            ? splits.map((split) => ({
                friend_name: split.friend_name,
                amount_owed: split.amount_owed,
                friend_user_id: split.friend_user_id,
              }))
            : undefined,
        });

        addExpense({ ...savedExpense, split_receivables: savedExpense.split_receivables });
        resetForm();
        setStatus("saved");
        onCompleted?.();
      } catch {
        setStatus("error");
      } finally {
        setIsCommitting(false);
      }
    });
  }

  return (
    <Card className="border-sky-900/10 bg-card/95 shadow-sm dark:border-sky-300/10">
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Expense entry</CardTitle>
            {status === "saved" ? (
              <Badge className="bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950">
                <Check className="size-3" aria-hidden="true" />
                Saved
              </Badge>
            ) : null}
            {status === "error" ? <Badge variant="destructive">Not saved</Badge> : null}
          </div>
          <CardDescription>
            Add personal expenses and calculate friend splits before saving.
          </CardDescription>
        </div>

        <Popover>
          <PopoverTrigger render={<Button type="button" variant="outline" />}>
            <CircleHelp className="size-4" aria-hidden="true" />
            Split rules
          </PopoverTrigger>
          <PopoverContent align="end">
            <PopoverHeader>
              <PopoverTitle>Net share</PopoverTitle>
              <PopoverDescription>
                Your share is total amount minus pending friend receivables.
              </PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            Date
            <Input
              disabled={isCommitting}
              type="date"
              value={date}
              onChange={(event) => {
                setStatus("idle");
                setDate(event.target.value);
              }}
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium sm:col-span-2 lg:col-span-1">
            Description
            <Input
              disabled={isCommitting}
              placeholder="Dinner, fuel, rent..."
              value={description}
              onChange={(event) => {
                setStatus("idle");
                setDescription(event.target.value);
              }}
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Category
            <Select
              disabled={isCommitting}
              value={category}
              onValueChange={(nextCategory) => {
                setStatus("idle");
                setCategory(nextCategory ?? "");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Total Amount
            <Input
              className="font-mono tabular-nums"
              disabled={isCommitting}
              min="0"
              step="0.01"
              type="number"
              value={totalAmount || ""}
              onChange={(event) => {
                setStatus("idle");
                setTotalAmount(Number(event.target.value || 0));
              }}
            />
          </label>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Split with Friends?</p>
              <p className="text-xs text-muted-foreground">
                Toggle on to track receivables against this expense.
              </p>
            </div>
            <Button
              disabled={isCommitting}
              type="button"
              variant={isShared ? "default" : "outline"}
              onClick={() => {
                setStatus("idle");
                setIsShared((current) => !current);
              }}
            >
              {isShared ? "Split on" : "Split off"}
            </Button>
          </div>

          {isShared ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  My Net Share: {formatCurrency(myShare)}
                </p>
                <Button
                  disabled={isCommitting || totalAmount <= 0 || splits.length === 0}
                  type="button"
                  variant="secondary"
                  onClick={splitEqually}
                >
                  Split Equally
                </Button>
              </div>

              <div className="grid gap-2">
                {splits.map((split) => (
                  <div
                    key={split.id}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-center"
                  >
                    <FriendPicker
                      disabled={isCommitting}
                      value={split.friend_name}
                      onSelect={(name, userId) =>
                        updateSplit(split.id, { friend_name: name, friend_user_id: userId })
                      }
                    />
                    <Input
                      className="font-mono tabular-nums"
                      disabled={isCommitting}
                      min="0"
                      step="0.01"
                      type="number"
                      value={split.amount_owed || ""}
                      onChange={(event) =>
                        updateSplit(split.id, {
                          amount_owed: Number(event.target.value || 0),
                        })
                      }
                    />
                    <Button
                      disabled={isCommitting || splits.length === 1}
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setSplits((current) =>
                          current.filter((item) => item.id !== split.id)
                        )
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">Remove friend split</span>
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  disabled={isCommitting}
                  type="button"
                  variant="outline"
                  onClick={() => setSplits((current) => [...current, createSplitRow()])}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add Friend
                </Button>
                {splitExceedsTotal ? (
                  <Badge variant="destructive">
                    Friend amounts exceed total
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono tabular-nums">
                    Friends owe {formatCurrency(friendTotal)}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 font-mono text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              My Net Share: {formatCurrency(totalAmount)}
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            checked={isCreditCard}
            disabled={isCreditCardPayment}
            className="mt-0.5 size-4 accent-emerald-600"
            type="checkbox"
            onChange={(event) => setIsCreditCard(event.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium"><CreditCard className="size-4" aria-hidden="true" />Paid by credit card</span>
            <span className="mt-1 block text-xs text-muted-foreground">Counts toward the budget, but does not reduce liquid cash.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            checked={isCreditCardPayment}
            className="mt-0.5 size-4 accent-emerald-600"
            type="checkbox"
            onChange={(event) => {
              setIsCreditCardPayment(event.target.checked);
              if (event.target.checked) setIsCreditCard(false);
            }}
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium"><WalletCards className="size-4" aria-hidden="true" />Credit card bill payment</span>
            <span className="mt-1 block text-xs text-muted-foreground">Deducts liquid cash and reduces your card due.</span>
          </span>
        </label>
        </div>

        <Button className="w-full" disabled={!canSubmit}
          type="button"
          onClick={handleSubmit}
        >
          {isCommitting ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ReceiptText className="size-4" aria-hidden="true" />
          )}
          {isCommitting ? "Saving expense" : "Save expense"}
        </Button>
      </CardContent>
    </Card>
  );
}