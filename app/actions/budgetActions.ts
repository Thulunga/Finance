"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";

type UpsertMonthlyBudgetInput = {
  month_year: string;
  category: string;
  allocated_amount: number;
};

export async function upsertMonthlyBudget(input: UpsertMonthlyBudgetInput) {
  const monthYearPattern = /^\d{4}-\d{2}$/;

  if (!monthYearPattern.test(input.month_year)) {
    throw new Error("month_year must use YYYY-MM format");
  }

  if (!input.category.trim()) {
    throw new Error("category is required");
  }

  if (!Number.isFinite(input.allocated_amount) || input.allocated_amount < 0) {
    throw new Error("allocated_amount must be a positive number");
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        month_year: input.month_year,
        category: input.category.trim(),
        allocated_amount: input.allocated_amount,
        user_id: user.id,
      },
      {
        onConflict: "user_id,category,month_year",
      }
    )
    .select("id, category, allocated_amount, month_year, created_at, user_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");

  return data;
}

export async function fetchMonthlyBudgets(monthYear: string) {
  const monthYearPattern = /^\d{4}-\d{2}$/;

  if (!monthYearPattern.test(monthYear)) {
    throw new Error("month_year must use YYYY-MM format");
  }

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("budgets")
    .select("id, category, allocated_amount, month_year, created_at, user_id")
    .eq("user_id", user.id)
    .eq("month_year", monthYear)
    .order("category", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}