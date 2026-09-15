// Shared constants and types for the standalone trip spendings split page.
// Kept in a plain module (not the "use server" actions file) so both the
// server actions and the client UI can import the member list and types.

export const TRIP_MEMBERS = ["Thulunga", "Jayshree", "Pragati"] as const;

export type TripMember = (typeof TRIP_MEMBERS)[number];

export type TripExpenseSplit = {
  person: string;
  amount: number;
};

export type TripExpense = {
  id: string;
  description: string;
  total_amount: number;
  paid_by: string;
  expense_date: string;
  created_at: string;
  splits: TripExpenseSplit[];
};

export type TripSettlement = {
  id: string;
  from_person: string;
  to_person: string;
  amount: number;
  settled_date: string;
  created_at: string;
};

export function isTripMember(value: string): value is TripMember {
  return (TRIP_MEMBERS as readonly string[]).includes(value);
}
