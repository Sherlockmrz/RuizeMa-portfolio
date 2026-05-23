"use client";

import { cn } from "@/lib/utils";
import { type ThemeName, useTheme } from "./ThemeProvider";

const themeOptions: { value: ThemeName; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
];

type ThemeSwitcherProps = {
  compact?: boolean;
};

export function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <label className="theme-switcher inline-flex shrink-0 items-center rounded-full border px-2 py-1">
        <span className="sr-only">Theme selector</span>
        <select
          value={theme}
          onChange={(event) => setTheme(event.target.value as ThemeName)}
          className="theme-switcher-select bg-transparent text-xs font-semibold outline-none"
          aria-label="Theme selector"
        >
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      className={cn(
        "theme-switcher inline-flex shrink-0 items-center rounded-full border p-1",
        "gap-1",
      )}
      aria-label="Theme selector"
    >
      {themeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={theme === option.value}
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
          className="theme-switcher-button rounded-full px-3 py-1.5 text-xs font-semibold transition"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
