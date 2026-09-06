import type { Tables } from "@/types/database";

export type BudgetLike = Pick<
  Tables<"budgets">,
  "category" | "allocated_amount" | "month_year"
>;

export type ExpenseLike = Pick<
  Tables<"expenses">,
  "category" | "date" | "my_share" | "is_credit_card" | "is_credit_card_payment"
>;

export type HealthStatus = "healthy" | "warning" | "critical" | "exceeded";

export type CategoryHealth = {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: HealthStatus;
  isUnbudgeted: boolean;
};

export type OverallKPIs = {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  percentage: number;
  isOverBudget: boolean;
  totalIncome: number;
  totalInvested: number;
  totalEmergencyFund: number;
  totalAfterSpending: number;
  cumulativeIncome: number;
  cumulativeSpent: number;
  cumulativeInvested: number;
  cumulativeEmergencyFund: number;
  cumulativeAfterSpending: number;
  creditCardSpent: number;
  cumulativeCreditCardSpent: number;
  creditCardDue: number;
  totalFinancialPosition: number;
  cashAvailable: number;
};

export type IncomeLike = Tables<"income_entries">;
export type AllocationLike = Tables<"cash_allocations">;

const WARNING_THRESHOLD = 75;
const CRITICAL_THRESHOLD = 90;

/** Caches the most recent call so re-renders with unchanged inputs skip the reduce passes. */
function memoizeLatest<Args extends unknown[], Result>(
  compute: (...args: Args) => Result
) {
  let lastArgs: Args | null = null;
  let lastResult: Result;

  return (...args: Args): Result => {
    if (
      lastArgs !== null &&
      lastArgs.length === args.length &&
      lastArgs.every((arg, index) => Object.is(arg, args[index]))
    ) {
      return lastResult;
    }

    lastArgs = args;
    lastResult = compute(...args);

    return lastResult;
  };
}

function toNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function toMonthYear(date: string) {
  return date.slice(0, 7);
}

function isThroughMonth(monthYear: string, selectedMonth: string) {
  return monthYear <= selectedMonth;
}

function toPercentage(spent: number, allocated: number) {
  if (allocated <= 0) {
    return spent > 0 ? 100 : 0;
  }

  return (spent / allocated) * 100;
}

function toStatus(spent: number, allocated: number, percentage: number): HealthStatus {
  if (spent > allocated) {
    return "exceeded";
  }

  if (percentage > CRITICAL_THRESHOLD) {
    return "critical";
  }

  if (percentage >= WARNING_THRESHOLD) {
    return "warning";
  }

  return "healthy";
}

/**
 * Net spend per category: only `my_share` counts, so amounts owed by friends
 * never consume the budget.
 */
