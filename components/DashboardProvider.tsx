"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  renameCategory,
} from "@/app/actions/categoryActions";
import {
  createCashAllocation,
  createIncome,
  deleteCashAllocation,
  deleteIncome,
  fetchCashThroughMonth,
  updateCashAllocation,
  updateIncome,
} from "@/app/actions/cashActions";
import { fetchMonthlyBudgets } from "@/app/actions/budgetActions";
import { deleteExpense, fetchExpensesThroughMonth, fetchMonthlyExpenses, updateExpense } from "@/app/actions/expenseActions";
import {
  createEpfBalance,
  createFdAccount,
  deleteEpfBalance,
  deleteFdAccount,
  updateFdAccount,
} from "@/app/actions/assetActions";
import {
  addFriendByCode,
  addGroupMemberByCode,
  createExpenseGroup,
  fetchMyFriends,
  fetchMyGroups,
} from "@/app/actions/groupActions";
import { settleReceivableAsFriend } from "@/app/actions/splitActions";
import type { Tables } from "@/types/database";
import type { IncomeLike, AllocationLike } from "@/lib/budgetCalculations";

type BudgetRow = Tables<"budgets">;
type SplitRow = Tables<"split_receivables">;
type CategoryRow = Tables<"categories">;
type EpfRow = Tables<"epf_balances">;
type FdRow = Tables<"fd_accounts">;
export type BalanceSection = "cash-flow" | "budget" | "transactions" | "receivables" | "assets";
const BALANCE_DEFAULT_EVENT = "finance-balance-default-changed";

export type ExpenseWithSplits = Tables<"expenses"> & {
  split_receivables: SplitRow[];
};

export type PendingReceivable = SplitRow & {
  expense: Pick<Tables<"expenses">, "date" | "description" | "category"> | null;
};

export type Friend = { user_id: string; user_code: string; avatar_path: string | null };
export type MyGroup = {
  group_id: string;
  group_name: string;
  member_count: number;
  is_owner: boolean;
  created_at: string;
};
export type OwedByMeSplit = SplitRow & {
  expenses: Pick<Tables<"expenses">, "date" | "description" | "category" | "user_id"> | null;
};

