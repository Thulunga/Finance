"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";

const USER_CODE_PATTERN = /^[A-Z0-9]{5}$/i;

export async function addFriendByCode(userCode: string) {
  if (!USER_CODE_PATTERN.test(userCode.trim())) {
    throw new Error("Enter a valid 5-character user code");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_friend_by_code", {
    target_code: userCode.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function createExpenseGroup(name: string) {
  if (!name.trim()) {
    throw new Error("Group name is required");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_expense_group", {
    group_name: name.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");

  return data;
}

export async function addGroupMemberByCode(groupId: string, userCode: string) {
  if (!groupId.trim() || !USER_CODE_PATTERN.test(userCode.trim())) {
    throw new Error("Enter a valid 5-character user code");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("add_group_member_by_code", {
    target_group_id: groupId,
    target_code: userCode.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function createGroupInvite(groupId: string) {
  if (!groupId.trim()) {
    throw new Error("groupId is required");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_group_invite", {
    target_group_id: groupId,
    expires_in_hours: 168,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function revokeGroupInvite(inviteId: string) {
  if (!inviteId.trim()) {
    throw new Error("inviteId is required");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("revoke_group_invite", {
    target_invite_id: inviteId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function joinGroupViaToken(token: string) {
  if (!token.trim()) {
    throw new Error("Invite token is required");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("join_group_via_token", {
    invite_token: token.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");

  return data;
}

export async function fetchMyFriends() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_my_friends");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function fetchMyGroups() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_my_groups");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function fetchGroupMembers(groupId: string) {
  if (!groupId.trim()) {
    throw new Error("groupId is required");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("list_group_members", {
    target_group_id: groupId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
