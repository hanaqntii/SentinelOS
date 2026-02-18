import type { Metadata } from "next";
import { AppPreferencesProvider } from "@/components/providers/app-preferences-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelOS",
  description: "Enterprise-grade multi-device health monitoring SaaS"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppPreferencesProvider>{children}</AppPreferencesProvider>
      </body>
    </html>
  );
}
