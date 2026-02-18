import { redirect } from "@/i18n/navigation";

interface LocalePageProps {
  params: {
    locale: "en" | "fa";
  };
}

export default function LocaleHomePage({ params }: LocalePageProps) {
  redirect({ href: "/login", locale: params.locale });
}
