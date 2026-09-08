import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type GroupExpense = {
  id: string;
  expense_id: string | null;
  friend_name: string;
  amount_owed: number;
  is_settled: boolean;
  settled_date: string | null;
  expenses: {
    id: string;
    date: string;
    description: string;
    total_amount: number;
    category: string;
    my_share: number;
    user_id: string | null;
  } | null;
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

  const [groupResult, membersResult, expensesResult] = await Promise.all([
    supabase.from("expense_groups").select("id, name, created_at").eq("id", groupId).maybeSingle(),
    supabase.rpc("list_group_members", { target_group_id: groupId }),
    supabase
      .from("split_receivables")
      .select("id, expense_id, friend_name, amount_owed, is_settled, settled_date, expenses(id, date, description, total_amount, category, my_share, user_id)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false }),
  ]);

  if (groupResult.error || !groupResult.data) notFound();
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (expensesResult.error) throw new Error(expensesResult.error.message);

  const expenses = (expensesResult.data ?? []) as GroupExpense[];
  const uniqueExpenses = new Map<string, { expense: NonNullable<GroupExpense["expenses"]>; splits: GroupExpense[] }>();
  for (const split of expenses) {
    if (!split.expenses) continue;
    const current = uniqueExpenses.get(split.expenses.id);
    if (current) current.splits.push(split);
    else uniqueExpenses.set(split.expenses.id, { expense: split.expenses, splits: [split] });
  }

  const expenseRows = [...uniqueExpenses.values()];
  const totalTracked = expenseRows.reduce((total, row) => total + row.expense.total_amount, 0);
  const totalOutstanding = expenses.reduce((total, split) => total + (split.is_settled ? 0 : split.amount_owed), 0);

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
            <h1 className="text-3xl font-semibold tracking-tight">{groupResult.data.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {dateFormatter.format(new Date(groupResult.data.created_at))}
            </p>
          </div>
          <Badge variant="secondary">{membersResult.data?.length ?? 0} members</Badge>
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
            <article key={expense.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{expense.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{dateFormatter.format(new Date(expense.date))} · {expense.category}</p>
                </div>
                <div className="text-right"><p className="font-semibold">{currencyFormatter.format(expense.total_amount)}</p><p className="text-xs text-muted-foreground">My share: {currencyFormatter.format(expense.my_share)}</p></div>
              </div>
              <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2">
                {splits.map((split) => (
                  <div key={split.id} className="flex items-center justify-between gap-3 text-sm">
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
          {(membersResult.data ?? []).map((member) => <Badge key={member.user_id} variant="outline">{member.user_code}</Badge>)}
        </CardContent>
      </Card>
    </div>
  );
}