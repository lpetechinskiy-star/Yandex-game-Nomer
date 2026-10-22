// Пауза игры: во время рекламы, при сворачивании вкладки и по запросу площадки.
// На паузе выключается звук и вызывается GameplayAPI.stop().

export type PauseReason = "ad" | "hidden" | "platform";

const reasons = new Set<PauseReason>();
const listeners: ((paused: boolean) => void)[] = [];

export const isPaused = () => reasons.size > 0;

export function setPaused(reason: PauseReason, on: boolean): void {
  const was = isPaused();
  if (on) reasons.add(reason);
  else reasons.delete(reason);
  const now = isPaused();
  if (was !== now) for (const cb of listeners) cb(now);
}

export function onPauseChange(cb: (paused: boolean) => void): void {
  listeners.push(cb);
}

export function watchVisibility(onHide: () => void): void {
  const sync = () => {
    setPaused("hidden", document.hidden);
    if (document.hidden) onHide();
  };
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", onHide);
  sync();
}
