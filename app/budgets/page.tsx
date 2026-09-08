import { DashboardShell } from "@/components/DashboardShell";
import { BudgetsView } from "@/components/views/BudgetsView";

export const dynamic = "force-dynamic";

export default function BudgetsPage() {
  return (
    <DashboardShell>
      <BudgetsView />
    </DashboardShell>
  );
}
