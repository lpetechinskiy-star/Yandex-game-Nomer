// Распаковывает build/nomernoy-perekup.zip в .zip-check/ и раздаёт его на http://localhost:4174/
// так же, как это сделает Яндекс: статикой из папки, без Vite. /sdk.js отдаётся пустым — включится mock.
// SDK_FILE=путь/к/sdk.js — отдать вместо пустого свой файл (например, тестовую имитацию YaGames).
import { createServer } from "node:http";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { unzipSync } from "fflate";

const ZIP = "build/nomernoy-perekup.zip";
const DIR = ".zip-check";
const PORT = Number(process.env.PORT ?? 4174);

if (!existsSync(ZIP)) {
  console.error(`Нет ${ZIP} — выполните npm run build && npm run zip.`);
  process.exit(1);
}
rmSync(DIR, { recursive: true, force: true });
const files = unzipSync(readFileSync(ZIP));
for (const [name, data] of Object.entries(files)) {
  const p = join(DIR, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
}
if (!files["index.html"]) {
  console.error("В корне архива нет index.html!");
  process.exit(1);
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json" };

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (path === "/sdk.js") {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    return res.end(process.env.SDK_FILE ? readFileSync(process.env.SDK_FILE) : "/* локально SDK нет: игра работает с mock */\n");
  }
  const file = normalize(join(DIR, path === "/" ? "index.html" : path));
  if (!file.startsWith(DIR) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end("not found");
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`Архив распакован в ${DIR}/ — откройте http://localhost:${PORT}/`));
