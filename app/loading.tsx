"use client";

import { useI18n } from "@/lib/i18n/use-i18n";

export default function GlobalLoading() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-400">{t("global.loadingPlatform")}</p>
    </div>
  );
}
