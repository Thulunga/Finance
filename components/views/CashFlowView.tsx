"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { CashFlowEntryForms } from "@/components/CashFlowEntryForms";
import { CashFlowManager } from "@/components/CashFlowManager";
import { PageHeader } from "@/components/PageHeader";
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

export function CashFlowView() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Cash flow"
        description="Track income, allocations, and what stays liquid each month."
        actions={
          <>
            <SectionVisibilityToggle label="cash flow" section="cash-flow" />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" />}>
                <Plus className="size-4" aria-hidden="true" />
                Add cash flow
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add cash flow</DialogTitle>
                  <DialogDescription>Record income or move money into an investment or emergency fund.</DialogDescription>
                </DialogHeader>
                <CashFlowEntryForms onCompleted={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <CashFlowManager />
    </div>
  );
}
