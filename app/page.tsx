import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BudgetHealthCards } from "@/components/BudgetHealthCards";
import { FinancialAnalytics } from "@/components/FinancialAnalytics";
import { CashFlowManager } from "@/components/CashFlowManager";
import {
  DashboardProvider,
  type ExpenseWithSplits,
  type PendingReceivable,
} from "@/components/DashboardProvider";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { RecentTransactions } from "@/components/RecentTransactions";
import { SectionVisibilityToggle } from "@/components/SectionVisibilityToggle";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database";

export const dynamic = "force-dynamic";

const EXPENSE_COLUMNS =
  "id, date, description, total_amount, category, is_shared, is_credit_card, is_credit_card_payment, my_share, created_at, user_id, split_receivables(id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at)";

const DEFAULT_CATEGORIES = [
  "Rent & Utilities",
  "Food & Groceries",
  "Travel & Fuel",
  "Lifestyle & Dining",
  "Discretionary",
];

function getCurrentMonthYear() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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

export default async function Home() {
  const initialMonth = getCurrentMonthYear();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [budgetsResult, expensesResult, cashExpensesResult, splitsResult, categories, incomeResult, allocationsResult] = await Promise.all([
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
        "id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, expenses(date, description, category)"
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
  ]);

  const initialExpenses: ExpenseWithSplits[] = expensesResult.data ?? [];
  const initialReceivables: PendingReceivable[] = (splitsResult.data ?? []).map(
    ({ expenses, ...split }) => ({ ...split, expense: expenses ?? null })
  );

  return (
    <DashboardProvider
      initialMonth={initialMonth}
      initialBudgets={budgetsResult.data ?? []}
      initialExpenses={initialExpenses}
      initialCashExpenses={cashExpensesResult.data ?? []}
      initialReceivables={initialReceivables}
      initialCategories={categories}
      initialIncome={incomeResult.data ?? []}
      initialAllocations={allocationsResult.data ?? []}
      userEmail={userData.user.email ?? userData.user.id}
    >
      <div className="space-y-4 sm:space-y-6">
        <DashboardTopBar />

        <section aria-labelledby="cash-flow-heading" className="space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3 px-1">
            <div className="min-w-0"><h2 id="cash-flow-heading" className="text-lg font-semibold tracking-tight">Cash overview</h2><p className="text-sm text-muted-foreground">See what came in, what was used, and what remains liquid.</p></div>
            <SectionVisibilityToggle label="cash overview" section="cash-flow" />
          </div>
          <CashFlowManager />
        </section>

        <section aria-labelledby="budget-heading" className="space-y-3 sm:space-y-4">
          <div className="px-1">
            <h2 id="budget-heading" className="text-lg font-semibold tracking-tight">
              Budget overview
            </h2>
            <p className="text-sm text-muted-foreground">
              Track category limits and spending progress for the selected month.
            </p>
          </div>
          <BudgetHealthCards />
        </section>

        <section aria-labelledby="analytics-heading" className="space-y-3 sm:space-y-4">
          <div className="px-1">
            <h2 id="analytics-heading" className="text-lg font-semibold tracking-tight">Analytics</h2>
            <p className="text-sm text-muted-foreground">A visual read of your category usage and monthly allocations.</p>
          </div>
          <FinancialAnalytics />
        </section>

        <section aria-labelledby="activity-heading" className="space-y-3 sm:space-y-4">
          <div className="px-1">
            <h2 id="activity-heading" className="text-lg font-semibold tracking-tight">
              Activity
            </h2>
            <p className="text-sm text-muted-foreground">
              Review the transactions recorded for this month.
            </p>
          </div>
          <RecentTransactions />
        </section>
      </div>
    </DashboardProvider>
  );
}
