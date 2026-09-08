"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { BudgetHealthCards } from "@/components/BudgetHealthCards";
import { BudgetManager } from "@/components/BudgetManager";
import { PageHeader } from "@/components/PageHeader";
import { useDashboard } from "@/components/DashboardProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BudgetsView() {
  const { monthYear } = useDashboard();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Budgets"
        description="Set category limits and track spending progress for the month."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" />}>
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Adjust budgets
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Monthly allocations</DialogTitle>
                <DialogDescription>Update category limits for {monthYear}. Changes apply instantly.</DialogDescription>
              </DialogHeader>
              <BudgetManager />
            </DialogContent>
          </Dialog>
        }
      />

      <BudgetHealthCards />
    </div>
  );
}
