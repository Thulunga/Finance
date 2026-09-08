"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

export function LoginForm({ redirectTo = "/" }: Readonly<{ redirectTo?: string }>) {
  const router = useRouter();
  const supabase = createClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    if (isSignUp && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (isSignUp && !result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  function switchMode(nextSignUp: boolean) {
    setIsSignUp(nextSignUp);
    setConfirmPassword("");
    setMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  return (
    <main className="auth-page flex min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_top_left,theme(colors.emerald.100/0.7),transparent_36%),linear-gradient(135deg,theme(colors.background),theme(colors.muted/0.55))] p-2 dark:bg-[radial-gradient(circle_at_top_left,theme(colors.emerald.950/0.45),transparent_36%),linear-gradient(135deg,theme(colors.background),theme(colors.muted/0.3))] sm:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card/90 shadow-xl shadow-emerald-950/10 backdrop-blur sm:grid-cols-[0.9fr_1.1fr]">
        <aside className="flex flex-col justify-between gap-4 bg-emerald-700 p-4 text-white dark:bg-emerald-950 sm:p-8">
          <div>
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20"><WalletCards className="size-6" aria-hidden="true" /></div>
            <p className="mt-0 text-lg font-semibold tracking-tight sm:mt-6 sm:text-2xl">Your money, clearly accounted for.</p>
            <p className="mt-2 text-xs leading-5 text-emerald-50/80 sm:mt-3 sm:text-sm sm:leading-6">Track budgets, cash flow, investments, credit-card dues, and shared expenses in one private workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-emerald-50/85 sm:block sm:space-y-3 sm:text-sm"><p className="flex items-center gap-2"><Check className="size-3.5 shrink-0 sm:size-4" />Private data per account</p><p className="flex items-center gap-2"><Check className="size-3.5 shrink-0 sm:size-4" />Fast monthly overview</p><p className="col-span-2 flex items-center gap-2"><Check className="size-3.5 shrink-0 sm:size-4" />Built for everyday decisions</p></div>
        </aside>

        <Card className="rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="p-4 pb-1 sm:p-8 sm:pb-3">
            <div className="flex items-center justify-between gap-3"><div><CardTitle className="text-2xl tracking-tight">{isSignUp ? "Create your account" : "Welcome back"}</CardTitle><CardDescription className="mt-2">{isSignUp ? "Start building a clearer picture of your money." : "Continue managing your money with confidence."}</CardDescription></div><div className="hidden size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 sm:flex"><ShieldCheck className="size-5" aria-hidden="true" /></div></div>
            <div className="mt-4 grid grid-cols-2 rounded-lg bg-muted/60 p-1"><button className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${!isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`} type="button" onClick={() => switchMode(false)}>Sign in</button><button className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`} type="button" onClick={() => switchMode(true)}>Create account</button></div>
          </CardHeader>
          <CardContent className="p-4 pt-2 sm:p-8 sm:pt-3">
            <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" aria-hidden="true" />Email address</span><Input autoComplete="email" placeholder="you@example.com" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label className="block space-y-1.5 text-sm font-medium"><span className="flex items-center gap-2"><LockKeyhole className="size-4 text-muted-foreground" aria-hidden="true" />Password</span><div className="relative"><Input className="pr-10" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={6} placeholder="At least 6 characters" required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} /><button aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-2 text-muted-foreground" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
              {isSignUp ? <label className="block space-y-1.5 text-sm font-medium"><span>Confirm password</span><div className="relative"><Input className="pr-10" autoComplete="new-password" minLength={6} placeholder="Repeat your password" required type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /><button aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} className="absolute inset-y-0 right-2 text-muted-foreground" type="button" onClick={() => setShowConfirmPassword((current) => !current)}>{showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{confirmPassword ? <span className={password === confirmPassword ? "text-xs font-normal text-emerald-600" : "text-xs font-normal text-destructive"}>{password === confirmPassword ? "Passwords match" : "Passwords do not match"}</span> : null}</label> : null}
              {message ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{message}</div> : null}
              <Button className="h-10 w-full" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}{isSignUp ? "Create account" : "Sign in"}</Button>
              <p className="text-center text-xs text-muted-foreground"><ShieldCheck className="mr-1 inline size-3.5" aria-hidden="true" />Your account data is private and protected.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
