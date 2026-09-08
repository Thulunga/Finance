"use client";

import { CalendarRange, LoaderCircle } from "lucide-react";

import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Shared page heading with the month selector and an optional actions slot. */
export function PageHeader({
  title,
  description,
  showMonth = true,
  actions,
}: Readonly<{
  title: string;
  description?: string;
  showMonth?: boolean;
  actions?: React.ReactNode;
}>) {
  const { monthYear, selectMonth, isLoadingMonth } = useDashboard();

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card/70 p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1.5">
        {showMonth ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-lg">
              <CalendarRange aria-hidden="true" />
              {monthFormatter.format(new Date(`${monthYear}-01T00:00:00Z`))}
            </Badge>
            {isLoadingMonth ? (
              <Badge variant="outline">
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                Loading
              </Badge>
            ) : null}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
        {showMonth ? (
          <Input
            aria-label="Selected month"
            className="min-w-0 flex-1 sm:w-[10rem] sm:flex-none"
            type="month"
            value={monthYear}
            onChange={(event) => selectMonth(event.target.value)}
          />
        ) : null}
        {actions}
      </div>
    </section>
  );
}
