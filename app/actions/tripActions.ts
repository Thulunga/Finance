"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { isTripMember, type TripExpense, type TripSettlement } from "@/lib/trip";

const TRIP_PATH = "/Tripspendings/tjp";

async function getClient() {
  return createClient(await cookies());
}

export async function listTripExpenses(): Promise<TripExpense[]> {
  const supabase = await getClient();

  const [{ data: expenses, error }, { data: splits, error: splitError }] =
    await Promise.all([
      supabase
        .from("trip_expenses")
        .select("id, description, total_amount, paid_by, expense_date, created_at")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("trip_expense_splits")
        .select("expense_id, person, amount"),
    ]);

  if (error) throw new Error(error.message);
  if (splitError) throw new Error(splitError.message);

  const splitsByExpense = new Map<string, { person: string; amount: number }[]>();
  for (const split of splits ?? []) {
    const list = splitsByExpense.get(split.expense_id) ?? [];
    list.push({ person: split.person, amount: Number(split.amount) });
    splitsByExpense.set(split.expense_id, list);
  }

  return (expenses ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    total_amount: Number(row.total_amount),
    paid_by: row.paid_by,
    expense_date: row.expense_date,
    created_at: row.created_at,
    splits: splitsByExpense.get(row.id) ?? [],
  }));
}

export async function createTripExpense(input: {
  description: string;
  total_amount: number;
  paid_by: string;
  expense_date: string;
  splits: { person: string; amount: number }[];
}) {
  const description = input.description.trim();
  if (!description) throw new Error("Description is required");
  if (!Number.isFinite(input.total_amount) || input.total_amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (!isTripMember(input.paid_by)) throw new Error("Invalid payer");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expense_date)) {
    throw new Error("Date is required");
  }

  const splits = input.splits
    .filter((split) => split.amount > 0)
    .map((split) => ({ person: split.person, amount: Math.round(split.amount * 100) / 100 }));

  if (splits.length === 0) throw new Error("Add at least one person's share");
  for (const split of splits) {
    if (!isTripMember(split.person)) throw new Error("Invalid person in split");
  }

  const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(splitTotal - input.total_amount) > 0.01) {
    throw new Error("Split shares must add up to the total amount");
  }

  const supabase = await getClient();
  const { data: expense, error } = await supabase
    .from("trip_expenses")
    .insert({
      description,
      total_amount: input.total_amount,
      paid_by: input.paid_by,
      expense_date: input.expense_date,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { error: splitError } = await supabase
    .from("trip_expense_splits")
    .insert(
      splits.map((split) => ({
        expense_id: expense.id,
        person: split.person,
        amount: split.amount,
      }))
    );

  if (splitError) throw new Error(splitError.message);

  revalidatePath(TRIP_PATH);
}

export async function deleteTripExpense(id: string) {
  const supabase = await getClient();
  const { error } = await supabase.from("trip_expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(TRIP_PATH);
}

export async function listTripSettlements(): Promise<TripSettlement[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("trip_settlements")
    .select("id, from_person, to_person, amount, settled_date, created_at")
    .order("settled_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    from_person: row.from_person,
    to_person: row.to_person,
    amount: Number(row.amount),
    settled_date: row.settled_date,
    created_at: row.created_at,
  }));
}

export async function createTripSettlement(input: {
  from_person: string;
  to_person: string;
  amount: number;
  settled_date: string;
}) {
  if (!isTripMember(input.from_person) || !isTripMember(input.to_person)) {
    throw new Error("Invalid person");
  }
  if (input.from_person === input.to_person) {
    throw new Error("Payer and receiver must be different");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.settled_date)) {
    throw new Error("Date is required");
  }

  const supabase = await getClient();
  const { error } = await supabase.from("trip_settlements").insert({
    from_person: input.from_person,
    to_person: input.to_person,
    amount: Math.round(input.amount * 100) / 100,
    settled_date: input.settled_date,
  });

  if (error) throw new Error(error.message);
  revalidatePath(TRIP_PATH);
}

export async function deleteTripSettlement(id: string) {
  const supabase = await getClient();
  const { error } = await supabase.from("trip_settlements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(TRIP_PATH);
}