function computeCategoryHealth(
  budgets: BudgetLike[],
  expenses: ExpenseLike[],
  selectedMonth: string
): CategoryHealth[] {
  const allocatedByCategory = new Map<string, number>();

  for (const budget of budgets) {
    if (budget.month_year !== selectedMonth) {
      continue;
    }

    allocatedByCategory.set(
      budget.category,
      toNumber(allocatedByCategory.get(budget.category)) +
        toNumber(budget.allocated_amount)
    );
  }

  const spentByCategory = new Map<string, number>();

  for (const expense of expenses) {
    if (toMonthYear(expense.date) !== selectedMonth || expense.is_credit_card_payment) {
      continue;
    }

    spentByCategory.set(
      expense.category,
      toNumber(spentByCategory.get(expense.category)) + toNumber(expense.my_share)
    );
  }

  const categories = new Set([
    ...allocatedByCategory.keys(),
    ...spentByCategory.keys(),
  ]);

  return Array.from(categories)
    .map((category) => {
      const allocated = toNumber(allocatedByCategory.get(category));
      const spent = toNumber(spentByCategory.get(category));
      const percentage = toPercentage(spent, allocated);

      return {
        category,
        allocated,
        spent,
        remaining: allocated - spent,
        percentage,
        status: toStatus(spent, allocated, percentage),
        isUnbudgeted: !allocatedByCategory.has(category),
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

function computeOverallKPIs(
  budgets: BudgetLike[],
  expenses: ExpenseLike[],
  selectedMonth: string,
  income: IncomeLike[] = [],
  allocations: AllocationLike[] = [],
  cashExpenses: ExpenseLike[] = expenses
): OverallKPIs {
  const health = calculateCategoryHealth(budgets, expenses, selectedMonth);
  const totalAllocated = health.reduce((total, item) => total + item.allocated, 0);
  const totalSpent = health.reduce((total, item) => total + item.spent, 0);
  const monthlyIncome = income
    .filter((item) => item.month_year === selectedMonth)
    .reduce((total, item) => total + toNumber(item.amount), 0);
  const monthlyInvested = allocations
    .filter((item) => item.month_year === selectedMonth && item.allocation_type === "investment")
    .reduce((total, item) => total + toNumber(item.amount), 0);
  const monthlyEmergencyFund = allocations
    .filter((item) => item.month_year === selectedMonth && item.allocation_type === "emergency_fund")
    .reduce((total, item) => total + toNumber(item.amount), 0);
  const totalIncome = income
    .filter((item) => isThroughMonth(item.month_year, selectedMonth))
    .reduce((total, item) => total + toNumber(item.amount), 0);
  const totalInvested = allocations
    .filter((item) => isThroughMonth(item.month_year, selectedMonth) && item.allocation_type === "investment")
    .reduce((total, item) => total + toNumber(item.amount), 0);
  const totalEmergencyFund = allocations
    .filter((item) => isThroughMonth(item.month_year, selectedMonth) && item.allocation_type === "emergency_fund")
    .reduce((total, item) => total + toNumber(item.amount), 0);
  const cumulativeSpent = cashExpenses
    .filter((expense) => isThroughMonth(toMonthYear(expense.date), selectedMonth) && (!expense.is_credit_card || expense.is_credit_card_payment))
    .reduce((total, expense) => total + toNumber(expense.my_share), 0);
  const creditCardSpent = expenses
    .filter((expense) => toMonthYear(expense.date) === selectedMonth && expense.is_credit_card && !expense.is_credit_card_payment)
    .reduce((total, expense) => total + toNumber(expense.my_share), 0);
  const cumulativeCreditCardSpent = cashExpenses
    .filter((expense) => isThroughMonth(toMonthYear(expense.date), selectedMonth) && expense.is_credit_card && !expense.is_credit_card_payment)
    .reduce((total, expense) => total + toNumber(expense.my_share), 0);
  const cumulativeCreditCardPayments = cashExpenses
    .filter((expense) => isThroughMonth(toMonthYear(expense.date), selectedMonth) && expense.is_credit_card_payment)
    .reduce((total, expense) => total + toNumber(expense.my_share), 0);

  return {
    totalAllocated,
    totalSpent,
    totalRemaining: totalAllocated - totalSpent,
    percentage: toPercentage(totalSpent, totalAllocated),
    isOverBudget: totalSpent > totalAllocated,
    totalIncome: monthlyIncome,
    totalInvested: monthlyInvested,
    totalEmergencyFund: monthlyEmergencyFund,
    totalAfterSpending: monthlyIncome - totalSpent,
    cumulativeIncome: totalIncome,
    cumulativeSpent,
    cumulativeInvested: totalInvested,
    cumulativeEmergencyFund: totalEmergencyFund,
    cumulativeAfterSpending: totalIncome - cumulativeSpent,
    creditCardSpent,
    cumulativeCreditCardSpent,
    creditCardDue: Math.max(cumulativeCreditCardSpent - cumulativeCreditCardPayments, 0),
    totalFinancialPosition:
      totalIncome -
      cumulativeSpent -
      totalInvested -
      totalEmergencyFund +
      totalInvested +
      totalEmergencyFund -
      Math.max(cumulativeCreditCardSpent - cumulativeCreditCardPayments, 0),
    cashAvailable: totalIncome -
      cumulativeSpent -
      totalInvested -
      totalEmergencyFund,
  };
}

export const calculateCategoryHealth = memoizeLatest(computeCategoryHealth);
export const calculateOverallKPIs = memoizeLatest(computeOverallKPIs);
