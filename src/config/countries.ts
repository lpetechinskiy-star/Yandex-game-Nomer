// Страны, форматы номеров, регионы, статусные регионы и блатные серии.

export type CountryId = "ru" | "by" | "ua" | "kz" | "de" | "us";

export interface PrestigeRegion {
  /** Очки редкости за регион. */
  pts: number;
  /** Ключ города в i18n (city.*). */
  city: string;
}

export interface CountryDef {
  id: CountryId;
  /** Символ валюты. */
  currency: string;
  /** Курс: сколько единиц валюты стоит 1 рубль. */
  rate: number;
  /** Цена открытия страны в рублях; 0 — открыта с начала. */
  unlock: number;
  /** Номера этой страны дороже в столько раз. */
  mult: number;
  /** Буквы, которые бывают на номерах. */
  alphabet: string;
  letters: number;
  /** Число цифр; "var" — переменная длина (Германия, см. DE_DIGIT_LENGTHS). */
  digits: number | "var";
  regions: readonly string[];
  prestige: Readonly<Record<string, PrestigeRegion>>;
  blat: readonly string[];
  /** CSS-фон флажка. */
  flag: string;
  /** Номер-образец для карточки страны. */
  sample: { d: string; l: string; r: string };
}

const LATIN = "ABCDEFGHJKLMNPRSTUVWXYZ";

const RU_REGIONS: string[] = [];
for (let i = 1; i <= 99; i++) RU_REGIONS.push(String(i).padStart(2, "0"));
RU_REGIONS.push(
  "102", "116", "123", "124", "125", "134", "136", "138", "142", "150", "152", "154", "159", "161", "163", "164",
  "173", "174", "177", "178", "186", "190", "196", "197", "198", "199", "750", "761", "774", "790", "797", "799", "777",
);

function prestige(groups: [string, Record<string, number>][]): Record<string, PrestigeRegion> {
  const out: Record<string, PrestigeRegion> = {};
  for (const [city, regions] of groups) for (const r in regions) out[r] = { pts: regions[r], city };
  return out;
}

export const COUNTRIES: Readonly<Record<CountryId, CountryDef>> = {
  ru: {
    id: "ru", currency: "₽", rate: 1, unlock: 0, mult: 1,
    alphabet: "АВЕКМНОРСТУХ", letters: 3, digits: 3,
    regions: RU_REGIONS,
    prestige: prestige([
      ["moscow", { "77": 15, "97": 12, "99": 12, "177": 10, "197": 8, "199": 10, "777": 30, "797": 15, "799": 15 }],
      ["spb", { "78": 10, "98": 8, "178": 8, "198": 8 }],
      ["moscowRegion", { "50": 6, "90": 6, "150": 5, "190": 5, "750": 8 }],
    ]),
    blat: ["ЕКХ", "АМР", "ВОР", "КМР", "ОМР"],
    flag: "linear-gradient(#fff 0 33%,#1c50c8 33% 66%,#d52b1e 66%)",
    sample: { d: "777", l: "ЕКХ", r: "77" },
  },
  by: {
    id: "by", currency: "Br", rate: 0.035, unlock: 5000, mult: 1.2,
    alphabet: "ABEIKMHOPCTX", letters: 2, digits: 4,
    regions: ["1", "2", "3", "4", "5", "6", "7"],
    prestige: prestige([["minsk", { "7": 12 }]]),
    blat: [],
    flag: "linear-gradient(90deg,#fff 0 16%,transparent 16%),linear-gradient(#c8313e 0 66%,#4aa657 66%)",
    sample: { d: "1234", l: "AB", r: "7" },
  },
  ua: {
    id: "ua", currency: "₴", rate: 0.5, unlock: 5000, mult: 1.2,
    alphabet: "ABCEHIKMOPTX", letters: 2, digits: 4,
    regions: ["AA", "KA", "AI", "AX", "BH", "AE", "BC", "AP", "AH", "AM", "BI", "BK", "BM", "BO", "AB", "AC", "AT", "AO", "CA", "CB", "CE"],
    prestige: prestige([["kyiv", { AA: 12, KA: 10 }], ["odesa", { BH: 6 }], ["lviv", { BC: 6 }]]),
    blat: [],
    flag: "linear-gradient(#0057b7 0 50%,#ffd700 50%)",
    sample: { d: "7777", l: "AA", r: "AA" },
  },
  kz: {
    id: "kz", currency: "₸", rate: 5.6, unlock: 8000, mult: 1.3,
    alphabet: LATIN, letters: 3, digits: 3,
    regions: Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(2, "0")),
    prestige: prestige([["astana", { "01": 12 }], ["almaty", { "02": 12 }], ["shymkent", { "17": 6 }]]),
    blat: [],
    flag: "radial-gradient(circle at 55% 45%,#fec50c 0 22%,transparent 24%),#00afca",
    sample: { d: "777", l: "AAA", r: "02" },
  },
  de: {
    id: "de", currency: "€", rate: 0.011, unlock: 20000, mult: 1.6,
    alphabet: LATIN, letters: 2, digits: "var",
    regions: ["B", "M", "HH", "F", "K", "S", "D", "DO", "E", "L", "H", "N", "KA", "HD", "MZ", "WI", "BN", "AC"],
    prestige: prestige([["berlin", { B: 12 }], ["munich", { M: 12 }], ["hamburg", { HH: 10 }], ["frankfurt", { F: 8 }]]),
    blat: [],
    flag: "linear-gradient(#111 0 33%,#dd0000 33% 66%,#ffce00 66%)",
    sample: { d: "1", l: "AB", r: "M" },
  },
  us: {
    id: "us", currency: "$", rate: 0.012, unlock: 30000, mult: 1.8,
    alphabet: LATIN, letters: 3, digits: 4,
    regions: ["Nevada", "California", "New York", "Texas", "Florida", "Arizona", "Utah", "Ohio", "Oregon", "Alaska"],
    prestige: prestige([["nevada", { Nevada: 12 }], ["california", { California: 10 }], ["newYork", { "New York": 10 }]]),
    blat: [],
    flag: "repeating-linear-gradient(#b22234 0 2px,#fff 2px 4px)",
    sample: { d: "7777", l: "VIP", r: "Nevada" },
  },
};

export const COUNTRY_ORDER: readonly CountryId[] = ["ru", "by", "ua", "kz", "de", "us"];

/** Германия: вероятности длины цифровой части (накопительно не нужно — веса). */
export const DE_DIGIT_LENGTHS: readonly { len: number; weight: number }[] = [
  { len: 1, weight: 0.02 },
  { len: 2, weight: 0.08 },
  { len: 3, weight: 0.30 },
  { len: 4, weight: 0.60 },
];

/** Девизы штатов США на номере. */
export const US_SLOGANS: Readonly<Record<string, string>> = {
  Nevada: "THE SILVER STATE",
  California: "THE GOLDEN STATE",
  Texas: "LONE STAR STATE",
  Florida: "SUNSHINE STATE",
  "New York": "EMPIRE STATE",
  Arizona: "GRAND CANYON STATE",
  Alaska: "THE LAST FRONTIER",
};

/** Регион для первого номера новой игры. */
export const START_REGION = "01";
