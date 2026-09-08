import { DashboardShell } from "@/components/DashboardShell";
import { CashFlowView } from "@/components/views/CashFlowView";

export const dynamic = "force-dynamic";

export default function CashFlowPage() {
  return (
    <DashboardShell>
      <CashFlowView />
    </DashboardShell>
  );
}
