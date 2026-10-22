// Экономика игры. Все суммы — в рублях; в других странах они пересчитываются по курсу (countries.ts).

const HOUR = 3600 * 1000;

export const ECONOMY = {
  /** Деньги на старте новой игры. */
  startMoney: 10_000,
  /** Цена одной прокрутки цифр или букв. */
  spinCost: 100,
  /** Сколько номеров помещается в инвентарь. */
  inventoryMax: 11,
  /** Цена «Другой покупатель» на экране заказов. */
  replaceOrderCost: 200,
  /** Статусный регион стоит (очки региона × это число) за каждую смену. */
  regionCostPerPoint: 100,
  /** Множитель цены за просмотр рекламы «×2 к цене». */
  x2Multiplier: 2,
  /** Разовая награда за оценку игры. */
  reviewReward: 10_000,
  /** Начиная с этого уровня редкости повторная прокрутка требует подтверждения. */
  rareConfirmTier: 2,
  rareConfirmMs: 3000,
} as const;

/** Цена номера: max(min, round((base + score² × k) × множитель страны / step) × step). */
export const PRICE = {
  base: 30,
  scoreSquareK: 2,
  step: 10,
  min: 30,
} as const;

export const ORDERS_ECONOMY = {
  /** Сколько заказов висит одновременно. */
  slots: 3,
  /** Награда заказа = база × (min + random × spread), округлённая до step. */
  rewardMin: 0.9,
  rewardSpread: 0.35,
  rewardStep: 100,
} as const;

export const TIMERS = {
  wheelCooldownMs: 8 * HOUR,
  bonusPeriodMs: 24 * HOUR,
  /** Если бонус не забирали дольше этого, серия начинается заново. */
  bonusStreakResetMs: 48 * HOUR,
  /** Полноэкранная реклама: не чаще, чем раз в этот интервал, и не раньше него после запуска. */
  fullscreenIntervalMs: 2 * 60 * 1000,
  /** Длительность рекламы-заглушки в mock-режиме. */
  mockAdSeconds: 3,
} as const;

export const ADS = {
  /** Сколько реклам нужно посмотреть, чтобы крутить рулетку без ожидания. */
  wheelAdsNeeded: 2,
} as const;

/** Очки сезона: сохранение в инвентарь даёт очки номера, установка на авто — очки × класс машины. */
export const SEASON = {
  leaderboardName: "prestige",
  leaderboardTop: 10,
  leaderboardAround: 3,
} as const;

/** Подбор «редкого номера» для приза рулетки. */
export const RARE_PLATE = {
  minScore: 15,
  attempts: 4000,
} as const;
