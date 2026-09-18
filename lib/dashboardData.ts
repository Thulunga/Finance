import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database";
import type {
  ExpenseWithSplits,
  Receivable,
} from "@/components/DashboardProvider";

const EXPENSE_COLUMNS =
  "id, date, description, total_amount, category, is_shared, is_credit_card, is_credit_card_payment, my_share, created_at, user_id";

const DEFAULT_CATEGORIES = [
  "Rent & Utilities",
  "Food & Groceries",
  "Travel & Fuel",
  "Lifestyle & Dining",
  "Discretionary",
];

export function getCurrentMonthYear() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Surfaces Supabase/PostgREST errors instead of silently rendering an empty dashboard. */
function assertNoError(label: string, error: { message: string } | null): void {
  if (error) {
    throw new Error(`Failed to load ${label}: ${error.message}`);
  }
}

function getNextMonthStart(monthYear: string) {
  const [year, month] = monthYear.split("-").map(Number);
  const isDecember = month === 12;

  return `${isDecember ? year + 1 : year}-${String(
    isDecember ? 1 : month + 1
  ).padStart(2, "0")}-01`;
}

async function loadCategories(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Tables<"categories">[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, user_id, created_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    return data;
  }

  const { data: seededCategories, error: seedError } = await supabase
    .from("categories")
    .insert(DEFAULT_CATEGORIES.map((name) => ({ name, user_id: userId })))
    .select("id, name, user_id, created_at");

  if (seedError) {
    throw new Error(seedError.message);
  }

  return seededCategories ?? [];
}

export type DashboardInitialData = {
  userEmail: string;
  initialMonth: string;
  initialBudgets: Tables<"budgets">[];
  initialExpenses: ExpenseWithSplits[];
  initialCashExpenses: ExpenseWithSplits[];
  initialReceivables: Receivable[];
  initialCategories: Tables<"categories">[];
  initialIncome: Tables<"income_entries">[];
  initialAllocations: Tables<"cash_allocations">[];
  initialEpfHistory: Tables<"epf_balances">[];
  initialFdAccounts: Tables<"fd_accounts">[];
} | null;

/** Shared by every page that mounts DashboardProvider, so data-loading stays identical across routes. */
export async function loadDashboardData(): Promise<DashboardInitialData> {
  const initialMonth = getCurrentMonthYear();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return null;
  }

  const [budgetsResult, expensesResult, cashExpensesResult, receivablesResult, categories, incomeResult, allocationsResult, epfResult, fdResult] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, category, allocated_amount, month_year, created_at, user_id")
      .eq("month_year", initialMonth)
      .order("category", { ascending: true }),
    supabase
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .gte("date", `${initialMonth}-01`)
      .lt("date", getNextMonthStart(initialMonth))
      .order("date", { ascending: false }),
    supabase
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .lt("date", getNextMonthStart(initialMonth))
      .order("date", { ascending: false }),
    supabase
      .from("receivables")
      .select(
        "id, user_id, person_name, amount, note, receivable_date, is_settled, settled_date, created_at"
      )
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false }),
    loadCategories(supabase, userData.user.id),
    supabase
      .from("income_entries")
      .select("id, user_id, date, description, amount, month_year, created_at")
      .eq("user_id", userData.user.id)
      .lte("month_year", initialMonth)
      .order("date", { ascending: false }),
    supabase
      .from("cash_allocations")
      .select("id, user_id, date, month_year, allocation_type, description, amount, created_at")
      .eq("user_id", userData.user.id)
      .lte("month_year", initialMonth)
      .order("created_at", { ascending: false }),
    supabase
      .from("epf_balances")
      .select("id, user_id, balance, recorded_at, note, created_at")
      .eq("user_id", userData.user.id)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("fd_accounts")
      .select("id, user_id, bank_name, amount, interest_rate, maturity_date, note, created_at, updated_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false }),
  ]);

  assertNoError("budgets", budgetsResult.error);
  assertNoError("expenses (current month)", expensesResult.error);
  assertNoError("expenses (history)", cashExpensesResult.error);
  assertNoError("receivables", receivablesResult.error);
  assertNoError("income_entries", incomeResult.error);
  assertNoError("cash_allocations", allocationsResult.error);
  assertNoError("epf_balances", epfResult.error);
  assertNoError("fd_accounts", fdResult.error);

  const initialExpenses: ExpenseWithSplits[] = expensesResult.data ?? [];

  return {
    userEmail: userData.user.email ?? userData.user.id,
    initialMonth,
    initialBudgets: budgetsResult.data ?? [],
    initialExpenses,
    initialCashExpenses: cashExpensesResult.data ?? [],
    initialReceivables: receivablesResult.data ?? [],
    initialCategories: categories,
    initialIncome: incomeResult.data ?? [],
    initialAllocations: allocationsResult.data ?? [],
    initialEpfHistory: epfResult.data ?? [],
    initialFdAccounts: fdResult.data ?? [],
  };
}

