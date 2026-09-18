"use client";

import { startTransition, useState } from "react";
import { Check, CreditCard, LoaderCircle, ReceiptText, WalletCards } from "lucide-react";

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
  const [isCommitting, setIsCommitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const canSubmit =
    Boolean(date && description.trim() && category && totalAmount > 0) && !isCommitting;

  function resetForm() {
    setDate(getToday());
    setDescription("");
    setCategory(categoryOptions[0] ?? "");
    setTotalAmount(0);
    setIsCreditCard(false);
    setIsCreditCardPayment(false);
  }

  function handleSubmit() {
    if (!canSubmit) return;

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
        });

        addExpense(savedExpense);
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
          <CardDescription>Record a personal expense.</CardDescription>
        </div>
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
          <p className="font-mono text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            Amount: {formatCurrency(totalAmount)}
          </p>
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
              <span className="flex items-center gap-1.5 font-medium">
                <CreditCard className="size-4" aria-hidden="true" />
                Paid by credit card
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Counts toward the budget, but does not reduce liquid cash.
              </span>
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
              <span className="flex items-center gap-1.5 font-medium">
                <WalletCards className="size-4" aria-hidden="true" />
                Credit card bill payment
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Deducts liquid cash and reduces your card due.
              </span>
            </span>
          </label>
        </div>

        <Button className="w-full" disabled={!canSubmit} type="button" onClick={handleSubmit}>
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
