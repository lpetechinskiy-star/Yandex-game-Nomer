import { COUNTRIES, type CountryId } from "../config/countries";
import { RANKS } from "../config/ranks";
import type { Tag } from "../core/evaluate";
import { toCurrency } from "../core/price";
import { locale, t, type I18nKey } from "../i18n";

/** Сумма в рублях, показанная в валюте выбранной страны. */
export function money(rub: number, country: CountryId): string {
  const c = COUNTRIES[country];
  const v = toCurrency(rub, country);
  const small = Math.abs(v) < 100 && c.rate < 1;
  const digits = small ? 2 : 0;
  return `${v.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${c.currency}`;
}

export const num = (n: number) => Math.round(n).toLocaleString(locale());

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h, m, x].map((v) => String(v).padStart(2, "0")).join(":");
}

export const tierName = (tier: number) => t(`tier.${tier}` as I18nKey);
export const countryName = (c: CountryId) => t(`country.${c}` as I18nKey);
export const carName = (id: string) => t(`car.${id}` as I18nKey);
export const rankName = (i: number) => t(`rank.${RANKS[i].id}` as I18nKey);
export const buyerName = (id: string) => t(`buyer.${id}` as I18nKey);
export const cityName = (city: string) => t(`city.${city}` as I18nKey);

export function tagLabel(tag: Tag, region?: string): string {
  if (tag.key === "seven" && tag.n) return t(tag.n >= 4 ? "tag.seven.4" : "tag.seven.3");
  if (tag.key === "short" && tag.n) return t("tag.short.n", { n: tag.n });
  if (tag.key === "region" && tag.city) return `${cityName(tag.city)} · ${region ?? ""}`;
  return t(`tag.${tag.key}` as I18nKey);
}

export const odds = (n: number | null) => (n === null ? t("odds.choice") : t("odds", { n: num(n) }));
