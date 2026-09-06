"use client";

import { startTransition, useMemo, useState } from "react";
import { Check, Pencil, Plus, Save, Trash2 } from "lucide-react";

import { upsertMonthlyBudget } from "@/app/actions/budgetActions";
import { useDashboard } from "@/components/DashboardProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DraftState = {
  allocated_amount: number;
  saving: boolean;
  saved: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getSaveLabel(saving: boolean, saved: boolean) {
  if (saving) {
    return "Saving";
  }

  return saved ? "Saved" : "Save";
}

export function BudgetManager() {
  const {
    monthYear,
    budgets,
    categoryRows,
    upsertBudget,
    addCategory,
    editCategory,
    removeCategory,
  } = useDashboard();
  // Only locally edited rows live here; everything else derives from the store.
  const [edits, setEdits] = useState<Record<string, DraftState>>({});

  const drafts = useMemo(() => {
    const monthBudgets = budgets.filter((budget) => budget.month_year === monthYear);
    const categories = categoryRows.map((category) => category.name);

    return categories.map((category) => {
      const saved = monthBudgets.find((budget) => budget.category === category);
      const edit = edits[`${monthYear}|${category}`];

      return {
        category,
        allocated_amount: edit?.allocated_amount ?? saved?.allocated_amount ?? 0,
        saving: edit?.saving ?? false,
        saved: edit ? edit.saved : Boolean(saved),
      };
    });
  }, [budgets, categoryRows, monthYear, edits]);

  const [newCategory, setNewCategory] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const totalAllocated = drafts.reduce(
    (total, draft) => total + draft.allocated_amount,
    0
  );

  function patchEdit(category: string, patch: Partial<DraftState>) {
    const key = `${monthYear}|${category}`;
    const current = drafts.find((draft) => draft.category === category);

    setEdits((currentEdits) => {
      const base: DraftState = currentEdits[key] ?? {
        allocated_amount: current?.allocated_amount ?? 0,
        saving: false,
        saved: false,
      };

      return { ...currentEdits, [key]: { ...base, ...patch } };
    });
  }

  function saveDraft(category: string) {
    const draft = drafts.find((item) => item.category === category);

    if (!draft) {
      return;
    }

    patchEdit(category, { saving: true, saved: true });

    startTransition(async () => {
      try {
        const savedBudget = await upsertMonthlyBudget({
          month_year: monthYear,
          category,
          allocated_amount: draft.allocated_amount,
        });

        upsertBudget(savedBudget);
        setEdits((currentEdits) => {
          const next = { ...currentEdits };
          delete next[`${monthYear}|${category}`];

          return next;
        });
      } catch {
        patchEdit(category, { saving: false, saved: false });
      }
    });
  }

  return (
    <Card className="border-emerald-900/10 bg-card/95 shadow-sm dark:border-emerald-300/10">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Budget allocation</CardTitle>
          <Badge variant="secondary">Instant save</Badge>
        </div>
        <CardDescription>
          Allocate monthly category limits with immediate local feedback.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          className="flex flex-col gap-2 rounded-lg border bg-background/70 p-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newCategory.trim()) return;
            addCategory(newCategory);
            setNewCategory("");
          }}
        >
          <Input
            aria-label="New category name"
            className="flex-1"
            placeholder="Add a category"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
          />
          <Button type="submit" variant="outline">
            <Plus className="size-4" aria-hidden="true" />
            Add category
          </Button>
        </form>

        <div className="rounded-lg border bg-muted/35 p-4">
          <p className="text-sm text-muted-foreground">Total allocated</p>
          <p className="font-mono text-3xl font-semibold tabular-nums tracking-normal text-emerald-700 dark:text-emerald-300">
            {formatCurrency(totalAllocated)}
          </p>
        </div>

        <div className="grid gap-3">
          {drafts.map((draft) => (
            <div
              key={draft.category}
              className="grid gap-3 rounded-lg border bg-background/70 p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-center"
            >
              <div className="min-w-0">
                {editingCategoryId === categoryRows.find((item) => item.name === draft.category)?.id ? (
                  <div className="flex gap-2">
                    <Input
                      aria-label={`Rename ${draft.category}`}
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <Button
                      size="icon"
                      type="button"
                      onClick={() => {
                        if (editingName.trim() && editingCategoryId) {
                          editCategory(editingCategoryId, editingName);
                          setEditingCategoryId(null);
                        }
                      }}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      <span className="sr-only">Save category name</span>
                    </Button>
                  </div>
                ) : (
                  <p className="truncate text-sm font-medium">{draft.category}</p>
                )}
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(draft.allocated_amount)} allocated
                </p>
              </div>

              <Input
                aria-label={`${draft.category} allocation`}
                className="font-mono tabular-nums"
                min="0"
                step="0.01"
                type="number"
                value={draft.allocated_amount || ""}
                onChange={(event) =>
                  patchEdit(draft.category, {
                    allocated_amount: Number(event.target.value || 0),
                    saved: false,
                  })
                }
              />

              <div className="flex gap-2 sm:justify-end">
                <Button
                  className="flex-1 sm:w-24 sm:flex-none"
                  disabled={draft.saving}
                  type="button"
                  variant={draft.saved ? "secondary" : "default"}
                  onClick={() => saveDraft(draft.category)}
                >
                  {draft.saved ? (
                    <Check className="size-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Save className="size-4" aria-hidden="true" />
                  )}
                  {getSaveLabel(draft.saving, draft.saved)}
                </Button>
                {categoryRows.find((item) => item.name === draft.category) ? (
                  <>
                    <Button
                      size="icon"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const category = categoryRows.find((item) => item.name === draft.category);
                        if (category) {
                          setEditingCategoryId(category.id);
                          setEditingName(category.name);
                        }
                      }}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      <span className="sr-only">Rename {draft.category}</span>
                    </Button>
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const category = categoryRows.find((item) => item.name === draft.category);
                        if (category && window.confirm(`Delete ${category.name}?`)) {
                          removeCategory(category.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                      <span className="sr-only">Delete {draft.category}</span>
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
