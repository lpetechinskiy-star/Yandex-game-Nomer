export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

export const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
