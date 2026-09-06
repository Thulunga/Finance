"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/requireUser";

const DEFAULT_CATEGORIES = [
  "Rent & Utilities",
  "Food & Groceries",
  "Travel & Fuel",
  "Lifestyle & Dining",
  "Discretionary",
];

function normalizeName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("Category name is required.");
  }

  if (normalized.length > 60) {
    throw new Error("Category names must be 60 characters or fewer.");
  }

  return normalized;
}

export async function fetchCategories() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, user_id, created_at")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function ensureDefaultCategories() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("categories").upsert(
    DEFAULT_CATEGORIES.map((name) => ({ name, user_id: user.id })),
    { onConflict: "user_id,name", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(error.message);
  }

  return fetchCategories();
}

export async function createCategory(name: string) {
  const { supabase, user } = await requireUser();
  const normalizedName = normalizeName(name);
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: normalizedName, user_id: user.id })
    .select("id, name, user_id, created_at")
    .single();

  if (error) {
    throw new Error(error.code === "23505" ? "That category already exists." : error.message);
  }

  revalidatePath("/");
  return data;
}

export async function renameCategory(categoryId: string, name: string) {
  const { supabase, user } = await requireUser();
  const normalizedName = normalizeName(name);
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .update({ name: normalizedName })
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .select("id, name, user_id, created_at")
    .single();

  if (categoryError) {
    throw new Error(categoryError.code === "23505" ? "That category already exists." : categoryError.message);
  }

  const { error: budgetError } = await supabase
    .from("budgets")
    .update({ category: normalizedName })
    .eq("user_id", user.id)
    .eq("category", category.name);

  if (budgetError) {
    throw new Error(budgetError.message);
  }

  const { error: expenseError } = await supabase
    .from("expenses")
    .update({ category: normalizedName })
    .eq("user_id", user.id)
    .eq("category", category.name);

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  revalidatePath("/");
  return category;
}

export async function deleteCategory(categoryId: string) {
  const { supabase, user } = await requireUser();
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("name")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .single();

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const { count, error: expenseError } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("category", category.name);

  if (expenseError) {
    throw new Error(expenseError.message);
  }

  if (count && count > 0) {
    throw new Error("Categories used by expenses cannot be deleted. Rename it instead.");
  }

  const { error: budgetError } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category", category.name);

  if (budgetError) {
    throw new Error(budgetError.message);
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  return { id: categoryId };
}