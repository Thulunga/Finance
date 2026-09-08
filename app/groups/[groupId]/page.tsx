import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type GroupExpenseRow = {
  split_id: string;
  expense_id: string;
  friend_name: string;
  amount_owed: number;
  is_settled: boolean;
  settled_date: string | null;
  expense_date: string;
  description: string;
  total_amount: number;
  category: string;
  my_share: number;
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  if (!isUuid(groupId)) notFound();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=/groups/${groupId}`);

  // All three run through SECURITY DEFINER RPCs, so no cross-table RLS recursion.
  const [groupsResult, membersResult, expensesResult] = await Promise.all([
    supabase.rpc("list_my_groups"),
    supabase.rpc("list_group_members", { target_group_id: groupId }),
    supabase.rpc("list_group_expenses", { target_group_id: groupId }),
  ]);

  if (groupsResult.error) throw new Error(groupsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (expensesResult.error) throw new Error(expensesResult.error.message);

  const group = (groupsResult.data ?? []).find((item) => item.group_id === groupId);
  if (!group) notFound();

  const members = membersResult.data ?? [];
  const rows = (expensesResult.data ?? []) as GroupExpenseRow[];

  const uniqueExpenses = new Map<
    string,
    { expense: Omit<GroupExpenseRow, "split_id" | "friend_name" | "amount_owed" | "is_settled" | "settled_date">; splits: GroupExpenseRow[] }
  >();
  for (const row of rows) {
    const current = uniqueExpenses.get(row.expense_id);
    if (current) current.splits.push(row);
    else uniqueExpenses.set(row.expense_id, { expense: row, splits: [row] });
  }

  const expenseRows = [...uniqueExpenses.values()];
  const totalTracked = expenseRows.reduce((total, item) => total + item.expense.total_amount, 0);
  const totalOutstanding = rows.reduce((total, row) => total + (row.is_settled ? 0 : row.amount_owed), 0);

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href="/groups">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All groups
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" aria-hidden="true" />
              <span>Shared group</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{group.group_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {dateFormatter.format(new Date(group.created_at))}
            </p>
          </div>
          <Badge variant="secondary">{members.length} members</Badge>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CircleDollarSign className="size-5 text-emerald-600" aria-hidden="true" />
            <div><p className="text-xs text-muted-foreground">Tracked expenses</p><p className="font-semibold">{currencyFormatter.format(totalTracked)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="size-5 text-violet-600" aria-hidden="true" />
            <div><p className="text-xs text-muted-foreground">Expense entries</p><p className="font-semibold">{expenseRows.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="size-5 text-amber-600" aria-hidden="true" />
            <div><p className="text-xs text-muted-foreground">Outstanding splits</p><p className="font-semibold">{currencyFormatter.format(totalOutstanding)}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group expenses</CardTitle>
          <CardDescription>Every expense linked to this group, including its split details and settlement status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenseRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No expenses have been added to this group yet.</p>
          ) : expenseRows.map(({ expense, splits }) => (
            <article key={expense.expense_id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{expense.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{dateFormatter.format(new Date(expense.expense_date))} · {expense.category}</p>
                </div>
                <div className="text-right"><p className="font-semibold">{currencyFormatter.format(expense.total_amount)}</p><p className="text-xs text-muted-foreground">My share: {currencyFormatter.format(expense.my_share)}</p></div>
              </div>
              <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2">
                {splits.map((split) => (
                  <div key={split.split_id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-muted-foreground">{split.friend_name}</span>
                    <span className="flex shrink-0 items-center gap-2 font-medium">
                      {currencyFormatter.format(split.amount_owed)}
                      <Badge variant={split.is_settled ? "secondary" : "outline"}>{split.is_settled ? "Settled" : "Open"}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Members</CardTitle><CardDescription>People currently included in this group.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {members.map((member) => <Badge key={member.user_id} variant="outline">{member.user_code}</Badge>)}
        </CardContent>
      </Card>
    </div>
  );
}