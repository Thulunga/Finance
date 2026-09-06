"use client";

import { Eye, EyeOff } from "lucide-react";

import { useDashboard, type BalanceSection } from "@/components/DashboardProvider";
import { Button } from "@/components/ui/button";

export function SectionVisibilityToggle({
  section,
  label,
}: Readonly<{ section: BalanceSection; label: string }>) {
  const { sectionVisibility, toggleSectionVisibility } = useDashboard();
  const visible = sectionVisibility[section];

  return (
    <Button
      aria-label={visible ? `Hide ${label} balances` : `Show ${label} balances`}
      className="shrink-0"
      size="icon-sm"
      type="button"
      variant="ghost"
      onClick={() => toggleSectionVisibility(section)}
    >
      {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </Button>
  );
}
