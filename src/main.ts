import "./ui/styles/fonts.css";
import "./ui/styles/main.css";
import { defaultRng } from "./core/random";
import { loadGame, Saver } from "./core/save";
import { setLang } from "./i18n";
import { Ads, initPlatform } from "./sdk";
import { isPaused, onPauseChange, setPaused, watchVisibility } from "./sdk/pause";
import { App } from "./ui/app";
import { installGuards } from "./ui/guards";
import { setSoundPaused } from "./ui/sound";

const FONTS_TIMEOUT_MS = 3000;

async function boot(): Promise<void> {
  installGuards();
  const platform = await initPlatform();
  setLang(platform.lang);

  const state = await loadGame(platform.cloud, defaultRng);
  const saver = new Saver(platform.cloud);
  const app = new App(state, platform, new Ads(platform), saver);
  app.mount(document.getElementById("app")!);

  // Пауза: реклама, свёрнутая вкладка или запрос площадки — без звука и с GameplayAPI.stop().
  onPauseChange((paused) => {
    setSoundPaused(paused);
    if (paused) platform.gameplayStop();
    else platform.gameplayStart();
  });
  platform.onPlatformPause((p) => setPaused("platform", p));
  watchVisibility(() => saver.flush());

  // LoadingAPI.ready — когда игра полностью загрузилась: интерфейс отрисован и шрифты готовы.
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, FONTS_TIMEOUT_MS))]);
  platform.loadingReady();
  if (!isPaused()) platform.gameplayStart();
  setSoundPaused(isPaused());
}

void boot();
