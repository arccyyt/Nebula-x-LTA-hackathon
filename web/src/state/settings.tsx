import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Mobility, Persona } from "../types";
import { PERSONAS } from "../types";

export type Language = "en" | "zh" | "ms" | "ta";

export interface Settings {
  persona: Persona;
  mobility: Mobility;
  fontScale: number; // 1 = base
  highContrast: boolean;
  language: Language;
  age: number | null;
  onboardingDone: boolean;
  soundOn: boolean;
  userId: string;
}

const DEFAULT_SETTINGS: Settings = {
  persona: "mdmlim",
  mobility: "wheelchair",
  fontScale: 1,
  highContrast: false,
  language: "en",
  age: null,
  onboardingDone: false,
  soundOn: true,
  userId: "",
};

const KEY = "scc.settings.v1";

function makeUserId(): string {
  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS, userId: makeUserId() };
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  setPersona: (p: Persona) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(settings.fontScale));
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
  }, [settings.fontScale, settings.highContrast]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const setPersona = (p: Persona) => {
    const preset = PERSONAS.find((x) => x.id === p);
    setSettings((s) => ({ ...s, persona: p, mobility: preset?.mobility ?? s.mobility, fontScale: preset?.fontScaleDefault ?? s.fontScale }));
  };

  return <SettingsContext.Provider value={{ settings, update, setPersona }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
