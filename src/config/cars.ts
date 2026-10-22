// Машины и предложения магазина.
//
// Картинка машины лежит в public/cars/. Номер ставится поверх картинки:
//   plateX, plateY — центр номера в процентах от ширины и высоты картинки,
//   plateW         — ширина европейского номера в процентах от ширины картинки.
// Подобрать координаты для новой картинки удобно в гараже с параметром ?plates
// (только в npm run dev): появятся ползунки и готовая строка для этого файла.

export interface CarDef {
  id: string;
  /** Путь относительно public/. */
  img: string;
  /** Класс машины: очки сезона за установку номера умножаются на него. */
  cls: number;
  plateX: number;
  plateY: number;
  plateW: number;
}

export const CARS: readonly CarDef[] = [
  { id: "2109", img: "cars/vaz-2109.svg", cls: 1.2, plateX: 50, plateY: 73.6, plateW: 15 },
  { id: "vesta", img: "cars/lada-vesta.svg", cls: 1.4, plateX: 50, plateY: 73.6, plateW: 15 },
  { id: "merc", img: "cars/mercedes-e.svg", cls: 2.2, plateX: 50, plateY: 69.6, plateW: 15 },
  { id: "lambo", img: "cars/lamborghini.svg", cls: 4, plateX: 50, plateY: 66.8, plateW: 15 },
];

/** Номер США почти квадратный: его ширина = plateW × этот множитель. */
export const US_PLATE_WIDTH_FACTOR = 0.55;

export interface OfferDef {
  id: string;
  cars: readonly string[];
  /** Сколько реклам нужно посмотреть (если предложение за рекламу). */
  ads?: number;
  /** Деньги за каждую просмотренную рекламу. */
  adBonus?: number;
  /** Цена в рублях (если предложение за деньги). */
  price?: number;
  head: "blue" | "black" | "gold";
}

export const OFFERS: readonly OfferDef[] = [
  { id: "lada", cars: ["2109", "vesta"], ads: 1, head: "blue" },
  { id: "merc", cars: ["merc"], ads: 3, adBonus: 2500, head: "black" },
  { id: "lambo", cars: ["lambo"], price: 150_000, head: "gold" },
];
