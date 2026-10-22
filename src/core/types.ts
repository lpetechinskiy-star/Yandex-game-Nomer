import type { CountryId } from "../config/countries";

/** Номер на экране создания: цифры или буквы могут быть ещё не прокручены. */
export interface DraftPlate {
  c: CountryId;
  d: string | null;
  l: string | null;
  r: string;
}

/** Готовый номер. */
export interface Plate {
  c: CountryId;
  d: string;
  l: string;
  r: string;
}

/** Номер в инвентаре или на машине. */
export interface OwnedPlate extends Plate {
  /** Цена удвоена за рекламу. */
  x2: boolean;
}

export interface InventoryPlate extends OwnedPlate {
  id: number;
}

export const isComplete = (p: DraftPlate): p is Plate => !!p.d && !!p.l;
