import type { Connect, Plugin } from "vite";
import { defineConfig } from "vitest/config";

// На Яндекс Играх /sdk.js отдаёт сама площадка. Локально отдаём пустой скрипт,
// чтобы не было 404 в консоли: без window.YaGames игра включает mock (src/sdk/mock.ts).
function localSdkStub(): Plugin {
  const stub = "/* локальная заглушка: настоящий SDK подставляет Яндекс Игры */\n";
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.split("?")[0] !== "/sdk.js") return next();
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.end(stub);
  };
  return {
    name: "local-yandex-sdk-stub",
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

export default defineConfig({
  // Относительные пути: игра открывается из подпапки на CDN Яндекса.
  base: "./",
  plugins: [localSdkStub()],
  build: {
    target: "es2020",
    outDir: "dist",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
