"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";

type ExpenseSplitInput = {
  friend_name: string;
  amount_owed: number;
  friend_user_id?: string | null;
  group_id?: string | null;
};

type CreateExpenseInput = {
  date: string;
  description: string;
  total_amount: number;
  category: string;
  is_shared: boolean;
  my_share: number;
  is_credit_card: boolean;
  is_credit_card_payment: boolean;
  splits?: ExpenseSplitInput[];
};

function getNextMonthStart(monthYear: string) {
  const [year, month] = monthYear.split("-").map(Number);
  const isDecember = month === 12;

  return `${isDecember ? year + 1 : year}-${String(
    isDecember ? 1 : month + 1
  ).padStart(2, "0")}-01`;
}

export async function createExpense(input: CreateExpenseInput) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(input.date)) {
    throw new Error("date must use YYYY-MM-DD format");
  }

  if (!input.description.trim()) {
    throw new Error("description is required");
  }

  if (!input.category.trim()) {
    throw new Error("category is required");
  }

  if (!Number.isFinite(input.total_amount) || input.total_amount <= 0) {
    throw new Error("total_amount must be greater than 0");
  }

  if (!Number.isFinite(input.my_share) || input.my_share < 0) {
    throw new Error("my_share must be a positive number");
  }

  const splits = input.is_shared
    ? (input.splits ?? []).filter(
        (split) => split.friend_name.trim() && split.amount_owed > 0
      )
    : [];
  const totalOwed = splits.reduce(
    (total, split) => total + split.amount_owed,
    0
  );

  if (totalOwed > input.total_amount) {
    throw new Error("friend split amounts cannot exceed total_amount");
  }

  const { supabase, user } = await requireUser();

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      date: input.date,
      description: input.description.trim(),
      total_amount: input.total_amount,
      category: input.category.trim(),
      is_shared: input.is_shared,
      my_share: input.my_share,
      is_credit_card: input.is_credit_card,
      is_credit_card_payment: input.is_credit_card_payment,
      user_id: user.id,
    })
    .select("id, date, description, total_amount, category, is_shared, is_credit_card, is_credit_card_payment, my_share, created_at, user_id")
    .single();

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  if (input.is_shared && splits.length > 0) {
    const { data: savedSplits, error: splitError } = await supabase
      .from("split_receivables")
      .insert(
        splits.map((split) => ({
          expense_id: expense.id,
          friend_name: split.friend_name.trim(),
          amount_owed: split.amount_owed,
          friend_user_id: split.friend_user_id ?? null,
          group_id: split.group_id ?? null,
        }))
      )
      .select(
        "id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id"
      );

    if (splitError) {
      throw new Error(splitError.message);
    }

    revalidatePath("/");

    return { ...expense, split_receivables: savedSplits ?? [] };
  }

  revalidatePath("/");

  return { ...expense, split_receivables: [] };
}

export async function deleteExpense(expenseId: string) {
  if (!expenseId.trim()) {
    throw new Error("expenseId is required");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");

  return { id: expenseId };
}

export async function fetchMonthlyExpenses(monthYear: string) {
  const monthYearPattern = /^\d{4}-\d{2}$/;

  if (!monthYearPattern.test(monthYear)) {
    throw new Error("monthYear must use YYYY-MM format");
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, date, description, total_amount, category, is_shared, is_credit_card, is_credit_card_payment, my_share, created_at, user_id, split_receivables(id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id)"
    )
    .eq("user_id", user.id)
    .gte("date", `${monthYear}-01`)
    .lt("date", getNextMonthStart(monthYear))
    .order("date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function fetchExpensesThroughMonth(monthYear: string) {
  const monthYearPattern = /^\d{4}-\d{2}$/;
  if (!monthYearPattern.test(monthYear)) {
    throw new Error("monthYear must use YYYY-MM format");
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, date, description, total_amount, category, is_shared, is_credit_card, is_credit_card_payment, my_share, created_at, user_id, split_receivables(id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id)"
    )
    .eq("user_id", user.id)
    .lt("date", getNextMonthStart(monthYear))
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateExpense(input: {
  id: string;
  date: string;
  description: string;
  category: string;
  total_amount: number;
  is_credit_card: boolean;
  is_credit_card_payment: boolean;
}) {
  if (!input.id.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !input.description.trim() || !input.category.trim()) {
    throw new Error("Date, description, and category are required");
  }
  if (!Number.isFinite(input.total_amount) || input.total_amount <= 0) {
    throw new Error("Total amount must be greater than 0");
  }
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("expenses")
    .update({ date: input.date, description: input.description.trim(), category: input.category.trim(), total_amount: input.total_amount, my_share: input.total_amount, is_credit_card: input.is_credit_card, is_credit_card_payment: input.is_credit_card_payment })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id, date, description, total_amount, category, is_shared, is_credit_card, is_credit_card_payment, my_share, created_at, user_id, split_receivables(id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id)")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}