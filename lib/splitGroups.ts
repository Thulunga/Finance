// Shared types and pure helpers for the standalone split-groups feature.
// Kept in a plain module (not a "use server" file) so both server actions and
// client components can import types, currency formatting, and math helpers.

export type SplitMember = {
  id: string;
  name: string;
};

export type SplitExpenseShare = {
  person: string;
  amount: number;
};

export type SplitExpense = {
  id: string;
  description: string;
  total_amount: number;
  paid_by: string;
  expense_date: string;
  created_at: string;
  splits: SplitExpenseShare[];
};

export type SplitSettlement = {
  id: string;
  from_person: string;
  to_person: string;
  amount: number;
  settled_date: string;
  created_at: string;
};

export type SplitGroupInfo = {
  slug: string;
  name: string;
  currency: string;
  has_passcode: boolean;
};

export type SplitGroupData = {
  group: SplitGroupInfo;
  members: SplitMember[];
  expenses: SplitExpense[];
  settlements: SplitSettlement[];
};

export type SplitGroupMeta = {
  name: string;
  currency: string;
  has_passcode: boolean;
};

export type SplitBalance = {
  person: string;
  paid: number;
  share: number;
  net: number;
};

export type SuggestedSettlement = {
  from: string;
  to: string;
  amount: number;
};

export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "₹ Indian Rupee" },
  { code: "USD", label: "$ US Dollar" },
  { code: "EUR", label: "€ Euro" },
  { code: "GBP", label: "£ British Pound" },
  { code: "AED", label: "د.إ UAE Dirham" },
  { code: "SGD", label: "$ Singapore Dollar" },
  { code: "AUD", label: "$ Australian Dollar" },
  { code: "CAD", label: "$ Canadian Dollar" },
  { code: "JPY", label: "¥ Japanese Yen" },
] as const;

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((entry) => entry.code === code);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string) {
  const cached = formatterCache.get(currency);
  if (cached) return cached;
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
  } catch {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  }
  formatterCache.set(currency, formatter);
  return formatter;
}

export function formatMoney(value: number, currency: string) {
  return getFormatter(currency).format(Math.round(value * 100) / 100);
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Split a total equally across the included members, handing any rounding
// remainder (in the smallest unit) to the first members so shares still sum
// exactly to the total.
export function equalShares(total: number, members: string[]) {
  const shares = new Map<string, number>();
  if (members.length === 0) return shares;
  const totalUnits = Math.round(total * 100);
  const base = Math.floor(totalUnits / members.length);
  let remainder = totalUnits - base * members.length;
  for (const member of members) {
    const units = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    shares.set(member, units / 100);
  }
  return shares;
}

export function computeBalances(
  members: SplitMember[],
  expenses: SplitExpense[],
  settlements: SplitSettlement[]
): SplitBalance[] {
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  for (const expense of expenses) {
    paid.set(expense.paid_by, (paid.get(expense.paid_by) ?? 0) + expense.total_amount);
    for (const split of expense.splits) {
      share.set(split.person, (share.get(split.person) ?? 0) + split.amount);
    }
  }
  // A settlement payment reduces the payer's debt and what the receiver is owed.
  const settled = new Map<string, number>();
  for (const settlement of settlements) {
    settled.set(
      settlement.from_person,
      (settled.get(settlement.from_person) ?? 0) + settlement.amount
    );
    settled.set(
      settlement.to_person,
      (settled.get(settlement.to_person) ?? 0) - settlement.amount
    );
  }

  // Everyone who is a member or appears in any expense/settlement gets a row.
  const names = new Set<string>(members.map((member) => member.name));
  for (const key of paid.keys()) names.add(key);
  for (const key of share.keys()) names.add(key);
  for (const key of settled.keys()) names.add(key);

  return Array.from(names).map((person) => {
    const paidValue = paid.get(person) ?? 0;
    const shareValue = share.get(person) ?? 0;
    const settledValue = settled.get(person) ?? 0;
    return {
      person,
      paid: paidValue,
      share: shareValue,
      net: Math.round((paidValue - shareValue + settledValue) * 100) / 100,
    };
  });
}

// Greedy settle-up: match the biggest debtor to the biggest creditor until clear.
export function computeSettlements(balances: SplitBalance[]): SuggestedSettlement[] {
  const debtors = balances
    .filter((balance) => balance.net < -0.01)
    .map((balance) => ({ person: balance.person, amount: -balance.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((balance) => balance.net > 0.01)
    .map((balance) => ({ person: balance.person, amount: balance.net }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: SuggestedSettlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].person,
        to: creditors[j].person,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount <= 0.01) i += 1;
    if (creditors[j].amount <= 0.01) j += 1;
  }
  return settlements;
}
