"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { LoginForm } from "@/modules/auth/components/login-form";
import { useAuthStore } from "@/store";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{t("common.preparingSignIn")}</p>
      </main>
    );
  }

  return <LoginForm />;
}
