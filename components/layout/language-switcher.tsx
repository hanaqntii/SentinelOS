"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useUiStore } from "@/store";
import type { Locale } from "@/store/ui.store";

export function LanguageSwitcher() {
  const { t } = useI18n();
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const nextLocale: Locale = locale === "en" ? "fa" : "en";
        setLocale(nextLocale);
        router.replace(pathname, { locale: nextLocale });
      }}
      className="rounded border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
      title={t("common.language")}
    >
      {locale === "en" ? "FA" : "EN"}
    </button>
  );
}
