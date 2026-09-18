"use client";

import { PageHeader } from "@/components/PageHeader";
import { SplitManager } from "@/components/SplitManager";

export function SplitView() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Receivables"
        description="Track and settle money others owe you."
        showMonth={false}
      />
      <SplitManager />
    </div>
  );
}
