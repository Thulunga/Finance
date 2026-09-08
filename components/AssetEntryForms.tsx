"use client";

import { useState } from "react";

import { useDashboard } from "@/components/DashboardProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AssetEntryForms({
  onCompleted,
}: Readonly<{ onCompleted?: () => void }>) {
  const { addEpfBalance, addFdAccount } = useDashboard();
  const [epfBalance, setEpfBalance] = useState(0);
  const [epfDate, setEpfDate] = useState(today());
  const [epfNote, setEpfNote] = useState("");
  const [fdBank, setFdBank] = useState("");
  const [fdAmount, setFdAmount] = useState(0);
  const [fdInterestRate, setFdInterestRate] = useState("");
  const [fdMaturityDate, setFdMaturityDate] = useState("");
  const [fdNote, setFdNote] = useState("");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Update EPF balance</CardTitle></CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (epfBalance >= 0 && epfDate) {
                addEpfBalance({ balance: epfBalance, recorded_at: epfDate, note: epfNote || undefined });
                setEpfBalance(0);
                setEpfNote("");
                onCompleted?.();
              }
            }}
          >
            <Input aria-label="EPF balance date" type="date" value={epfDate} onChange={(event) => setEpfDate(event.target.value)} />
            <Input aria-label="EPF balance amount" placeholder="Latest balance in INR" min="0" step="0.01" type="number" value={epfBalance || ""} onChange={(event) => setEpfBalance(Number(event.target.value || 0))} />
            <Input aria-label="EPF note" placeholder="Note (optional)" value={epfNote} onChange={(event) => setEpfNote(event.target.value)} />
            <Button className="w-full" type="submit">Save balance</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Add fixed deposit</CardTitle></CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (fdAmount > 0 && fdBank.trim()) {
                addFdAccount({
                  bank_name: fdBank,
                  amount: fdAmount,
                  interest_rate: fdInterestRate ? Number(fdInterestRate) : null,
                  maturity_date: fdMaturityDate || null,
                  note: fdNote || undefined,
                });
                setFdBank("");
                setFdAmount(0);
                setFdInterestRate("");
                setFdMaturityDate("");
                setFdNote("");
                onCompleted?.();
              }
            }}
          >
            <Input aria-label="Bank name" placeholder="Bank name" value={fdBank} onChange={(event) => setFdBank(event.target.value)} />
            <Input aria-label="FD amount" placeholder="Amount in INR" min="0.01" step="0.01" type="number" value={fdAmount || ""} onChange={(event) => setFdAmount(Number(event.target.value || 0))} />
            <Input aria-label="Interest rate" placeholder="Interest rate % (optional)" min="0" step="0.01" type="number" value={fdInterestRate} onChange={(event) => setFdInterestRate(event.target.value)} />
            <Input aria-label="Maturity date" type="date" value={fdMaturityDate} onChange={(event) => setFdMaturityDate(event.target.value)} />
            <Input aria-label="FD note" placeholder="Note (optional)" value={fdNote} onChange={(event) => setFdNote(event.target.value)} />
            <Button className="w-full" type="submit">Add fixed deposit</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
