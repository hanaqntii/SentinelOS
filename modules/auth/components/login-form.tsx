"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useAuthStore } from "@/store";
import type { UserRole } from "@/types";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

const ROLE_OPTIONS: UserRole[] = ["admin", "operator", "viewer"];

export function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedRole, setSelectedRole] = useState<UserRole>("operator");
  const { loginAs, isLoading } = useAuthStore();

  const submitLabel = useMemo(
    () =>
      isLoading
        ? t("login.signingIn")
        : `${t("login.continueAs")} ${t(`roleTitle.${selectedRole}`)}`,
    [isLoading, selectedRole, t]
  );

  const handleSubmit = async () => {
    await loginAs(selectedRole);
    router.replace("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-black/20">
        <div className="mb-5 flex items-center justify-end gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>

        <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("login.description")}</p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {ROLE_OPTIONS.map((role) => {
            const active = role === selectedRole;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-brand-600 bg-brand-600/10"
                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                }`}
              >
                <p className="text-sm font-semibold">{t(`roleTitle.${role}`)}</p>
                <p className="mt-1 text-xs text-slate-400">{t(`roleDescription.${role}`)}</p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLabel}
        </button>
      </div>
    </main>
  );
}
