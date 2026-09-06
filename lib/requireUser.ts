import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";

export async function requireUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("You must be signed in to use the finance tracker.");
  }

  return { supabase, user: data.user };
}