import type { Metadata } from "next";

import { listTripExpenses, listTripSettlements } from "@/app/actions/tripActions";
import { TripSplitApp } from "@/components/trip/TripSplitApp";

export const metadata: Metadata = {
  title: "Trip Spendings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TripSpendingsPage() {
  const [expenses, settlements] = await Promise.all([
    listTripExpenses(),
    listTripSettlements(),
  ]);
  return <TripSplitApp initialExpenses={expenses} initialSettlements={settlements} />;
}
