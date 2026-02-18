"use client";

import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { useUiStore } from "@/store";
import type { Locale } from "@/store/ui.store";

interface AppPreferencesProviderProps {
  children: React.ReactNode;
}

export function AppPreferencesProvider({ children }: AppPreferencesProviderProps) {
  const pathname = usePathname();
  const { locale, setLocale, theme, hasHydrated } = useUiStore();

  useEffect(() => {
    const segment = pathname.split("/")[1];
    if (segment === "en" || segment === "fa") {
      const routeLocale = segment as Locale;
      if (routeLocale !== locale) {
        setLocale(routeLocale);
      }
    }
  }, [locale, pathname, setLocale]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "fa" ? "rtl" : "ltr";
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [locale, theme]);

  if (!hasHydrated) {
    return null;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={dictionaries[locale] as never}>
      {children}
    </NextIntlClientProvider>
  );
}
