"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  HandCoins,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Target,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type NavSection = {
  heading: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    heading: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Personal finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: ReceiptText },
      { href: "/cash-flow", label: "Cash flow", icon: Wallet },
      { href: "/budgets", label: "Budgets", icon: Target },
      { href: "/assets", label: "Assets", icon: Landmark },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    heading: "Shared",
    items: [
      { href: "/groups", label: "Groups", icon: Users },
      { href: "/split", label: "Receivables", icon: HandCoins },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3" aria-label="Primary">
      {navSections.map((section) => (
        <div key={section.heading} className="space-y-1">
          <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.heading}
          </p>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function SidebarBrand({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  return (
    <Link href="/" onClick={onNavigate} className="flex items-center gap-3 border-b px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950">
        <WalletCards className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">Finance</p>
        <p className="truncate text-xs text-muted-foreground">Money, together</p>
      </div>
    </Link>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-card/60 backdrop-blur-xl lg:flex">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  );
}
