"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { AssetBalances } from "@/components/AssetBalances";
import { AssetEntryForms } from "@/components/AssetEntryForms";
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

export function AssetsView() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Assets"
        description="Track your EPF balance and fixed deposits outside daily cash flow."
        showMonth={false}
        actions={
          <>
            <SectionVisibilityToggle label="assets" section="assets" />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="flex-1 sm:flex-none" type="button" />}>
                <Plus className="size-4" aria-hidden="true" />
                Add asset
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add asset balance</DialogTitle>
                  <DialogDescription>Update your EPF balance or add a fixed deposit.</DialogDescription>
                </DialogHeader>
                <AssetEntryForms onCompleted={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <AssetBalances />
    </div>
  );
}
