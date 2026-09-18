"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";

const RECEIVABLE_COLUMNS =
  "id, user_id, person_name, amount, note, receivable_date, is_settled, settled_date, created_at";

export async function createReceivable(input: {
  person_name: string;
  amount: number;
  note?: string | null;
  receivable_date: string;
}) {
  const personName = input.person_name.trim();
  if (!personName) {
    throw new Error("Who owes you? Add a name.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.receivable_date)) {
    throw new Error("Date is required");
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("receivables")
    .insert({
      user_id: user.id,
      person_name: personName,
      amount: Math.round(input.amount * 100) / 100,
      note: input.note?.trim() || null,
      receivable_date: input.receivable_date,
    })
    .select(RECEIVABLE_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/split");

  return data;
}

export async function settleReceivable(id: string, markSettled: boolean) {
  if (!id.trim()) {
    throw new Error("id is required");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("receivables")
    .update({
      is_settled: markSettled,
      settled_date: markSettled ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq("id", id)
    .select(RECEIVABLE_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/split");

  return data;
}

export async function deleteReceivable(id: string) {
  if (!id.trim()) {
    throw new Error("id is required");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("receivables").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/split");

  return { id };
}
