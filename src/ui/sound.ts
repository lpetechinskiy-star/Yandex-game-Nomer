// Звуки синтезируются WebAudio — без файлов. Звук выключается кнопкой и на паузе (реклама, свёрнутая вкладка).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let paused = false;

function audio(): AudioContext | null {
  if (muted || paused) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function apply(): void {
  if (!ctx || !master) return;
  const silent = muted || paused;
  master.gain.setValueAtTime(silent ? 0 : 1, ctx.currentTime);
  if (silent) void ctx.suspend().catch(() => {});
  else void ctx.resume().catch(() => {});
}

export function setMuted(v: boolean): void {
  muted = v;
  apply();
}

export function setSoundPaused(v: boolean): void {
  paused = v;
  apply();
}

export function beep(freq: number, dur = 0.05, type: OscillatorType = "square", vol = 0.03): void {
  const ac = audio();
  if (!ac || !master) return;
  try {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {
    // Без звука игра работает так же.
  }
}

export const chime = (tier: number) =>
  (tier >= 4 ? [523, 659, 784, 1047, 1319] : tier >= 3 ? [523, 659, 784, 1047] : [587, 784]).forEach((f, i) =>
    setTimeout(() => beep(f, 0.18, "triangle", 0.06), i * 90));

export const cashSound = () => [988, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.12, "square", 0.03), i * 70));
