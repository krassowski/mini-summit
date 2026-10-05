// render.mjs: screenshots of every slide and step, and a PDF of the deck.
//
//   node slides/render.mjs shots [slide-id ...]   PNGs into slides/out/shots/
//   node slides/render.mjs pdf                     slides/dist/talk.pdf
//   THEME=light node slides/render.mjs shots       light theme
//   SCALE=0.5 node slides/render.mjs shots         smaller PNGs
//
// Uses the Playwright that is already installed in ~/jupyterlab (override
// with PLAYWRIGHT=/path/to/node_modules/playwright).
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || join(os.homedir(), 'jupyterlab/node_modules/playwright'));

const here = dirname(fileURLToPath(import.meta.url));
const indexUrl = pathToFileURL(join(here, 'index.html')).href;
const outDir = join(here, 'out');
const [mode = 'shots', ...only] = process.argv.slice(2);
const theme = process.env.THEME || 'dark';
const scale = Number(process.env.SCALE || 1);

// Use the newest Chromium already in the Playwright cache, so no download is
// needed when the installed Playwright expects a different browser revision.
function cachedChromium() {
  if (process.env.CHROME) return process.env.CHROME;
  const cache = join(os.homedir(), '.cache/ms-playwright');
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => b.split('-')[1] - a.split('-')[1]);
  for (const d of dirs) {
    const bin = join(cache, d, 'chrome-linux64/chrome');
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: cachedChromium() });
try {
  if (mode === 'pdf') {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${indexUrl}?print&theme=${theme}`);
    await page.waitForFunction(() => document.body.dataset.printReady === '1');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const distDir = join(here, 'dist');
    mkdirSync(distDir, { recursive: true });
    const file = join(distDir, theme === 'dark' ? 'talk.pdf' : `talk-${theme}.pdf`);
    await page.pdf({ path: file, width: '1920px', height: '1080px', printBackground: true, pageRanges: '' });
    console.log(file);
  } else {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${indexUrl}?theme=${theme}`);
    await page.evaluate(() => document.fonts.ready);
    const slides = await page.evaluate(() => Deck.slides.map(s => ({ id: s.id, steps: s._steps })));
    const dir = join(outDir, 'shots' + (theme === 'dark' ? '' : '-' + theme));
    mkdirSync(dir, { recursive: true });
    let n = 0;
    for (const [i, s] of slides.entries()) {
      if (only.length && !only.includes(s.id)) continue;
      for (let k = 0; k <= s.steps; k++) {
        await page.evaluate(([i, k]) => Deck.go(i, k, { force: true }), [i, k]);
        await page.waitForTimeout(k === 0 ? 1500 : 1300);
        const name = `${String(i + 1).padStart(2, '0')}-${s.id}-${k}.png`;
        await page.screenshot({ path: join(dir, name) });
        n++;
      }
    }
    console.log(`${n} screenshots in ${dir}`);
    if (errors.length) console.log('page errors:\n' + errors.join('\n'));
  }
} finally {
  await browser.close();
}
