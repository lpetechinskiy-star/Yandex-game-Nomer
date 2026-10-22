// Ранги по очкам сезона и данные для mock-лидерборда.

export interface RankDef {
  /** Ключ в i18n: rank.<id>. */
  id: string;
  min: number;
  color: string;
}

export const RANKS: readonly RankDef[] = [
  { id: "bronze", min: 0, color: "#c58a54" },
  { id: "silver", min: 300, color: "#9aa4b1" },
  { id: "gold", min: 700, color: "#e2b33a" },
  { id: "platinum", min: 1500, color: "#5fb3c7" },
  { id: "diamond", min: 3000, color: "#4f7fe0" },
  { id: "legend", min: 6000, color: "#7c4dd8" },
];

/** Соперники в лидерборде при локальной разработке (mock SDK). */
export const MOCK_LEADERBOARD: readonly { name: string; score: number }[] = [
  { name: "Артём К.", score: 7889 },
  { name: "Ксения Л.", score: 4858 },
  { name: "Денис_77", score: 3934 },
  { name: "Перекуп_2007", score: 3420 },
  { name: "Ильдар", score: 3378 },
  { name: "Блатной_77", score: 2610 },
  { name: "Мария С.", score: 1980 },
  { name: "АвтоКоля", score: 1430 },
  { name: "Ваня_В777", score: 920 },
  { name: "Лёха_Приора", score: 610 },
  { name: "Самара163", score: 340 },
  { name: "ТТ_Вова", score: 120 },
];

/** Цвета аватарок-инициалов в лидерборде. */
export const AVATAR_COLORS: readonly string[] = [
  "#f2a33a", "#e86a8a", "#8b6a4f", "#6b7a8c", "#4b8fd6", "#2e6b3f", "#c25bd1", "#d6693a", "#3aa3a3", "#8a6fd6", "#a08a3a",
];
