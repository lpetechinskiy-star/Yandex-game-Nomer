import { en } from "./en";
import { ru, type I18nKey } from "./ru";

export type Lang = "ru" | "en";
export type { I18nKey };

/** Языки, для которых показываем русскую версию. */
const RUSSIAN_LIKE = new Set(["ru", "be", "kk", "uk", "uz"]);

let lang: Lang = "ru";
let dict: Record<I18nKey, string> = ru;

export function setLang(code: string | undefined | null): Lang {
  const base = (code || "ru").toLowerCase().slice(0, 2);
  lang = RUSSIAN_LIKE.has(base) ? "ru" : "en";
  dict = lang === "ru" ? ru : en;
  document.documentElement.lang = lang;
  return lang;
}

export const getLang = () => lang;
export const hasKey = (key: string): key is I18nKey => key in ru;
export const locale = () => (lang === "ru" ? "ru-RU" : "en-US");

function pluralIndex(n: number): number {
  if (lang === "en") return n === 1 ? 0 : 1;
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 2;
  if (b === 1) return 0;
  if (b >= 2 && b <= 4) return 1;
  return 2;
}

/** Перевод с подстановкой параметров: t("inv.count", { n: 3, max: 11 }). */
export function t(key: I18nKey, params?: Record<string, string | number>): string {
  let s = dict[key] ?? ru[key] ?? key;
  if (!params) return s;
  s = s.replace(/\{(\w+)\|([^}]+)\}/g, (_, name: string, forms: string) => {
    const n = Number(params[name]);
    const f = forms.split("|");
    return `${params[name]} ${f[Math.min(pluralIndex(n), f.length - 1)]}`;
  });
  return s.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}
