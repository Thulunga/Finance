"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, WalletCards, X } from "lucide-react";

import { DesktopSidebar, SidebarBrand, SidebarNav } from "@/components/AppSidebar";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppFrameProps = Readonly<{
  user: { email: string; userCode: string; avatarPath: string | null } | null;
  children: React.ReactNode;
}>;

function isAuthRoute(pathname: string) {
  return pathname.startsWith("/login") || pathname.startsWith("/join");
}

export function AppFrame({ user, children }: AppFrameProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  if (isAuthRoute(pathname)) {
    return <div className="flex min-h-screen flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,theme(colors.emerald.100/0.5),transparent_36%),linear-gradient(180deg,theme(colors.background),theme(colors.muted/0.3))] dark:bg-[radial-gradient(circle_at_top_left,theme(colors.emerald.950/0.4),transparent_34%),linear-gradient(180deg,theme(colors.background),theme(colors.muted/0.15))]">
      <DesktopSidebar />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={closeMobile}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-card shadow-xl">
            <div className="flex items-center justify-between border-b pr-2">
              <SidebarBrand onNavigate={closeMobile} />
              <Button
                size="icon"
                type="button"
                variant="ghost"
                aria-label="Close navigation"
                onClick={closeMobile}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <SidebarNav onNavigate={closeMobile} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col lg:pl-60">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                size="icon"
                type="button"
                variant="outline"
                className="lg:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="size-4" aria-hidden="true" />
              </Button>
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950">
                  <WalletCards className="size-4" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold">Finance</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {user ? (
                <ProfileMenu
                  email={user.email}
                  userCode={user.userCode}
                  avatarPath={user.avatarPath}
                />
              ) : null}
            </div>
          </div>
        </header>

        <main className={cn("mx-auto w-full max-w-6xl flex-1 p-3 sm:p-6")}>{children}</main>

        <footer className="border-t bg-background/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="font-medium text-foreground">Personal Finance Tracker</span>
            <span>Budgets, cash flow, and shared expenses · © 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
