import { DashboardShell } from "@/components/DashboardShell";
import { ExpensesView } from "@/components/views/ExpensesView";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  return (
    <DashboardShell>
      <ExpensesView />
    </DashboardShell>
  );
}
