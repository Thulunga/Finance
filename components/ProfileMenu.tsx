"use client";

import { ChangeEvent, startTransition, useEffect, useRef, useState } from "react";
import { Camera, Eye, EyeOff, LoaderCircle, LogOut, Moon, Sun, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import NextImage from "next/image";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/utils/supabase/client";

export function ProfileMenu({
  email,
  userCode,
  avatarPath,
}: Readonly<{ email: string; userCode: string; avatarPath: string | null }>) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const storageKey = `finance-balance-default:${email}`;
  const [defaultVisible, setDefaultVisible] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [currentAvatarPath, setCurrentAvatarPath] = useState(avatarPath);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const avatarUrl = currentAvatarPath
    ? `${supabase.storage.from("avatars").getPublicUrl(currentAvatarPath).data.publicUrl}?v=${avatarVersion}`
    : null;

  useEffect(() => {
    const visible = window.localStorage.getItem(storageKey) === "visible";
    startTransition(() => setDefaultVisible(visible));
  }, [storageKey]);

  useEffect(() => {
    startTransition(() => setIsThemeReady(true));
  }, []);

  useEffect(() => {
    startTransition(() => setAvatarVersion(Date.now()));
  }, []);

  function setBalanceDefault(visible: boolean) {
    setDefaultVisible(visible);
    window.localStorage.setItem(storageKey, visible ? "visible" : "hidden");
    window.dispatchEvent(
      new CustomEvent("finance-balance-default-changed", { detail: visible })
    );
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    const { error } = await createClient().auth.signOut();

    if (!error) {
      router.replace("/login");
      router.refresh();
    } else {
      setIsLoggingOut(false);
    }
  }

  async function compressAvatar(file: File) {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read that image."));
        image.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      const size = 256;
      const scale = Math.min(size / image.width, size / image.height, 1);
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not compress that image."))), "image/webp", 0.72);
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    setIsUploading(true);
    try {
      const blob = await compressAvatar(file);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("You must be signed in to upload a photo.");
      const path = `${userData.user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "3600",
      });
      if (uploadError) throw new Error(uploadError.message);
      const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("user_id", userData.user.id);
      if (profileError) throw new Error(profileError.message);
      setCurrentAvatarPath(path);
      setAvatarVersion(Date.now());
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Open profile menu"
            className="relative size-9 rounded-full p-0"
            size="icon"
            type="button"
            variant="outline"
          />
        }
      >
        {avatarUrl ? <NextImage className="size-full rounded-full object-cover" src={avatarUrl} alt="" width={36} height={36} unoptimized /> : <UserCircle className="size-5" aria-hidden="true" />}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <PopoverHeader>
          <PopoverTitle className="truncate text-sm">{email}</PopoverTitle>
          <p className="mt-1 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">User code: {userCode}</p>
        </PopoverHeader>
        <div className="mt-3">
          <input ref={fileInputRef} accept="image/jpeg,image/png,image/webp" className="hidden" type="file" onChange={handleAvatarChange} />
          <Button className="w-full justify-start" disabled={isUploading} type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            {isUploading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
            {isUploading ? "Uploading photo..." : "Edit profile photo"}
          </Button>
        </div>
        <div className="mt-3 space-y-2 border-y py-3">
          <p className="text-xs font-medium text-muted-foreground">Balance visibility default</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              aria-pressed={!defaultVisible}
              size="sm"
              type="button"
              variant={!defaultVisible ? "default" : "outline"}
              onClick={() => setBalanceDefault(false)}
            >
              <EyeOff className="size-4" aria-hidden="true" />
              Hidden
            </Button>
            <Button
              aria-pressed={defaultVisible}
              size="sm"
              type="button"
              variant={defaultVisible ? "default" : "outline"}
              onClick={() => setBalanceDefault(true)}
            >
              <Eye className="size-4" aria-hidden="true" />
              Visible
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Appearance</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              aria-pressed={isThemeReady && resolvedTheme === "light"}
              size="sm"
              type="button"
              variant={isThemeReady && resolvedTheme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              <Sun className="size-4" aria-hidden="true" />
              Light
            </Button>
            <Button
              aria-pressed={isThemeReady && resolvedTheme === "dark"}
              size="sm"
              type="button"
              variant={isThemeReady && resolvedTheme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
              <Moon className="size-4" aria-hidden="true" />
              Dark
            </Button>
          </div>
        </div>
        <Button
          className="mt-3 w-full justify-start"
          disabled={isLoggingOut}
          type="button"
          variant="outline"
          onClick={handleLogout}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {isLoggingOut ? "Signing out..." : "Log out"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}