const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const backend = 'C:/Users/najim/Documents/SEMS-UPTM/backend';
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const { issueToken } = require(path.join(backend, 'src/utils/token'));
const HERE = __dirname;
const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures.json'), 'utf8'));
const results = JSON.parse(fs.readFileSync(path.join(HERE, 'results-ui.json'), 'utf8'));
const rec = (id, pass, actual) => { results[id] = { pass: !!pass, actual }; console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${actual}`); };

async function open(browser, user, { width = 1440, height = 900, theme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(([t, th]) => { localStorage.setItem('sems_token', t); localStorage.setItem('sems_theme', th); }, [issueToken(user), theme]);
  return { context, page: await context.newPage() };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    {
      const { context, page } = await open(browser, fx.A1, { width: 375, height: 812 });
      await page.goto('http://127.0.0.1:5173/club/new', { waitUntil: 'networkidle' });
      const info = await page.evaluate(() => {
        const els = [...document.querySelectorAll('input:not([type=checkbox]):not([type=file]), select, textarea')].filter((el) => el.offsetParent);
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          fit: els.every((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }),
          minFont: Math.min(...els.map((el) => parseFloat(getComputedStyle(el).fontSize))),
          count: els.length,
        };
      });
      await page.screenshot({ path: path.join(HERE, 'evidence', 'U03-mobile-form.png'), fullPage: true });
      rec('NFT-U03', info.overflow <= 0 && info.fit && info.minFont >= 16, `${info.count} fields fit the 375 px screen with no sideways scrolling; text ${info.minFont}px, so the phone does not zoom in`);
      await context.close();
    }
    {
      const pages = [[fx.A1, '/club'], [fx.A1, '/club/new'], [fx.H, '/hepa/review'], [fx.AD, '/admin'], [fx.AD, '/admin/audit-logs']];
      let worst = Infinity; let checked = 0; let failures = 0;
      for (const [user, url] of pages) {
        const { context, page } = await open(browser, user, { theme: 'dark' });
        await page.goto('http://127.0.0.1:5173' + url, { waitUntil: 'networkidle' });
        const r = await page.evaluate(() => {
          const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
          const rgb = (s) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
          const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const bgOf = (el) => { while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c[3] > 0.5) return c; el = el.parentElement; } return [2, 6, 23]; };
          let worst = Infinity, n = 0, fails = 0;
          for (const el of document.querySelectorAll('body *')) {
            if (!el.offsetParent || el.classList.contains('sr-only')) continue;
            const own = [...el.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent.trim()).join('').trim();
            if (!own) continue;
            const cs = getComputedStyle(el);
            const a = lum(rgb(cs.color)), b = lum(bgOf(el));
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
            n++; worst = Math.min(worst, ratio); if (ratio < (big ? 3 : 4.5) - 0.05) fails++;
          }
          return { dark: document.documentElement.classList.contains('dark'), worst, n, fails };
        });
        if (url === '/club') await page.screenshot({ path: path.join(HERE, 'evidence', 'U04-dark-mode.png') });
        worst = Math.min(worst, r.worst); checked += r.n; failures += r.fails + (r.dark ? 0 : 1);
        await context.close();
      }
      rec('NFT-U04', failures === 0, `Dark mode on 5 pages: ${checked} text elements, all meet WCAG AA (lowest ${worst.toFixed(1)}:1)`);
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(HERE, 'results-ui.json'), JSON.stringify(results, null, 1));
  }
})();
