"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { ExpenseForm } from "@/components/ExpenseForm";
import { PageHeader } from "@/components/PageHeader";
import { RecentTransactions } from "@/components/RecentTransactions";
import { SectionVisibilityToggle } from "@/components/SectionVisibilityToggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ExpensesView() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Expenses"
        description="Record personal spending and split costs with friends or groups."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" />}>
              <Plus className="size-4" aria-hidden="true" />
              Add expense
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add expense</DialogTitle>
                <DialogDescription>Record a personal expense or split it with friends.</DialogDescription>
              </DialogHeader>
              <ExpenseForm onCompleted={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Transactions</h2>
            <p className="text-sm text-muted-foreground">Every expense recorded for the selected month.</p>
          </div>
          <SectionVisibilityToggle label="transactions" section="transactions" />
        </div>
        <RecentTransactions />
      </section>
    </div>
  );
}
