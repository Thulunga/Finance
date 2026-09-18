"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock,
  KeyRound,
  Loader2,
  Plus,
  Split,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { createSplitGroup } from "@/app/actions/splitGroupActions";
import { SUPPORTED_CURRENCIES } from "@/lib/splitGroups";
import {
  forgetSplitGroup,
  getRecentSplitGroups,
  rememberSplitGroup,
  type RecentSplitGroup,
} from "@/lib/recentSplitGroups";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CreateSplitGroup() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [usePasscode, setUsePasscode] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [recents, setRecents] = useState<RecentSplitGroup[]>([]);

  useEffect(() => {
    // localStorage is client-only, so recents are read after mount (kept out of
    // the initial render to avoid a hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(getRecentSplitGroups());
  }, []);

  const filledMembers = useMemo(
    () => members.map((member) => member.trim()).filter(Boolean),
    [members]
  );

  function updateMember(index: number, value: string) {
    setMembers((prev) => prev.map((member, i) => (i === index ? value : member)));
  }

  function addMemberField() {
    setMembers((prev) => [...prev, ""]);
  }

  function removeMemberField(index: number) {
    setMembers((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Give your group a name");
      return;
    }
    if (filledMembers.length < 2) {
      toast.error("Add at least two people");
      return;
    }
    const uniqueNames = new Set(filledMembers.map((member) => member.toLowerCase()));
    if (uniqueNames.size !== filledMembers.length) {
      toast.error("Member names must be unique");
      return;
    }
    if (usePasscode && !/^\d{4}$/.test(passcode)) {
      toast.error("Passcode must be exactly 4 digits");
      return;
    }

    startTransition(async () => {
      try {
        const slug = await createSplitGroup({
          name: name.trim(),
          currency,
          passcode: usePasscode ? passcode : null,
          members: filledMembers,
        });
        rememberSplitGroup({ slug, name: name.trim(), currency });
        toast.success("Group created");
        router.push(`/split-groups/${slug}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not create the group"
        );
      }
    });
  }

  function handleForget(slug: string) {
    forgetSplitGroup(slug);
    setRecents(getRecentSplitGroups());
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:pt-14">
      <header className="mb-8 flex flex-col gap-3 lg:mb-10">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Split className="size-5" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Split Groups
          </span>
        </div>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Split expenses with anyone, anywhere
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Create a group, add the people you&apos;re splitting with, and share a
          private link. No sign-up required — set a 4-digit passcode to keep the
          numbers safe.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-8">
        {/* Create form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="size-4" aria-hidden="true" />
            New group
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Group name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Goa trip, Flatmates, Team lunch"
                className={inputClass}
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Currency</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className={inputClass}
              >
                {SUPPORTED_CURRENCIES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Users className="size-4" aria-hidden="true" />
              People
            </div>
            <div className="flex flex-col gap-2">
              {members.map((member, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={member}
                    onChange={(event) => updateMember(index, event.target.value)}
                    placeholder={`Person ${index + 1}`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeMemberField(index)}
                    disabled={members.length <= 1}
                    aria-label="Remove person"
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/40"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMemberField}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add another person
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={usePasscode}
                onChange={(event) => setUsePasscode(event.target.checked)}
                className="mt-1 size-4 rounded border-input"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <KeyRound className="size-4" aria-hidden="true" />
                  Protect with a passcode
                </span>
                <span className="text-xs text-muted-foreground">
                  Anyone with the link must enter this 4-digit code to open the
                  group.
                </span>
              </span>
            </label>
            {usePasscode ? (
              <input
                value={passcode}
                onChange={(event) =>
                  setPasscode(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder="4-digit code"
                className={cn(inputClass, "max-w-40 tracking-[0.5em]")}
              />
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
            Create group
          </button>
        </form>

        {/* Recent groups on this device */}
        <aside className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1 text-sm font-semibold">
            <Clock className="size-4" aria-hidden="true" />
            Recent on this device
          </div>
          {recents.length === 0 ? (
            <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground ring-1 ring-foreground/10">
              Groups you create or open will appear here so you can jump back in.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recents.map((group) => (
                <li
                  key={group.slug}
                  className="group flex items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:ring-emerald-500/40"
                >
                  <Link
                    href={`/split-groups/${group.slug}`}
                    className="flex min-w-0 flex-1 flex-col"
                  >
                    <span className="truncate text-sm font-medium">{group.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      /{group.slug}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleForget(group.slug)}
                    aria-label="Remove from recents"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
