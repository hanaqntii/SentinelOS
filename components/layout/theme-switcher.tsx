"use client";

import { useI18n } from "@/lib/i18n/use-i18n";
import { useUiStore } from "@/store";

export function ThemeSwitcher() {
  const { t } = useI18n();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
      title={t("common.theme")}
    >
      {theme === "dark" ? t("common.light") : t("common.dark")}
    </button>
  );
}
