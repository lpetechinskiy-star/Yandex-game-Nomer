// Требования модерации: без выделения текста, контекстного меню и масштабирования жестами.
export function installGuards(): void {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener("contextmenu", prevent);
  document.addEventListener("selectstart", prevent);
  document.addEventListener("dragstart", prevent);
  // Safari: щипок двумя пальцами.
  document.addEventListener("gesturestart", prevent);
  document.addEventListener("gesturechange", prevent);
  // Масштаб двумя пальцами в остальных браузерах.
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  // Двойной тап отключён через touch-action: manipulation в main.css.
  // Ctrl + колесо и Ctrl +/− на ПК.
  window.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
  });
}
