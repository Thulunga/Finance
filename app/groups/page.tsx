import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { cookies } from "next/headers";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login?next=/groups");

  const { data: groups, error } = await supabase.rpc("list_my_groups");
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" aria-hidden="true" />
          Shared finances
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Your groups</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open a group to review its members and shared expenses.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Available groups</CardTitle>
          <CardDescription>{groups?.length ?? 0} groups available to you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(groups ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              You are not part of any group yet. Create or join one from Friends & groups on the dashboard.
            </p>
          ) : (
            groups?.map((group) => (
              <Link
                key={group.group_id}
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40"
                href={`/groups/${group.group_id}`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Users className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{group.group_name}</p>
                  <p className="text-sm text-muted-foreground">{group.member_count} {group.member_count === 1 ? "member" : "members"}</p>
                </div>
                {group.is_owner ? <Badge variant="secondary">Owner</Badge> : null}
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}