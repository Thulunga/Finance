import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { createClient } from "@/utils/supabase/server";

export default async function LoginPage() {
  const supabase = createClient(await cookies());
  const { data: userData } = await supabase.auth.getUser();

  if (userData.user) {
    redirect("/");
  }

  return <LoginForm />;
}
