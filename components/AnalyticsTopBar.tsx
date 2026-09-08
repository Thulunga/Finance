"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function AnalyticsTopBar() {
  const { monthYear, selectMonth, isLoadingMonth } = useDashboard();

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card/70 p-4 shadow-sm sm:p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Button render={<Link href="/" />} size="sm" type="button" variant="ghost">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{monthFormatter.format(new Date(`${monthYear}-01T00:00:00Z`))}</Badge>
          {isLoadingMonth ? <Badge variant="outline">Loading</Badge> : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
      </div>

      <Input
        aria-label="Analytics month"
        className="w-full sm:w-[10rem]"
        type="month"
        value={monthYear}
        onChange={(event) => selectMonth(event.target.value)}
      />
    </section>
  );
}
