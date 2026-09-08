"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, LoaderCircle, Plus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { createGroupInvite } from "@/app/actions/groupActions";
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

export function FriendsGroupsManager() {
  const { friends, groups, addFriend, createGroup, addGroupMember } = useDashboard();
  const [friendCode, setFriendCode] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [memberCodeByGroup, setMemberCodeByGroup] = useState<Record<string, string>>({});
  const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null);
  const [invitingGroupId, setInvitingGroupId] = useState<string | null>(null);

  function handleAddFriend() {
    if (!friendCode.trim() || isAddingFriend) return;
    setIsAddingFriend(true);
    startTransition(async () => {
      try {
        await addFriend(friendCode);
        setFriendCode("");
        toast.success("Friend added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add friend.");
      } finally {
        setIsAddingFriend(false);
      }
    });
  }

  function handleCreateGroup() {
    if (!groupName.trim() || isCreatingGroup) return;
    setIsCreatingGroup(true);
    startTransition(async () => {
      try {
        await createGroup(groupName);
        setGroupName("");
        toast.success("Group created.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create group.");
      } finally {
        setIsCreatingGroup(false);
      }
    });
  }

  function handleAddMember(groupId: string) {
    const code = memberCodeByGroup[groupId]?.trim();
    if (!code || addingMemberGroupId) return;
    setAddingMemberGroupId(groupId);
    startTransition(async () => {
      try {
        await addGroupMember(groupId, code);
        setMemberCodeByGroup((current) => ({ ...current, [groupId]: "" }));
        toast.success("Member added.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add member.");
      } finally {
        setAddingMemberGroupId(null);
      }
    });
  }

  function handleCopyInvite(groupId: string) {
    if (invitingGroupId) return;
    setInvitingGroupId(groupId);
    startTransition(async () => {
      try {
        const invite = await createGroupInvite(groupId);
        const link = `${window.location.origin}/join/${invite.token}`;
        await navigator.clipboard.writeText(link);
        toast.success("Invite link copied to clipboard.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create invite link.");
      } finally {
        setInvitingGroupId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-violet-900/10 bg-card/95 shadow-sm dark:border-violet-300/10">
        <CardHeader>
          <CardTitle>Add a friend</CardTitle>
          <CardDescription>Enter their 5-character user code to connect instantly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              disabled={isAddingFriend}
              maxLength={5}
              placeholder="e.g. AB12C"
              value={friendCode}
              onChange={(event) => setFriendCode(event.target.value.toUpperCase())}
            />
            <Button disabled={isAddingFriend || !friendCode.trim()} type="button" onClick={handleAddFriend}>
              {isAddingFriend ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
              Add
            </Button>
          </div>

          {friends.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {friends.map((friend) => (
                <Badge key={friend.user_id} variant="outline">{friend.user_code}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No friends connected yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-violet-900/10 bg-card/95 shadow-sm dark:border-violet-300/10">
        <CardHeader>
          <CardTitle>Groups</CardTitle>
          <CardDescription>Create a group to split expenses with multiple people at once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              disabled={isCreatingGroup}
              placeholder="Group name, e.g. Roommates"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
            <Button disabled={isCreatingGroup || !groupName.trim()} type="button" onClick={handleCreateGroup}>
              {isCreatingGroup ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              Create
            </Button>
          </div>

          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No groups yet. Create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.group_id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Users className="size-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                      <Link
                        className="truncate font-medium underline-offset-4 hover:underline"
                        href={`/groups/${group.group_id}`}
                      >
                        {group.group_name}
                      </Link>
                      <Badge variant="secondary">{group.member_count} {group.member_count === 1 ? "member" : "members"}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
                        href={`/groups/${group.group_id}`}
                      >
                        View details
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                      <Button
                        disabled={invitingGroupId === group.group_id}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => handleCopyInvite(group.group_id)}
                      >
                        {invitingGroupId === group.group_id ? (
                          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Copy className="size-4" aria-hidden="true" />
                        )}
                        Copy invite link
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      disabled={addingMemberGroupId === group.group_id}
                      maxLength={5}
                      placeholder="Add member by user code"
                      value={memberCodeByGroup[group.group_id] ?? ""}
                      onChange={(event) =>
                        setMemberCodeByGroup((current) => ({
                          ...current,
                          [group.group_id]: event.target.value.toUpperCase(),
                        }))
                      }
                    />
                    <Button
                      disabled={addingMemberGroupId === group.group_id || !memberCodeByGroup[group.group_id]?.trim()}
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={() => handleAddMember(group.group_id)}
                    >
                      {addingMemberGroupId === group.group_id ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="size-4" aria-hidden="true" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
