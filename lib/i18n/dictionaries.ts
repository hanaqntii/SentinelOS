import type { Locale } from "@/store/ui.store";
import en from "@/messages/en.json";
import fa from "@/messages/fa.json";

export interface Dictionary {
  [key: string]: string | Dictionary;
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  fa: fa as Dictionary
};

export const translateKey = (locale: Locale, key: string): string => {
  const chunks = key.split(".");
  let cursor: string | Dictionary | undefined = dictionaries[locale];

  for (const chunk of chunks) {
    if (!cursor || typeof cursor === "string") {
      return key;
    }
    cursor = cursor[chunk];
  }

  return typeof cursor === "string" ? cursor : key;
};
