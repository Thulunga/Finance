import type { Metadata } from "next";
import { cookies } from "next/headers";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AppFrame } from "@/components/AppFrame";
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
  const user = data.user
    ? {
        email: data.user.email ?? "Signed-in user",
        userCode: profile?.user_code ?? "",
        avatarPath: profile?.avatar_path ?? null,
      }
    : null;

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
          <AppFrame user={user}>{children}</AppFrame>
        </Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
