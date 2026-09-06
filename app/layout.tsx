import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { CalendarDays, UserCircle, WalletCards } from "lucide-react";

import { ProfileMenu } from "@/components/ProfileMenu";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/utils/supabase/server";
import { Providers } from "@/app/providers";
import { getOrCreateProfile } from "@/lib/profile";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Track expenses, budgets, and shared receivables.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getUser();
  const profile = data.user ? await getOrCreateProfile() : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,theme(colors.emerald.100/0.65),transparent_34%),linear-gradient(180deg,theme(colors.background),theme(colors.muted/0.35))] dark:bg-[radial-gradient(circle_at_top_left,theme(colors.emerald.950/0.45),transparent_32%),linear-gradient(180deg,theme(colors.background),theme(colors.muted/0.18))]">
          <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
            <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950">
                  <WalletCards className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold sm:text-base">
                    Personal Finance Tracker
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    Expenses, budgets, and shared balances
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground shadow-xs sm:flex">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <span>September 2026</span>
                </div>
                {data.user ? (
                  <ProfileMenu
                    email={data.user.email ?? "Signed-in user"}
                    userCode={profile?.user_code ?? ""}
                    avatarPath={profile?.avatar_path ?? null}
                  />
                ) : (
                  <UserCircle className="size-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
            </nav>
          </header>

          <main className="mx-auto max-w-6xl p-3 sm:p-6">{children}</main>
          <footer className="border-t bg-background/60">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-2">
                <WalletCards className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="font-medium text-foreground">Personal Finance Tracker</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Private by account</span>
                <span aria-hidden="true">•</span>
                <span>Budgets, cash flow, and shared expenses</span>
                <span aria-hidden="true">•</span>
                <span>© 2026</span>
              </div>
            </div>
          </footer>
          </div>
        </Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
