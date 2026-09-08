import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, TriangleAlert, Users } from "lucide-react";

import { joinGroupViaToken } from "@/app/actions/groupActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";

export default async function JoinGroupPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params;
  const supabase = createClient(await cookies());
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  let group: { name: string } | null = null;
  let errorMessage: string | null = null;

  try {
    group = await joinGroupViaToken(token);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not join that group.";
  }

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {errorMessage ? <TriangleAlert className="size-5" aria-hidden="true" /> : <Users className="size-5" aria-hidden="true" />}
          </div>
          <CardTitle className="mt-2">{errorMessage ? "Invite link issue" : "You're in!"}</CardTitle>
          <CardDescription>
            {errorMessage ?? `You've joined "${group?.name}" and are now connected as friends.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/" />} className="w-full">
            <Check className="size-4" aria-hidden="true" />
            Go to dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
