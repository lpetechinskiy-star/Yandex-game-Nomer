import type { Rng } from "./random";
import { newGame, restore, SAVE_VERSION, type GameState } from "./state";

export const LOCAL_SAVE_KEY = "nomernoy-perekup-save-v1";

/** Облачное хранилище (Yandex player.setData/getData). Доступно только залогиненному игроку. */
export interface CloudStore {
  available(): boolean;
  load(): Promise<unknown>;
  save(data: object, flush: boolean): Promise<void>;
}

function readLocal(): unknown {
  try {
    const raw = localStorage.getItem(LOCAL_SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(s: GameState): void {
  try {
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(s));
  } catch {
    // Приватный режим или переполнено хранилище — играем без сохранения.
  }
}

const savedAt = (x: unknown) => (x && typeof x === "object" && typeof (x as { savedAt?: unknown }).savedAt === "number" ? (x as { savedAt: number }).savedAt : 0);

/** Загружает игру: из облака, если игрок залогинен, иначе из localStorage. Берёт более свежее сохранение. */
export async function loadGame(cloud: CloudStore | null, rng: Rng): Promise<GameState> {
  const local = readLocal();
  let remote: unknown = null;
  if (cloud?.available()) {
    try {
      remote = await cloud.load();
    } catch {
      remote = null;
    }
  }
  const best = savedAt(remote) > savedAt(local) ? remote : local;
  return restore(best, rng) ?? restore(local, rng) ?? newGame(rng);
}

/** Сохраняет в localStorage сразу, в облако — не чаще раза в cloudDelayMs. */
export class Saver {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: GameState | null = null;

  constructor(private cloud: CloudStore | null, private cloudDelayMs = 3000) {}

  save(s: GameState): void {
    s.v = SAVE_VERSION;
    s.savedAt = Date.now();
    writeLocal(s);
    if (!this.cloud?.available()) return;
    this.pending = s;
    if (!this.timer) this.timer = setTimeout(() => this.flushCloud(false), this.cloudDelayMs);
  }

  /** Немедленная отправка в облако (при сворачивании вкладки). */
  flush(): void {
    this.flushCloud(true);
  }

  private flushCloud(force: boolean): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const s = this.pending;
    this.pending = null;
    if (s && this.cloud?.available()) this.cloud.save(JSON.parse(JSON.stringify(s)), force).catch(() => {});
  }
}
