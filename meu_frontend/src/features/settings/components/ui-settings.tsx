"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "@/trpc/client";
import { reportClientError } from "@/lib/logging/client-error-report";

function reportSettingsFailure(error: unknown, event: "settings_load_failed" | "settings_save_failed") {
  const code = (error as { data?: { code?: unknown } } | null)?.data?.code;
  if (code === "UNAUTHORIZED") return;
  reportClientError("settings", event);
}

/**
 * Named look presets. Each one is a COMPLETE theme — palette, corner
 * radius and light/dark mode change together so the whole app's look
 * and feel shifts as a unit. Colors alone are not exposed; pick a look.
 */
export type LookTheme = "sculpt-dark" | "sculpt-light";

export type LookPreset = {
  id: LookTheme;
  label: string;
  description: string;
  swatch: [string, string];
  mode: "dark" | "light";
  radius: number;
};

export const LOOK_THEMES: LookPreset[] = [
  {
    id: "sculpt-dark",
    label: "Graphite",
    mode: "dark",
    radius: 1,
    description:
      "Charcoal surfaces, sculpted shadows and forest green actions.",
    swatch: ["#303438", "#205a46"],
  },
  {
    id: "sculpt-light",
    label: "Pearl",
    mode: "light",
    radius: 1,
    description:
      "Warm stone surfaces with solid forest green and apricot panels.",
    swatch: ["#e6e3df", "#205a46"],
  },
];

const DEFAULT_LOOK: LookTheme = "sculpt-dark";

// Preserve the user's light/dark choice when migrating the previous looks.
const LEGACY_MAP: Record<string, LookTheme> = { ledger: "sculpt-light" };

export function normalizeLook(value?: string): LookTheme {
  if (!value) return DEFAULT_LOOK;
  return (
    LOOK_THEMES.find((look) => look.id === value)?.id ??
    LEGACY_MAP[value] ??
    DEFAULT_LOOK
  );
}

export type SidebarSide = "left" | "right";

// Sidebar position was removed as a user setting — it is pinned to the left.
type UISettings = {
  look: LookTheme;
};

const DEFAULTS: UISettings = {
  look: DEFAULT_LOOK,
};

const STORAGE_KEY = "meu:ui-settings";

let cache: UISettings | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): UISettings {
  if (!cache && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // Legacy stored shape had { colorTheme, radius } — migrate it.
      const parsed = raw ? JSON.parse(raw) : {};
      cache = {
        look: normalizeLook(parsed.look ?? parsed.colorTheme),
      };
    } catch {
      cache = DEFAULTS;
    }
  }
  return cache ?? DEFAULTS;
}

function getServerSnapshot(): UISettings {
  return DEFAULTS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(patch: Partial<UISettings>) {
  const next = { ...getSnapshot(), ...patch };
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  applySettings(next);
  listeners.forEach((listener) => listener());
}

// Fire-and-forget persistence to the user's profile (protectedProcedure —
// silently skipped when logged out)
function syncToServer(patch: Partial<UISettings>) {
  api.settings.updateUi.mutate(patch).catch((error) => reportSettingsFailure(error, "settings_save_failed"));
}

/** Mirrors the inline boot script in app/layout.tsx — keep both in sync. */
export function applySettings(settings: UISettings) {
  const root = document.documentElement;
  const preset = LOOK_THEMES.find((look) => look.id === settings.look);

  // Always set the attribute — the default look has its own [data-theme]
  // block and MUST NOT be stripped, or its styles never apply.
  root.dataset.theme = settings.look;
  if (preset?.mode === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
  root.style.setProperty("--radius", `${preset?.radius ?? 0}rem`);
}

export function useUISettings() {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    applySettings(getSnapshot());

    // Hydrate from the user's saved profile (server wins over localStorage)
    api.settings.getUi
      .query()
      .then((result) => {
        if (!result.uiSettings) return;
        const stored = result.uiSettings as Record<string, unknown>;
        const patch: Partial<UISettings> = {};
        if (
          typeof stored.colorTheme === "string" ||
          typeof stored.look === "string"
        ) {
          patch.look = normalizeLook(
            (stored.look ?? stored.colorTheme) as string,
          );
        }
        update(patch);
      })
      .catch((error) => reportSettingsFailure(error, "settings_load_failed"));
  }, []);

  const setLook = useCallback((look: LookTheme) => {
    update({ look });
    syncToServer({ look });
  }, []);
  const resetToDefaults = useCallback(() => {
    update(DEFAULTS);
    syncToServer(DEFAULTS);
  }, []);

  return { ...settings, setLook, resetToDefaults };
}
