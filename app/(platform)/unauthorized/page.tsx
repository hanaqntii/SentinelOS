"use client";

import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function UnauthorizedPage() {
  const { t } = useI18n();

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold">{t("unauthorized.title")}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {t("unauthorized.description")}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex rounded bg-brand-600 px-3 py-2 text-sm hover:bg-brand-700"
        >
          {t("unauthorized.backToDashboard")}
        </Link>
      </div>
    </main>
  );
}
