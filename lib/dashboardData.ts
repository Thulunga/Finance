import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database";
import type {
  ExpenseWithSplits,
  PendingReceivable,
  Friend,
  MyGroup,
  OwedByMeSplit,
} from "@/components/DashboardProvider";

const EXPENSE_COLUMNS =
  "id, date, description, total_amount, category, is_shared, is_credit_card, is_credit_card_payment, my_share, created_at, user_id, split_receivables(id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id)";

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
  initialReceivables: PendingReceivable[];
  initialCategories: Tables<"categories">[];
  initialIncome: Tables<"income_entries">[];
  initialAllocations: Tables<"cash_allocations">[];
  initialEpfHistory: Tables<"epf_balances">[];
  initialFdAccounts: Tables<"fd_accounts">[];
  initialFriends: Friend[];
  initialGroups: MyGroup[];
  initialOwedByMe: OwedByMeSplit[];
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

  const [budgetsResult, expensesResult, cashExpensesResult, splitsResult, categories, incomeResult, allocationsResult, epfResult, fdResult, friendsResult, groupsResult, owedByMeResult] = await Promise.all([
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
      .from("split_receivables")
      .select(
        "id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id, expenses(date, description, category)"
      )
      .eq("is_settled", false)
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
    supabase.rpc("list_my_friends"),
    supabase.rpc("list_my_groups"),
    supabase
      .from("split_receivables")
      .select(
        "id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id, expenses(date, description, category, user_id)"
      )
      .eq("friend_user_id", userData.user.id)
      .order("created_at", { ascending: false }),
  ]);

  assertNoError("budgets", budgetsResult.error);
  assertNoError("expenses (current month)", expensesResult.error);
  assertNoError("expenses (history)", cashExpensesResult.error);
  assertNoError("split_receivables (owed to me)", splitsResult.error);
  assertNoError("income_entries", incomeResult.error);
  assertNoError("cash_allocations", allocationsResult.error);
  assertNoError("epf_balances", epfResult.error);
  assertNoError("fd_accounts", fdResult.error);
  assertNoError("list_my_friends", friendsResult.error);
  assertNoError("list_my_groups", groupsResult.error);
  assertNoError("split_receivables (owed by me)", owedByMeResult.error);

  const initialExpenses: ExpenseWithSplits[] = expensesResult.data ?? [];
  const initialReceivables: PendingReceivable[] = (splitsResult.data ?? []).map(
    ({ expenses, ...split }) => ({ ...split, expense: expenses ?? null })
  );

  return {
    userEmail: userData.user.email ?? userData.user.id,
    initialMonth,
    initialBudgets: budgetsResult.data ?? [],
    initialExpenses,
    initialCashExpenses: cashExpensesResult.data ?? [],
    initialReceivables,
    initialCategories: categories,
    initialIncome: incomeResult.data ?? [],
    initialAllocations: allocationsResult.data ?? [],
    initialEpfHistory: epfResult.data ?? [],
    initialFdAccounts: fdResult.data ?? [],
    initialFriends: friendsResult.data ?? [],
    initialGroups: groupsResult.data ?? [],
    initialOwedByMe: owedByMeResult.data ?? [],
  };
}

