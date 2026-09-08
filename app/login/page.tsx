import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { createClient } from "@/utils/supabase/server";

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ next?: string }> }>) {
  const supabase = createClient(await cookies());
  const { data: userData } = await supabase.auth.getUser();
  const { next } = await searchParams;
  const redirectTo = next?.startsWith("/") ? next : "/";

  if (userData.user) {
    redirect(redirectTo);
  }

  return <LoginForm redirectTo={redirectTo} />;
}
