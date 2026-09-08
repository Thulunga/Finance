"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";

const EPF_COLUMNS = "id, user_id, balance, recorded_at, note, created_at";
const FD_COLUMNS = "id, user_id, bank_name, amount, interest_rate, maturity_date, note, created_at, updated_at";

function validateBalance(balance: number) {
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error("Balance must be a positive number");
  }
}

function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
}

export async function fetchEpfHistory() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("epf_balances")
    .select(EPF_COLUMNS)
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createEpfBalance(input: {
  balance: number;
  recorded_at: string;
  note?: string;
}) {
  validateBalance(input.balance);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.recorded_at)) {
    throw new Error("Date is required");
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("epf_balances")
    .insert({
      user_id: user.id,
      balance: input.balance,
      recorded_at: input.recorded_at,
      note: input.note?.trim() || null,
    })
    .select(EPF_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteEpfBalance(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("epf_balances").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { id };
}

export async function fetchFdAccounts() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("fd_accounts")
    .select(FD_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFdAccount(input: {
  bank_name: string;
  amount: number;
  interest_rate?: number | null;
  maturity_date?: string | null;
  note?: string;
}) {
  if (!input.bank_name.trim()) throw new Error("Bank name is required");
  validateAmount(input.amount);

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("fd_accounts")
    .insert({
      user_id: user.id,
      bank_name: input.bank_name.trim(),
      amount: input.amount,
      interest_rate: input.interest_rate ?? null,
      maturity_date: input.maturity_date || null,
      note: input.note?.trim() || null,
    })
    .select(FD_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function updateFdAccount(id: string, input: {
  bank_name: string;
  amount: number;
  interest_rate?: number | null;
  maturity_date?: string | null;
  note?: string;
}) {
  if (!input.bank_name.trim()) throw new Error("Bank name is required");
  validateAmount(input.amount);

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("fd_accounts")
    .update({
      bank_name: input.bank_name.trim(),
      amount: input.amount,
      interest_rate: input.interest_rate ?? null,
      maturity_date: input.maturity_date || null,
      note: input.note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(FD_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteFdAccount(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("fd_accounts").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { id };
}
