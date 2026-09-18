import { redirect } from "next/navigation";

// The hardcoded Uttarakhand trip page has been migrated into the generic
// split-groups system (migration 015). This URL now redirects to that group.
export default function TripSpendingsPage() {
  redirect("/split-groups/uttarakhand");
}
