"use client";

import { useState } from "react";

import { useDashboard } from "@/components/DashboardProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CashFlowEntryForms({
  onCompleted,
}: Readonly<{ onCompleted?: () => void }>) {
  const { monthYear, addIncome, addAllocation } = useDashboard();
  const [incomeDescription, setIncomeDescription] = useState("Salary");
  const [incomeDate, setIncomeDate] = useState(`${monthYear}-01`);
  const [incomeAmount, setIncomeAmount] = useState(0);
  const [allocationType, setAllocationType] = useState<"investment" | "emergency_fund">("investment");
  const [allocationDate, setAllocationDate] = useState(`${monthYear}-01`);
  const [allocationDescription, setAllocationDescription] = useState("");
  const [allocationAmount, setAllocationAmount] = useState(0);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Record income</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (incomeAmount > 0 && incomeDescription.trim()) { addIncome({ date: incomeDate, description: incomeDescription, amount: incomeAmount }); setIncomeAmount(0); onCompleted?.(); } }}>
            <Input aria-label="Income date" type="date" value={incomeDate} onChange={(event) => setIncomeDate(event.target.value)} />
            <Input aria-label="Income description" placeholder="Salary, freelance..." value={incomeDescription} onChange={(event) => setIncomeDescription(event.target.value)} />
            <Input aria-label="Income amount" placeholder="Amount in INR" min="0" step="0.01" type="number" value={incomeAmount || ""} onChange={(event) => setIncomeAmount(Number(event.target.value || 0))} />
            <Button className="w-full" type="submit">Add income</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Allocate cash</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (allocationAmount > 0 && allocationDescription.trim()) { addAllocation({ date: allocationDate, month_year: allocationDate.slice(0, 7), allocation_type: allocationType, description: allocationDescription, amount: allocationAmount }); setAllocationAmount(0); setAllocationDescription(""); onCompleted?.(); } }}>
            <div className="grid grid-cols-2 gap-2"><Button type="button" variant={allocationType === "investment" ? "default" : "outline"} onClick={() => setAllocationType("investment")}>Investment</Button><Button type="button" variant={allocationType === "emergency_fund" ? "default" : "outline"} onClick={() => setAllocationType("emergency_fund")}>Emergency fund</Button></div>
            <Input aria-label="Allocation date" type="date" value={allocationDate} onChange={(event) => setAllocationDate(event.target.value)} />
            <Input aria-label="Allocation description" placeholder="Index fund, rainy day fund..." value={allocationDescription} onChange={(event) => setAllocationDescription(event.target.value)} />
            <Input aria-label="Allocation amount" placeholder="Amount in INR" min="0" step="0.01" type="number" value={allocationAmount || ""} onChange={(event) => setAllocationAmount(Number(event.target.value || 0))} />
            <Button className="w-full" type="submit">Move money</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
