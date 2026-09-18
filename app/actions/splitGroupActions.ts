"use server";

import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import type {
  SplitExpenseShare,
  SplitGroupData,
  SplitGroupMeta,
} from "@/lib/splitGroups";

async function getClient() {
  return createClient(await cookies());
}

// Bubble the raw passcode/not-found signals from the RPCs so the client can
// react (show the passcode gate, redirect, etc.) instead of a generic error.
function normalizeError(message: string): never {
  if (message.includes("INVALID_PASSCODE")) {
    throw new Error("INVALID_PASSCODE");
  }
  if (message.includes("GROUP_NOT_FOUND")) {
    throw new Error("GROUP_NOT_FOUND");
  }
  throw new Error(message);
}

export async function createSplitGroup(input: {
  name: string;
  currency: string;
  passcode: string | null;
  members: string[];
}): Promise<string> {
  const supabase = await getClient();
  const { data, error } = await supabase.rpc("create_split_group", {
    p_name: input.name,
    p_currency: input.currency,
    p_passcode: input.passcode,
    p_members: input.members,
  });
  if (error) normalizeError(error.message);
  return data as string;
}

export async function getSplitGroupMeta(
  slug: string
): Promise<SplitGroupMeta | null> {
  const supabase = await getClient();
  const { data, error } = await supabase.rpc("split_group_meta", { p_slug: slug });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  return row ?? null;
}

export async function loadSplitGroup(
  slug: string,
  passcode: string | null
): Promise<SplitGroupData> {
  const supabase = await getClient();
  const { data, error } = await supabase.rpc("get_split_group", {
    p_slug: slug,
    p_passcode: passcode,
  });
  if (error) normalizeError(error.message);
  return data as unknown as SplitGroupData;
}

export async function addSplitExpense(input: {
  slug: string;
  passcode: string | null;
  description: string;
  total_amount: number;
  paid_by: string;
  expense_date: string;
  splits: SplitExpenseShare[];
}): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.rpc("add_split_group_expense", {
    p_slug: input.slug,
    p_passcode: input.passcode,
    p_description: input.description,
    p_total: input.total_amount,
    p_paid_by: input.paid_by,
    p_date: input.expense_date,
    p_splits: input.splits,
  });
  if (error) normalizeError(error.message);
}

export async function deleteSplitExpense(input: {
  slug: string;
  passcode: string | null;
  expenseId: string;
}): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.rpc("delete_split_group_expense", {
    p_slug: input.slug,
    p_passcode: input.passcode,
    p_expense_id: input.expenseId,
  });
  if (error) normalizeError(error.message);
}

export async function addSplitSettlement(input: {
  slug: string;
  passcode: string | null;
  from_person: string;
  to_person: string;
  amount: number;
  settled_date: string;
}): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.rpc("add_split_group_settlement", {
    p_slug: input.slug,
    p_passcode: input.passcode,
    p_from: input.from_person,
    p_to: input.to_person,
    p_amount: input.amount,
    p_date: input.settled_date,
  });
  if (error) normalizeError(error.message);
}

export async function deleteSplitSettlement(input: {
  slug: string;
  passcode: string | null;
  settlementId: string;
}): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.rpc("delete_split_group_settlement", {
    p_slug: input.slug,
    p_passcode: input.passcode,
    p_settlement_id: input.settlementId,
  });
  if (error) normalizeError(error.message);
}

export async function addSplitMember(input: {
  slug: string;
  passcode: string | null;
  name: string;
}): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.rpc("add_split_group_member", {
    p_slug: input.slug,
    p_passcode: input.passcode,
    p_name: input.name,
  });
  if (error) normalizeError(error.message);
}

export async function removeSplitMember(input: {
  slug: string;
  passcode: string | null;
  memberId: string;
}): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.rpc("remove_split_group_member", {
    p_slug: input.slug,
    p_passcode: input.passcode,
    p_member_id: input.memberId,
  });
  if (error) normalizeError(error.message);
}
