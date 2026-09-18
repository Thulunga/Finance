"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, Lock, Split } from "lucide-react";

import { loadSplitGroup } from "@/app/actions/splitGroupActions";
import { SplitGroupApp } from "@/components/split/SplitGroupApp";
import type { SplitGroupData, SplitGroupMeta } from "@/lib/splitGroups";
import {
  clearStoredPasscode,
  getStoredPasscode,
  rememberSplitGroup,
  storePasscode,
} from "@/lib/recentSplitGroups";
import { cn } from "@/lib/utils";

type SplitGroupClientProps = Readonly<{
  slug: string;
  meta: SplitGroupMeta;
}>;

type Status = "loading" | "locked" | "ready";

export function SplitGroupClient({ slug, meta }: SplitGroupClientProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<SplitGroupData | null>(null);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const attempted = useRef(false);

  const load = useCallback(
    async (code: string | null) => {
      const result = await loadSplitGroup(slug, code);
      setData(result);
      setPasscode(code);
      setStatus("ready");
      rememberSplitGroup({
        slug,
        name: result.group.name,
        currency: result.group.currency,
      });
    },
    [slug]
  );

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const stored = meta.has_passcode ? getStoredPasscode(slug) : null;
    load(stored).catch(() => {
      // A protected group without a valid stored passcode shows the gate; a
      // public group that fails here surfaces the gate only as a fallback.
      if (meta.has_passcode) {
        clearStoredPasscode(slug);
      }
      setStatus("locked");
    });
  }, [load, meta.has_passcode, slug]);

  const reload = useCallback(async () => {
    const result = await loadSplitGroup(slug, passcode);
    setData(result);
  }, [slug, passcode]);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{4}$/.test(entry)) {
      setGateError("Enter the 4-digit passcode");
      return;
    }
    setChecking(true);
    setGateError(null);
    try {
      await load(entry);
      storePasscode(slug, entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setGateError(
        message === "INVALID_PASSCODE"
          ? "That passcode is incorrect"
          : "Could not open this group"
      );
    } finally {
      setChecking(false);
    }
  }

  if (status === "ready" && data) {
    return <SplitGroupApp slug={slug} passcode={passcode} data={data} onChanged={reload} />;
  }

  if (status === "locked") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <div className="mb-4 flex flex-col items-center gap-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Lock className="size-6" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold">{meta.name}</h1>
            <p className="text-sm text-muted-foreground">
              This group is protected. Enter the 4-digit passcode to continue.
            </p>
          </div>
          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            <input
              value={entry}
              onChange={(event) => {
                setEntry(event.target.value.replace(/\D/g, "").slice(0, 4));
                setGateError(null);
              }}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              aria-label="Passcode"
              placeholder="••••"
              className={cn(
                "h-14 w-full rounded-lg border bg-transparent text-center text-2xl tracking-[0.75em] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                gateError ? "border-rose-500" : "border-input focus-visible:border-ring"
              )}
            />
            {gateError ? (
              <p className="text-center text-sm text-rose-600 dark:text-rose-400">
                {gateError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={checking}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-base font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
            >
              {checking ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="size-4" aria-hidden="true" />
              )}
              Unlock
            </button>
          </form>
          <Link
            href="/split-groups"
            className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Split className="size-3.5" aria-hidden="true" />
            Back to Split Groups
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </main>
  );
}
