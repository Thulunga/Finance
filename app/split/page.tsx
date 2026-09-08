import { DashboardShell } from "@/components/DashboardShell";
import { SplitView } from "@/components/views/SplitView";

export const dynamic = "force-dynamic";

export default function SplitPage() {
  return (
    <DashboardShell>
      <SplitView />
    </DashboardShell>
  );
}
