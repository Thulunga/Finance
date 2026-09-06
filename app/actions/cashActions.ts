"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";

const ROW_COLUMNS = "id, user_id, date, description, amount, month_year, created_at";
const ALLOCATION_COLUMNS =
  "id, user_id, date, month_year, allocation_type, description, amount, created_at";

function validateMonth(monthYear: string) {
  if (!/^\d{4}-\d{2}$/.test(monthYear)) {
    throw new Error("month_year must use YYYY-MM format");
  }
}

function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
}

export async function createIncome(input: {
  date: string;
  description: string;
  amount: number;
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !input.description.trim()) {
    throw new Error("Date and description are required");
  }
  validateAmount(input.amount);

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("income_entries")
    .insert({
      user_id: user.id,
      date: input.date,
      description: input.description.trim(),
      amount: input.amount,
      month_year: input.date.slice(0, 7),
    })
    .select(ROW_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function createCashAllocation(input: {
  date: string;
  month_year: string;
  allocation_type: "investment" | "emergency_fund";
  description: string;
  amount: number;
}) {
  validateMonth(input.month_year);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Date is required");
  validateAmount(input.amount);
  if (!input.description.trim()) throw new Error("Description is required");

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("cash_allocations")
    .insert({ ...input, user_id: user.id, description: input.description.trim() })
    .select(ALLOCATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function fetchMonthlyCash(monthYear: string) {
  validateMonth(monthYear);
  const { supabase, user } = await requireUser();
  const [incomeResult, allocationsResult] = await Promise.all([
    supabase
      .from("income_entries")
      .select(ROW_COLUMNS)
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .order("date", { ascending: false }),
    supabase
      .from("cash_allocations")
      .select(ALLOCATION_COLUMNS)
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .order("created_at", { ascending: false }),
  ]);

  if (incomeResult.error) throw new Error(incomeResult.error.message);
  if (allocationsResult.error) throw new Error(allocationsResult.error.message);
  return { income: incomeResult.data ?? [], allocations: allocationsResult.data ?? [] };
}

export async function fetchCashThroughMonth(monthYear: string) {
  validateMonth(monthYear);
  const { supabase, user } = await requireUser();
  const [incomeResult, allocationsResult] = await Promise.all([
    supabase
      .from("income_entries")
      .select(ROW_COLUMNS)
      .eq("user_id", user.id)
      .lte("month_year", monthYear)
      .order("date", { ascending: false }),
    supabase
      .from("cash_allocations")
      .select(ALLOCATION_COLUMNS)
      .eq("user_id", user.id)
      .lte("month_year", monthYear)
      .order("created_at", { ascending: false }),
  ]);

  if (incomeResult.error) throw new Error(incomeResult.error.message);
  if (allocationsResult.error) throw new Error(allocationsResult.error.message);
  return { income: incomeResult.data ?? [], allocations: allocationsResult.data ?? [] };
}

export async function updateIncome(id: string, input: {
  date: string;
  description: string;
  amount: number;
}) {
  if (!id.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !input.description.trim()) {
    throw new Error("Date and description are required");
  }
  validateAmount(input.amount);
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("income_entries")
    .update({ ...input, description: input.description.trim(), month_year: input.date.slice(0, 7) })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(ROW_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteIncome(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("income_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { id };
}

export async function updateCashAllocation(id: string, input: {
  date: string;
  month_year: string;
  allocation_type: "investment" | "emergency_fund";
  description: string;
  amount: number;
}) {
  validateMonth(input.month_year);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Date is required");
  validateAmount(input.amount);
  if (!input.description.trim()) throw new Error("Description is required");
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("cash_allocations")
    .update({ ...input, description: input.description.trim() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(ALLOCATION_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteCashAllocation(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("cash_allocations").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return { id };
}