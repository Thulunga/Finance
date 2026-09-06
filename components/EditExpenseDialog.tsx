"use client";

import { useState } from "react";
import type { ExpenseWithSplits } from "@/components/DashboardProvider";
import { useDashboard } from "@/components/DashboardProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EditExpenseDialog({ expense, open, onClose }: Readonly<{ expense: ExpenseWithSplits | null; open: boolean; onClose: () => void }>) {
  const { categories, editExpense } = useDashboard();
  const [date, setDate] = useState(expense?.date ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [totalAmount, setTotalAmount] = useState(expense?.total_amount ?? 0);
  const [isCreditCard, setIsCreditCard] = useState(expense?.is_credit_card ?? false);
  const [isCreditCardPayment, setIsCreditCardPayment] = useState(expense?.is_credit_card_payment ?? false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expense) return;
    editExpense({ id: expense.id, date, description, category, total_amount: totalAmount, is_credit_card: isCreditCard || isCreditCardPayment, is_credit_card_payment: isCreditCardPayment });
    onClose();
  }

  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}><DialogContent><DialogHeader><DialogTitle>Edit expense</DialogTitle><DialogDescription>Update the recorded expense details.</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={submit}><Input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /><Input required value={description} onChange={(event) => setDescription(event.target.value)} /><Select value={category} onValueChange={(value) => setCategory(value ?? "")}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Input required min="0.01" step="0.01" type="number" placeholder="Amount in INR" value={totalAmount || ""} onChange={(event) => setTotalAmount(Number(event.target.value || 0))} /><label className="flex items-center gap-2 text-sm"><input checked={isCreditCard} disabled={isCreditCardPayment} className="size-4 accent-emerald-600" type="checkbox" onChange={(event) => setIsCreditCard(event.target.checked)} />Paid by credit card</label><label className="flex items-center gap-2 text-sm"><input checked={isCreditCardPayment} className="size-4 accent-emerald-600" type="checkbox" onChange={(event) => { setIsCreditCardPayment(event.target.checked); if (event.target.checked) setIsCreditCard(false); }} />Credit card bill payment</label><Button className="w-full" type="submit">Save changes</Button></form></DialogContent></Dialog>;
}