"use client";

import { translateKey } from "@/lib/i18n/dictionaries";
import { useUiStore } from "@/store";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useUiStore((state) => state.locale);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
          <p className="text-lg font-semibold">{translateKey(locale, "global.somethingWentWrong")}</p>
          <p className="mt-2 text-sm text-slate-300">{error.message}</p>
          <button
            onClick={reset}
            className="mt-4 rounded bg-brand-600 px-3 py-2 text-sm font-medium hover:bg-brand-700"
          >
            {translateKey(locale, "global.tryAgain")}
          </button>
        </div>
      </body>
    </html>
  );
}
