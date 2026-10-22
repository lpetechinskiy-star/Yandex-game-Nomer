import { COUNTRIES, type CountryId } from "../config/countries";
import { ECONOMY, PRICE } from "../config/economy";

/** Цена номера в рублях по очкам редкости. */
export function priceFor(score: number, country: CountryId): number {
  const raw = (PRICE.base + score * score * PRICE.scoreSquareK) * COUNTRIES[country].mult;
  return Math.max(PRICE.min, Math.round(raw / PRICE.step) * PRICE.step);
}

export const withX2 = (price: number, x2: boolean) => (x2 ? price * ECONOMY.x2Multiplier : price);

/** Перевод рублей в валюту страны. */
export const toCurrency = (rub: number, country: CountryId) => rub * COUNTRIES[country].rate;
