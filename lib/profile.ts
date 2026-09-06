import { requireUser } from "@/lib/requireUser";

const PROFILE_COLUMNS = "user_id, user_code, avatar_path, created_at, updated_at";

function createUserCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function getOrCreateProfile() {
  const { supabase, user } = await requireUser();
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, user_code: createUserCode() })
      .select(PROFILE_COLUMNS)
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw new Error(error.message);
  }

  throw new Error("Could not create a unique user code.");
}