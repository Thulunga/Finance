import { DashboardShell } from "@/components/DashboardShell";
import { AssetsView } from "@/components/views/AssetsView";

export const dynamic = "force-dynamic";

export default function AssetsPage() {
  return (
    <DashboardShell>
      <AssetsView />
    </DashboardShell>
  );
}
