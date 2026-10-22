// Пакует dist/ в build/nomernoy-perekup.zip для загрузки в консоль Яндекс Игр.
// index.html лежит в корне архива. Перед упаковкой проверяет, что в сборке нет внешних ссылок.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { zipSync } from "fflate";

const DIST = "dist";
const OUT_DIR = "build";
const OUT = join(OUT_DIR, "nomernoy-perekup.zip");

if (!existsSync(join(DIST, "index.html"))) {
  console.error("Нет dist/index.html — сначала выполните npm run build.");
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(DIST);

// Модерация: никаких внешних ссылок. Пространства имён SVG — не ссылки.
const ALLOWED = [/^http:\/\/www\.w3\.org\//];
const problems = [];
for (const f of files.filter((f) => /\.(html|js|css|svg|json)$/.test(f))) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
    if (!ALLOWED.some((re) => re.test(m[0]))) problems.push(`${relative(DIST, f)}: ${m[0]}`);
  }
}
if (problems.length) {
  console.error("В сборке найдены внешние ссылки:\n  " + problems.join("\n  "));
  process.exit(1);
}

const entries = {};
for (const f of files) entries[relative(DIST, f).split("\\").join("/")] = [readFileSync(f), { level: /\.(png|jpe?g|webp|woff2?)$/.test(f) ? 0 : 9 }];
mkdirSync(OUT_DIR, { recursive: true });
const zip = zipSync(entries);
writeFileSync(OUT, zip);
console.log(`${OUT}: ${files.length} файлов, ${(zip.length / 1024).toFixed(0)} КБ`);
