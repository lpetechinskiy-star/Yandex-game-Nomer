// Рисует заглушки машин (вид сзади) в public/cars/*.svg и печатает координаты номера для src/config/cars.ts.
// Когда появятся настоящие картинки, положите их в public/cars/, поправьте img и координаты в конфиге,
// а этот скрипт больше не запускайте.
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1000, H = 560, CX = 500, GROUND = 500;
const PLATE_W = 150, PLATE_H = PLATE_W * 112 / 520;

const CARS = [
  { id: "vaz-2109", body: "#a3242b", half: 285, roof: 150, roofHalf: 215, belt: 290, bottom: 448, plateY: 412, trunk: false, lights: "block" },
  { id: "lada-vesta", body: "#d2601a", half: 300, roof: 168, roofHalf: 190, belt: 288, bottom: 450, plateY: 412, trunk: true, lights: "wide" },
  { id: "mercedes-e", body: "#23262d", half: 318, roof: 176, roofHalf: 188, belt: 286, bottom: 446, plateY: 390, trunk: true, lights: "merc", chrome: true },
  { id: "lamborghini", body: "#f2b705", half: 360, roof: 222, roofHalf: 150, belt: 300, bottom: 438, plateY: 374, trunk: false, lights: "y", supercar: true },
];

const f = (n) => +n.toFixed(1);

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function svg(c) {
  const { half, roof, roofHalf, belt, bottom } = c;
  const L = CX - half, R = CX + half;
  const cabinHalf = half - 22;
  const dark = shade(c.body, -0.35), light = shade(c.body, 0.35);
  const tyreW = c.supercar ? 110 : 84;
  const p = [];
  p.push(`<defs>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".45" stop-color="${c.body}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6b7c"/><stop offset=".6" stop-color="#1f2731"/><stop offset="1" stop-color="#11161c"/></linearGradient>
  <linearGradient id="lamp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a6b"/><stop offset="1" stop-color="#a3100a"/></linearGradient>
  <radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>`);
  p.push(`<ellipse cx="${CX}" cy="${GROUND}" rx="${half + 70}" ry="34" fill="url(#shadow)"/>`);
  // колёса
  for (const x of [L + 18, R - 18 - tyreW]) p.push(`<rect x="${x}" y="${bottom - 50}" width="${tyreW}" height="${GROUND - bottom + 50}" rx="16" fill="#18191b"/>`);
  // зеркала
  for (const s of [-1, 1]) {
    const x = CX + s * (cabinHalf + 6);
    p.push(`<path d="M${x} ${belt - 34} l${s * 44} -6 l${s * 4} 22 l${-s * 46} 8 z" fill="${dark}"/>`);
  }
  // кабина
  const ch = cabinHalf - (c.supercar ? 70 : 0);
  p.push(`<path d="M${CX - ch} ${belt} L${CX - roofHalf} ${roof + 8} Q${CX - roofHalf + 4} ${roof} ${CX - roofHalf + 16} ${roof} L${CX + roofHalf - 16} ${roof} Q${CX + roofHalf - 4} ${roof} ${CX + roofHalf} ${roof + 8} L${CX + ch} ${belt} Z" fill="url(#body)"/>`);
  const gi = 16, gTop = roof + 14, gBot = belt - (c.trunk ? 30 : 10);
  const t = (y) => (y - roof) / (belt - roof);
  const gx = (y) => roofHalf + (ch - roofHalf) * t(y) - gi;
  p.push(`<path d="M${f(CX - gx(gBot))} ${gBot} L${f(CX - gx(gTop))} ${gTop} L${f(CX + gx(gTop))} ${gTop} L${f(CX + gx(gBot))} ${gBot} Z" fill="url(#glass)"/>`);
  p.push(`<path d="M${f(CX - gx(gTop) + 30)} ${gTop + 8} L${f(CX - gx(gTop) + 120)} ${gTop + 8} L${f(CX - gx(gBot) + 60)} ${gBot - 6} L${f(CX - gx(gBot) + 20)} ${gBot - 6} Z" fill="#fff" opacity=".08"/>`);
  if (!c.trunk) p.push(`<rect x="${CX - 50}" y="${gTop + 6}" width="100" height="8" rx="4" fill="#c4292a" opacity=".9"/>`);
  // кузов
  p.push(`<path d="M${L + 10} ${belt - 6} Q${CX} ${belt - 26} ${R - 10} ${belt - 6} Q${R + 4} ${belt} ${R} ${belt + 30} L${R - 6} ${bottom - 14} Q${R - 8} ${bottom} ${R - 26} ${bottom} L${L + 26} ${bottom} Q${L + 8} ${bottom} ${L + 6} ${bottom - 14} L${L} ${belt + 30} Q${L - 4} ${belt} ${L + 10} ${belt - 6} Z" fill="url(#body)"/>`);
  if (c.trunk) p.push(`<path d="M${L + 70} ${belt + 18} Q${CX} ${belt + 4} ${R - 70} ${belt + 18}" stroke="${dark}" stroke-width="3" fill="none" opacity=".7"/>`);
  // фонари
  const ly = belt + 14;
  if (c.lights === "block") {
    for (const s of [-1, 1]) { const x = s < 0 ? L + 18 : R - 18 - 120; p.push(`<rect x="${x}" y="${ly}" width="120" height="58" rx="6" fill="url(#lamp)"/><rect x="${x + 8}" y="${ly + 36}" width="${104}" height="14" rx="3" fill="#f5a623" opacity=".85"/><rect x="${x + 8}" y="${ly + 6}" width="104" height="6" rx="3" fill="#fff" opacity=".25"/>`); }
  } else if (c.lights === "wide") {
    for (const s of [-1, 1]) { const x0 = CX + s * (half - 14), x1 = CX + s * 120; p.push(`<path d="M${x0} ${ly} L${x1} ${ly + 8} L${x1} ${ly + 30} L${x0 - s * 30} ${ly + 52} Z" fill="url(#lamp)"/><path d="M${x0 - s * 10} ${ly + 14} L${x1 + s * 10} ${ly + 18}" stroke="#ffd2c8" stroke-width="3" opacity=".7"/>`); }
  } else if (c.lights === "merc") {
    for (const s of [-1, 1]) { const x0 = CX + s * (half - 10), x1 = CX + s * 150; p.push(`<path d="M${x0} ${ly + 2} L${x1} ${ly + 6} L${x1} ${ly + 30} L${x0 - s * 12} ${ly + 34} Z" fill="url(#lamp)"/><path d="M${x0 - s * 16} ${ly + 18} L${x1 + s * 8} ${ly + 18}" stroke="#ffe3dc" stroke-width="2.5" opacity=".8"/>`); }
    p.push(`<rect x="${CX - 150}" y="${ly + 16}" width="300" height="5" rx="2.5" fill="#d9dde3"/>`);
  } else {
    for (const s of [-1, 1]) { const x0 = CX + s * (half - 20), x1 = CX + s * (half - 150); p.push(`<path d="M${x0} ${ly - 4} L${x1} ${ly + 4} L${x1 + s * 4} ${ly + 12} L${x0 - s * 6} ${ly + 8} Z M${x1 + s * 40} ${ly + 8} L${x1 + s * 70} ${ly + 40} L${x1 + s * 60} ${ly + 44} L${x1 + s * 30} ${ly + 12} Z" fill="#ff3b30"/>`); }
    // решётка моторного отсека
    for (let i = 0; i < 5; i++) p.push(`<rect x="${CX - 150}" y="${belt - 4 + i * 12}" width="300" height="6" rx="3" fill="#15161a" opacity=".85"/>`);
  }
  // эмблема
  p.push(`<circle cx="${CX}" cy="${c.trunk ? belt + 40 : belt + 36}" r="${c.supercar ? 0 : 13}" fill="#d9dde3" stroke="${dark}" stroke-width="3"/>`);
  // бампер
  const bt = c.plateY - PLATE_H / 2 - 22;
  p.push(`<path d="M${L + 4} ${bt} Q${CX} ${bt - 10} ${R - 4} ${bt} L${R - 8} ${bottom - 12} Q${R - 10} ${bottom + 6} ${R - 28} ${bottom + 6} L${L + 28} ${bottom + 6} Q${L + 10} ${bottom + 6} ${L + 8} ${bottom - 12} Z" fill="${c.supercar ? "#1b1c20" : shade(c.body, -0.12)}"/>`);
  if (c.chrome) p.push(`<rect x="${L + 60}" y="${bottom - 22}" width="${2 * half - 120}" height="6" rx="3" fill="#cfd4da"/>`);
  if (c.supercar) {
    for (let i = -3; i <= 3; i++) p.push(`<rect x="${CX + i * 46 - 3}" y="${bottom - 46}" width="6" height="48" fill="#2c2e33"/>`);
    p.push(`<rect x="${CX - 70}" y="${bottom - 30}" width="140" height="26" rx="12" fill="#3a3c40"/><circle cx="${CX - 34}" cy="${bottom - 17}" r="9" fill="#111"/><circle cx="${CX}" cy="${bottom - 17}" r="9" fill="#111"/><circle cx="${CX + 34}" cy="${bottom - 17}" r="9" fill="#111"/>`);
  } else {
    p.push(`<ellipse cx="${L + 90}" cy="${bottom + 4}" rx="22" ry="7" fill="#2a2a2a"/>`);
  }
  // ниша под номер: номер ставит игра поверх картинки
  p.push(`<rect x="${f(CX - PLATE_W / 2 - 8)}" y="${f(c.plateY - PLATE_H / 2 - 7)}" width="${f(PLATE_W + 16)}" height="${f(PLATE_H + 14)}" rx="6" fill="#141518" opacity=".85"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n<!-- Заглушка ${c.id}. Замените на настоящую картинку и поправьте plateX/plateY/plateW в src/config/cars.ts. -->\n${p.join("\n")}\n</svg>\n`;
}

mkdirSync("public/cars", { recursive: true });
for (const c of CARS) {
  writeFileSync(`public/cars/${c.id}.svg`, svg(c));
  console.log(`${c.id}: plateX: 50, plateY: ${f((c.plateY / H) * 100)}, plateW: ${f((PLATE_W / W) * 100)}`);
}
