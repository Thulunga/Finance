"use client";

import { PageHeader } from "@/components/PageHeader";
import { SplitManager } from "@/components/SplitManager";

export function SplitView() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Receivables"
        description="Review and settle money friends owe you, or what you owe them."
        showMonth={false}
      />
      <SplitManager />
    </div>
  );
}
