// Client-only helpers for remembering split groups and passcodes on this device.
// The feature deliberately has no server-side "my groups" list — a group is
// reachable only via its shared slug URL — so we keep a lightweight local
// history and cache passcodes in localStorage so a device isn't re-prompted.

export type RecentSplitGroup = {
  slug: string;
  name: string;
  currency: string;
  lastOpened: number;
};

const RECENTS_KEY = "split-groups-recent";
const MAX_RECENTS = 12;

function passcodeKey(slug: string) {
  return `split-pass-${slug}`;
}

export function getRecentSplitGroups(): RecentSplitGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSplitGroup[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.slug === "string")
      .sort((a, b) => b.lastOpened - a.lastOpened);
  } catch {
    return [];
  }
}

export function rememberSplitGroup(
  entry: Omit<RecentSplitGroup, "lastOpened">
): void {
  if (typeof window === "undefined") return;
  const existing = getRecentSplitGroups().filter((item) => item.slug !== entry.slug);
  const next = [{ ...entry, lastOpened: Date.now() }, ...existing].slice(
    0,
    MAX_RECENTS
  );
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked — recents are best-effort only.
  }
}

export function forgetSplitGroup(slug: string): void {
  if (typeof window === "undefined") return;
  const next = getRecentSplitGroups().filter((item) => item.slug !== slug);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    window.localStorage.removeItem(passcodeKey(slug));
  } catch {
    // Best effort.
  }
}

export function getStoredPasscode(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(passcodeKey(slug));
  } catch {
    return null;
  }
}

export function storePasscode(slug: string, passcode: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(passcodeKey(slug), passcode);
  } catch {
    // Best effort.
  }
}

export function clearStoredPasscode(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(passcodeKey(slug));
  } catch {
    // Best effort.
  }
}
