"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";

export async function settleReceivable(splitId: string) {
  if (!splitId.trim()) {
    throw new Error("splitId is required");
  }

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("split_receivables")
    .update({
      is_settled: true,
      settled_date: new Date().toISOString().slice(0, 10),
    })
    .eq("id", splitId)
    .select("id, expense_id, friend_name, amount_owed, is_settled, settled_date")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("split_settlement_history")
    .insert({ split_id: splitId, action: "settled", actor_user_id: user.id });

  revalidatePath("/");

  return data;
}

/** Used by the friend the split is assigned to, settling from their own account. */
export async function settleReceivableAsFriend(splitId: string, markSettled: boolean) {
  if (!splitId.trim()) {
    throw new Error("splitId is required");
  }

  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("settle_split_as_friend", {
    target_split_id: splitId,
    mark_settled: markSettled,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");

  return data;
}

/** Removes a mistaken split and returns the friend's share back to `my_share`. */
export async function deleteReceivable(splitId: string) {
  if (!splitId.trim()) {
    throw new Error("splitId is required");
  }

  const { supabase } = await requireUser();

  const { data: receivable, error: receivableError } = await supabase
    .from("split_receivables")
    .select("id, expense_id, amount_owed")
    .eq("id", splitId)
    .single();

  if (receivableError) {
    throw new Error(receivableError.message);
  }

  const { error: deleteError } = await supabase
    .from("split_receivables")
    .delete()
    .eq("id", splitId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (receivable.expense_id) {
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select("id, total_amount, my_share")
      .eq("id", receivable.expense_id)
      .single();

    if (expenseError) {
      throw new Error(expenseError.message);
    }

    const adjustedShare = Math.min(
      expense.my_share + receivable.amount_owed,
      expense.total_amount
    );
    const { data: remainingSplits, error: remainingError } = await supabase
      .from("split_receivables")
      .select("id")
      .eq("expense_id", receivable.expense_id);

    if (remainingError) {
      throw new Error(remainingError.message);
    }

    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        my_share: adjustedShare,
        is_shared: (remainingSplits ?? []).length > 0,
      })
      .eq("id", expense.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  revalidatePath("/");

  return { id: splitId, expense_id: receivable.expense_id };
}

/** Splits assigned to the current user by other people (money the user owes). */
export async function fetchOwedByMe() {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("split_receivables")
    .select(
      "id, expense_id, friend_name, amount_owed, is_settled, settled_date, created_at, friend_user_id, group_id, expenses(date, description, category, user_id)"
    )
    .eq("friend_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
