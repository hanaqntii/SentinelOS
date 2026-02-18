"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/store/ui.store";

export function useI18n() {
  const locale = useLocale() as Locale;
  const translate = useTranslations();

  const t = useCallback(
    (key: string) => {
      try {
        return translate(key as never);
      } catch {
        return key;
      }
    },
    [translate]
  );

  return { locale, t };
}