type DashboardContextValue = {
  monthYear: string;
  selectMonth: (monthYear: string) => void;
  isLoadingMonth: boolean;
  budgets: BudgetRow[];
  expenses: ExpenseWithSplits[];
  cashExpenses: ExpenseWithSplits[];
  receivables: PendingReceivable[];
  categoryRows: CategoryRow[];
  categories: string[];
  addCategory: (name: string) => void;
  editCategory: (categoryId: string, name: string) => void;
  removeCategory: (categoryId: string) => void;
  upsertBudget: (budget: BudgetRow) => void;
  addExpense: (expense: ExpenseWithSplits) => void;
  removeExpense: (expenseId: string) => void;
  editExpense: (input: { id: string; date: string; description: string; category: string; total_amount: number; is_credit_card: boolean; is_credit_card_payment: boolean }) => void;
  resolveSplit: (splitId: string, action: (id: string) => Promise<unknown>) => void;
  income: IncomeLike[];
  allocations: AllocationLike[];
  addIncome: (input: { date: string; description: string; amount: number }) => void;
  addAllocation: (input: {
    date: string;
    month_year: string;
    allocation_type: "investment" | "emergency_fund";
    description: string;
    amount: number;
  }) => void;
  updateIncome: (id: string, input: { date: string; description: string; amount: number }) => void;
  deleteIncome: (id: string) => void;
  updateAllocation: (id: string, input: {
    date: string;
    month_year: string;
    allocation_type: "investment" | "emergency_fund";
    description: string;
    amount: number;
  }) => void;
  deleteAllocation: (id: string) => void;
  epfHistory: EpfRow[];
  addEpfBalance: (input: { balance: number; recorded_at: string; note?: string }) => void;
  removeEpfBalance: (id: string) => void;
  fdAccounts: FdRow[];
  addFdAccount: (input: { bank_name: string; amount: number; interest_rate?: number | null; maturity_date?: string | null; note?: string }) => void;
  editFdAccount: (id: string, input: { bank_name: string; amount: number; interest_rate?: number | null; maturity_date?: string | null; note?: string }) => void;
  removeFdAccount: (id: string) => void;
  showBalances: boolean;
  toggleBalances: () => void;
  sectionVisibility: Record<BalanceSection, boolean>;
  toggleSectionVisibility: (section: BalanceSection) => void;
  setDefaultBalanceVisibility: (visible: boolean) => void;
  friends: Friend[];
  groups: MyGroup[];
  owedByMe: OwedByMeSplit[];
  addFriend: (userCode: string) => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  addGroupMember: (groupId: string, userCode: string) => Promise<void>;
  settleOwedSplit: (splitId: string, markSettled: boolean) => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  initialMonth,
  initialBudgets,
  initialExpenses,
  initialCashExpenses,
  initialReceivables,
  initialCategories,
  initialIncome,
  initialAllocations,
  initialEpfHistory,
  initialFdAccounts,
  initialFriends,
  initialGroups,
  initialOwedByMe,
  userEmail,
  children,
}: Readonly<{
  initialMonth: string;
  initialBudgets: BudgetRow[];
  initialExpenses: ExpenseWithSplits[];
  initialCashExpenses: ExpenseWithSplits[];
  initialReceivables: PendingReceivable[];
  initialCategories: CategoryRow[];
  initialIncome: IncomeLike[];
  initialAllocations: AllocationLike[];
  initialEpfHistory: EpfRow[];
  initialFdAccounts: FdRow[];
  initialFriends: Friend[];
  initialGroups: MyGroup[];
  initialOwedByMe: OwedByMeSplit[];
  userEmail: string;
  children: React.ReactNode;
}>) {
  const [monthYear, setMonthYear] = useState(initialMonth);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [expensesByMonth, setExpensesByMonth] = useState<
    Record<string, ExpenseWithSplits[]>
  >({ [initialMonth]: initialExpenses });
  const [cashExpenses, setCashExpenses] = useState(initialCashExpenses);
  const [receivables, setReceivables] = useState(initialReceivables);
  const [categoryRows, setCategoryRows] = useState(initialCategories);
  const [income, setIncome] = useState(initialIncome);
  const [allocations, setAllocations] = useState(initialAllocations);
  const [epfHistory, setEpfHistory] = useState(initialEpfHistory);
  const [friends, setFriends] = useState(initialFriends);
  const [groups, setGroups] = useState(initialGroups);
  const [owedByMe, setOwedByMe] = useState(initialOwedByMe);
  const [fdAccounts, setFdAccounts] = useState(initialFdAccounts);
  const [loadedMonths, setLoadedMonths] = useState(() => new Set([initialMonth]));
  const storageKey = `finance-balance-default:${userEmail}`;
  const [showBalances, setShowBalances] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState<Record<BalanceSection, boolean>>({
    "cash-flow": false,
    budget: false,
    transactions: false,
    receivables: false,
    assets: false,
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) {
      const visible = stored === "visible";
      startTransition(() => {
        setShowBalances(visible);
        setSectionVisibility({
          "cash-flow": visible,
          budget: visible,
          transactions: visible,
          receivables: visible,
          assets: visible,
        });
      });
    }

    const handleDefaultChange = (event: Event) => {
      const visible = (event as CustomEvent<boolean>).detail;
      setShowBalances(visible);
      setSectionVisibility({
        "cash-flow": visible,
        budget: visible,
        transactions: visible,
        receivables: visible,
        assets: visible,
      });
    };

    window.addEventListener(BALANCE_DEFAULT_EVENT, handleDefaultChange);
    return () => window.removeEventListener(BALANCE_DEFAULT_EVENT, handleDefaultChange);
  }, [storageKey]);

  const toggleBalances = useCallback(() => {
    setShowBalances((current) => !current);
  }, []);

  const toggleSectionVisibility = useCallback((section: BalanceSection) => {
    setSectionVisibility((current) => ({ ...current, [section]: !current[section] }));
  }, []);

  const setDefaultBalanceVisibility = useCallback((visible: boolean) => {
    window.localStorage.setItem(storageKey, visible ? "visible" : "hidden");
    window.dispatchEvent(new CustomEvent(BALANCE_DEFAULT_EVENT, { detail: visible }));
  }, [storageKey]);

  const expenses = useMemo(
    () => expensesByMonth[monthYear] ?? [],
    [expensesByMonth, monthYear]
  );

  const upsertBudget = useCallback((budget: BudgetRow) => {
    setBudgets((current) => [
      ...current.filter(
        (item) =>
          !(item.month_year === budget.month_year && item.category === budget.category)
      ),
      budget,
    ]);
  }, []);

  const addCategory = useCallback((name: string) => {
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (!normalizedName) return;
    const optimisticCategory: CategoryRow = {
      id: `pending-${crypto.randomUUID()}`,
      name: normalizedName,
      user_id: "pending",
      created_at: new Date().toISOString(),
    };
    setCategoryRows((current) =>
      [...current, optimisticCategory].sort((a, b) => a.name.localeCompare(b.name))
    );

    startTransition(async () => {
      try {
        const category = await createCategory(name);
        setCategoryRows((current) =>
          current
            .filter((item) => item.id !== optimisticCategory.id)
            .concat(category)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (error) {
        setCategoryRows((current) => current.filter((item) => item.id !== optimisticCategory.id));
        toast.error(error instanceof Error ? error.message : "Could not add category.");
      }
    });
  }, []);

  const editCategory = useCallback((categoryId: string, name: string) => {
    startTransition(async () => {
      try {
        const previous = categoryRows.find((category) => category.id === categoryId);
        const category = await renameCategory(categoryId, name);
        setCategoryRows((current) =>
          current
            .map((item) => (item.id === categoryId ? category : item))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        if (previous && previous.name !== category.name) {
          setBudgets((current) =>
            current.map((budget) =>
              budget.category === previous.name
                ? { ...budget, category: category.name }
                : budget
            )
          );
          setExpensesByMonth((current) =>
            Object.fromEntries(
              Object.entries(current).map(([month, rows]) => [
                month,
                rows.map((expense) =>
                  expense.category === previous.name
                    ? { ...expense, category: category.name }
                    : expense
                ),
              ])
            )
          );
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not rename category.");
      }
    });
  }, [categoryRows]);

  const removeCategory = useCallback((categoryId: string) => {
    startTransition(async () => {
      try {
        await deleteCategory(categoryId);
        setCategoryRows((current) => current.filter((category) => category.id !== categoryId));
        setBudgets((current) => current.filter((budget) => budget.category !== categoryRows.find((category) => category.id === categoryId)?.name));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete category.");
      }
    });
  }, [categoryRows]);

  const addExpense = useCallback((expense: ExpenseWithSplits) => {
    const month = expense.date.slice(0, 7);

    setExpensesByMonth((current) => ({
      ...current,
      [month]: [
        expense,
        ...(current[month] ?? []).filter((item) => item.id !== expense.id),
      ],
    }));
    setCashExpenses((current) => [
      expense,
      ...current.filter((item) => item.id !== expense.id),
    ]);
    setReceivables((current) => [
      ...expense.split_receivables
        .filter((split) => !split.is_settled)
        .map((split) => ({
          ...split,
          expense: {
            date: expense.date,
            description: expense.description,
            category: expense.category,
          },
        })),
      ...current,
    ]);
  }, []);

  const editExpense = useCallback((input: { id: string; date: string; description: string; category: string; total_amount: number; is_credit_card: boolean; is_credit_card_payment: boolean }) => {
    const previous = Object.values(expensesByMonth).flat().find((expense) => expense.id === input.id);
    if (!previous) return;
    const optimistic = { ...previous, ...input, my_share: input.total_amount };
    setExpensesByMonth((current) => Object.fromEntries(Object.entries(current).map(([month, rows]) => [month, rows.map((row) => row.id === input.id ? optimistic : row)])));
    setCashExpenses((current) => current.map((row) => row.id === input.id ? optimistic : row));
    startTransition(async () => {
      try {
        const saved = await updateExpense(input);
        setExpensesByMonth((current) => Object.fromEntries(Object.entries(current).map(([month, rows]) => [month, rows.map((row) => row.id === input.id ? saved : row)])));
        setCashExpenses((current) => current.map((row) => row.id === input.id ? saved : row));
      } catch (error) {
        setExpensesByMonth((current) => Object.fromEntries(Object.entries(current).map(([month, rows]) => [month, rows.map((row) => row.id === input.id ? previous : row)])));
        setCashExpenses((current) => current.map((row) => row.id === input.id ? previous : row));
        toast.error(error instanceof Error ? error.message : "Could not update expense.");
      }
    });
  }, [expensesByMonth]);

  /** Drops the row (and its receivables) locally first, restoring it only if the server rejects. */
  const removeExpense = useCallback(
    (expenseId: string) => {
      const previousExpenses = expensesByMonth;
      const previousCashExpenses = cashExpenses;
      const previousReceivables = receivables;

      setExpensesByMonth((current) =>
        Object.fromEntries(
          Object.entries(current).map(([month, rows]) => [
            month,
            rows.filter((row) => row.id !== expenseId),
          ])
        )
      );
      setReceivables((current) =>
        current.filter((split) => split.expense_id !== expenseId)
      );
      setCashExpenses((current) => current.filter((row) => row.id !== expenseId));

      startTransition(async () => {
        try {
          await deleteExpense(expenseId);
        } catch {
          setExpensesByMonth(previousExpenses);
          setCashExpenses(previousCashExpenses);
          setReceivables(previousReceivables);
          toast.error("Could not delete that expense. It has been restored.");
        }
      });
    },
    [cashExpenses, expensesByMonth, receivables]
  );

  const resolveSplit = useCallback(
    (splitId: string, action: (id: string) => Promise<unknown>) => {
      const previous = receivables;

      setReceivables((current) => current.filter((split) => split.id !== splitId));

      startTransition(async () => {
        try {
          await action(splitId);
        } catch {
          setReceivables(previous);
          toast.error("Could not update that split. Please try again.");
        }
      });
    },
    [receivables]
  );

  const selectMonth = useCallback((nextMonth: string) => {
    if (!/^\d{4}-\d{2}$/.test(nextMonth)) {
      return;
    }

    setMonthYear(nextMonth);
    if (loadedMonths.has(nextMonth)) {
      return;
    }
    setIsLoadingMonth(true);

    startTransition(async () => {
      try {
        const [monthBudgets, monthExpenses, historicalExpenses, cash] = await Promise.all([
          fetchMonthlyBudgets(nextMonth),
          fetchMonthlyExpenses(nextMonth),
          fetchExpensesThroughMonth(nextMonth),
          fetchCashThroughMonth(nextMonth),
        ]);

        setBudgets((current) => [
          ...current.filter((budget) => budget.month_year !== nextMonth),
          ...monthBudgets,
        ]);
        setExpensesByMonth((current) => ({ ...current, [nextMonth]: monthExpenses }));
        setCashExpenses(historicalExpenses);
        setIncome(cash.income);
        setAllocations(cash.allocations);
        setLoadedMonths((current) => new Set(current).add(nextMonth));
      } catch {
        toast.error(`Could not load data for ${nextMonth}.`);
      } finally {
        setIsLoadingMonth(false);
      }
    });
  }, [loadedMonths]);

  const addIncome = useCallback((input: { date: string; description: string; amount: number }) => {
    const optimisticEntry: IncomeLike = {
      id: `pending-${crypto.randomUUID()}`,
      user_id: "pending",
      date: input.date,
      description: input.description,
      amount: input.amount,
      month_year: input.date.slice(0, 7),
      created_at: new Date().toISOString(),
    };
    const previous = income;
    setIncome((current) => [optimisticEntry, ...current]);

    startTransition(async () => {
      try {
        const entry = await createIncome(input);
        setIncome((current) => [entry, ...current.filter((item) => item !== optimisticEntry)]);
      } catch (error) {
        setIncome(previous);
        toast.error(error instanceof Error ? error.message : "Could not save income.");
      }
    });
  }, [income]);

  const addAllocation = useCallback((input: {
    date: string;
    month_year: string;
    allocation_type: "investment" | "emergency_fund";
    description: string;
    amount: number;
  }) => {
    const optimisticAllocation: AllocationLike = {
      id: `pending-${crypto.randomUUID()}`,
      user_id: "pending",
      date: input.date,
      amount: input.amount,
      month_year: input.month_year,
      allocation_type: input.allocation_type,
      description: input.description,
      created_at: new Date().toISOString(),
    };
    const previous = allocations;
    setAllocations((current) => [optimisticAllocation, ...current]);

    startTransition(async () => {
      try {
        const allocation = await createCashAllocation(input);
        setAllocations((current) => [allocation, ...current.filter((item) => item !== optimisticAllocation)]);
      } catch (error) {
        setAllocations(previous);
        toast.error(error instanceof Error ? error.message : "Could not save allocation.");
      }
    });
  }, [allocations]);

  const editIncome = useCallback((id: string, input: { date: string; description: string; amount: number }) => {
    const previous = income.find((item) => item.id === id);
    setIncome((current) => current.map((item) => item.id === id ? { ...item, ...input, month_year: input.date.slice(0, 7) } : item));
    startTransition(async () => {
      try { const saved = await updateIncome(id, input); setIncome((current) => current.map((item) => item.id === id ? saved : item)); }
      catch (error) { if (previous) setIncome((current) => current.map((item) => item.id === id ? previous : item)); toast.error(error instanceof Error ? error.message : "Could not update income."); }
    });
  }, [income]);

  const removeIncome = useCallback((id: string) => {
    const previous = income;
    setIncome((current) => current.filter((item) => item.id !== id));
    startTransition(async () => { try { await deleteIncome(id); } catch (error) { setIncome(previous); toast.error(error instanceof Error ? error.message : "Could not delete income."); } });
  }, [income]);

  const editAllocation = useCallback((id: string, input: { date: string; month_year: string; allocation_type: "investment" | "emergency_fund"; description: string; amount: number }) => {
    const previous = allocations.find((item) => item.id === id);
    setAllocations((current) => current.map((item) => item.id === id ? { ...item, ...input } : item));
    startTransition(async () => {
      try { const saved = await updateCashAllocation(id, input); setAllocations((current) => current.map((item) => item.id === id ? saved : item)); }
      catch (error) { if (previous) setAllocations((current) => current.map((item) => item.id === id ? previous : item)); toast.error(error instanceof Error ? error.message : "Could not update allocation."); }
    });
  }, [allocations]);

  const removeAllocation = useCallback((id: string) => {
    const previous = allocations;
    setAllocations((current) => current.filter((item) => item.id !== id));
    startTransition(async () => { try { await deleteCashAllocation(id); } catch (error) { setAllocations(previous); toast.error(error instanceof Error ? error.message : "Could not delete allocation."); } });
  }, [allocations]);

  const addEpfBalance = useCallback((input: { balance: number; recorded_at: string; note?: string }) => {
    const optimisticEntry: EpfRow = {
      id: `pending-${crypto.randomUUID()}`,
      user_id: "pending",
      balance: input.balance,
      recorded_at: input.recorded_at,
      note: input.note ?? null,
      created_at: new Date().toISOString(),
    };
    const previous = epfHistory;
    setEpfHistory((current) => [optimisticEntry, ...current].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)));

    startTransition(async () => {
      try {
        const entry = await createEpfBalance(input);
        setEpfHistory((current) => [entry, ...current.filter((item) => item !== optimisticEntry)].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)));
      } catch (error) {
        setEpfHistory(previous);
        toast.error(error instanceof Error ? error.message : "Could not save EPF balance.");
      }
    });
  }, [epfHistory]);

  const removeEpfBalance = useCallback((id: string) => {
    const previous = epfHistory;
    setEpfHistory((current) => current.filter((item) => item.id !== id));
    startTransition(async () => { try { await deleteEpfBalance(id); } catch (error) { setEpfHistory(previous); toast.error(error instanceof Error ? error.message : "Could not delete EPF balance."); } });
  }, [epfHistory]);

  const addFdAccount = useCallback((input: { bank_name: string; amount: number; interest_rate?: number | null; maturity_date?: string | null; note?: string }) => {
    const optimisticAccount: FdRow = {
      id: `pending-${crypto.randomUUID()}`,
      user_id: "pending",
      bank_name: input.bank_name,
      amount: input.amount,
      interest_rate: input.interest_rate ?? null,
      maturity_date: input.maturity_date ?? null,
      note: input.note ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const previous = fdAccounts;
    setFdAccounts((current) => [optimisticAccount, ...current]);

    startTransition(async () => {
      try {
        const account = await createFdAccount(input);
        setFdAccounts((current) => [account, ...current.filter((item) => item !== optimisticAccount)]);
      } catch (error) {
        setFdAccounts(previous);
        toast.error(error instanceof Error ? error.message : "Could not save FD account.");
      }
    });
  }, [fdAccounts]);

  const editFdAccount = useCallback((id: string, input: { bank_name: string; amount: number; interest_rate?: number | null; maturity_date?: string | null; note?: string }) => {
    const previous = fdAccounts.find((item) => item.id === id);
    setFdAccounts((current) => current.map((item) => item.id === id ? { ...item, ...input, interest_rate: input.interest_rate ?? null, maturity_date: input.maturity_date ?? null, note: input.note ?? null } : item));
    startTransition(async () => {
      try { const saved = await updateFdAccount(id, input); setFdAccounts((current) => current.map((item) => item.id === id ? saved : item)); }
      catch (error) { if (previous) setFdAccounts((current) => current.map((item) => item.id === id ? previous : item)); toast.error(error instanceof Error ? error.message : "Could not update FD account."); }
    });
  }, [fdAccounts]);

  const removeFdAccount = useCallback((id: string) => {
    const previous = fdAccounts;
    setFdAccounts((current) => current.filter((item) => item.id !== id));
    startTransition(async () => { try { await deleteFdAccount(id); } catch (error) { setFdAccounts(previous); toast.error(error instanceof Error ? error.message : "Could not delete FD account."); } });
  }, [fdAccounts]);

  const addFriend = useCallback(async (userCode: string) => {
    await addFriendByCode(userCode);
    const nextFriends = await fetchMyFriends();
    setFriends(nextFriends);
  }, []);

  const createGroup = useCallback(async (name: string) => {
    await createExpenseGroup(name);
    const nextGroups = await fetchMyGroups();
    setGroups(nextGroups);
  }, []);

  const addGroupMember = useCallback(async (groupId: string, userCode: string) => {
    await addGroupMemberByCode(groupId, userCode);
    const [nextGroups, nextFriends] = await Promise.all([fetchMyGroups(), fetchMyFriends()]);
    setGroups(nextGroups);
    setFriends(nextFriends);
  }, []);

  const settleOwedSplit = useCallback(
    (splitId: string, markSettled: boolean) => {
      const previous = owedByMe;

      setOwedByMe((current) =>
        current.map((split) =>
          split.id === splitId
            ? { ...split, is_settled: markSettled, settled_date: markSettled ? new Date().toISOString().slice(0, 10) : null }
            : split
        )
      );

      startTransition(async () => {
        try {
          await settleReceivableAsFriend(splitId, markSettled);
        } catch (error) {
          setOwedByMe(previous);
          toast.error(error instanceof Error ? error.message : "Could not update that split.");
        }
      });
    },
    [owedByMe]
  );

  const categories = useMemo(
    () => categoryRows.map((category) => category.name),
    [categoryRows]
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      monthYear,
      selectMonth,
      isLoadingMonth,
      budgets,
      expenses,
      cashExpenses,
      receivables,
      categoryRows,
      categories,
      addCategory,
      editCategory,
      removeCategory,
      upsertBudget,
      addExpense,
      removeExpense,
      editExpense,
      resolveSplit,
      income,
      allocations,
      addIncome,
      addAllocation,
      updateIncome: editIncome,
      deleteIncome: removeIncome,
      updateAllocation: editAllocation,
      deleteAllocation: removeAllocation,
      epfHistory,
      addEpfBalance,
      removeEpfBalance,
      fdAccounts,
      addFdAccount,
      editFdAccount,
      removeFdAccount,
      showBalances,
      toggleBalances,
      sectionVisibility,
      toggleSectionVisibility,
      setDefaultBalanceVisibility,
      friends,
      groups,
      owedByMe,
      addFriend,
      createGroup,
      addGroupMember,
      settleOwedSplit,
    }),
    [
      monthYear,
      selectMonth,
      isLoadingMonth,
      budgets,
      expenses,
      cashExpenses,
      receivables,
      categoryRows,
      categories,
      addCategory,
      editCategory,
      removeCategory,
      upsertBudget,
      addExpense,
      removeExpense,
      editExpense,
      resolveSplit,
      income,
      allocations,
      addIncome,
      addAllocation,
      editIncome,
      removeIncome,
      editAllocation,
      epfHistory,
      addEpfBalance,
      removeEpfBalance,
      fdAccounts,
      addFdAccount,
      editFdAccount,
      removeFdAccount,
      removeAllocation,
      showBalances,
      toggleBalances,
      sectionVisibility,
      toggleSectionVisibility,
      setDefaultBalanceVisibility,
      friends,
      groups,
      owedByMe,
      addFriend,
      createGroup,
      addGroupMember,
      settleOwedSplit,
    ]
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboard must be used inside a DashboardProvider");
  }

  return context;
}
