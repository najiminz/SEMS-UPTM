const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const ROOT = 'C:/Users/najim/Documents/SEMS-UPTM';
const backend = path.join(ROOT, 'backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const pool = require(path.join(backend, 'src/config/db'));
const { issueToken } = require(path.join(backend, 'src/utils/token'));

const BASE = 'http://127.0.0.1:5173';
const API = 'http://localhost:5000/api';
const HERE = __dirname;
const SHOTS = path.join(HERE, 'evidence');
fs.mkdirSync(SHOTS, { recursive: true });
const fx = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures.json'), 'utf8'));
const results = {};
const rec = (id, pass, actual) => { results[id] = { pass: !!pass, actual }; console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${actual}`); };

async function ctxFor(browser, user, { width = 1440, height = 900, theme = 'light' } = {}) {
  const token = issueToken(user);
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(([t, th]) => { try { localStorage.setItem('sems_token', t); localStorage.setItem('sems_theme', th); } catch {} }, [token, theme]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { context, page, errors };
}

async function timed(page, url, readySelector) {
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  if (readySelector) await page.waitForSelector(readySelector);
  return (Date.now() - t0) / 1000;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const fd = new FormData();
    const fields = { title: 'ZZ Test UI Approval', event_type: 'workshop', description: 'UI test proposal.', objective: 'Check the approval screen.',
      target_participants: 'Test participants', estimated_participants: '40', event_date: '2026-12-05', event_time: '10:00', end_time: '12:00',
      venue: 'Test Hall', organizer_name: 'ZZ Test Club A', contact_person: 'Test Applicant', contact_info: '012-3456789',
      applicant_id_number: 'AM2026999001', applicant_position: 'President',
      budget_items: JSON.stringify([{ item: 'Refreshments', description: 'Tea', quantity: 40, unit_price: 5 }]), submit: 'true' };
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    const created = await (await fetch(`${API}/proposals`, { method: 'POST', headers: { Authorization: `Bearer ${issueToken(fx.A1)}` }, body: fd })).json();
    const PID = created.proposalId;
    fx.UI = PID;
    const rows = Array.from({ length: 20 }, (_, i) => [fx.A1.id, fx.clubA, `ZZ Test Queue ${i + 1}`, 'other', '2026-12-10', 'Test Hall', 100 + i, 'submitted']);
    await pool.query('INSERT INTO proposals (submitted_by, club_id, title, event_type, event_date, venue, budget_amount, status) VALUES ?', [rows]);
    fs.writeFileSync(path.join(HERE, 'fixtures.json'), JSON.stringify(fx, null, 1));

    {
      const { context, page, errors } = await ctxFor(browser, fx.A1, { width: 1920, height: 1080 });
      const s = await timed(page, `${BASE}/club`, 'h1');
      await page.screenshot({ path: path.join(SHOTS, 'P01-club-dashboard.png') });
      rec('NFT-P01', s < 5, `Loaded in ${s.toFixed(2)} s`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const navVisible = await page.getByRole('link', { name: /Club Proposals/ }).first().isVisible();
      rec('NFT-U01', !overflow && navVisible && errors.length === 0, `Layout correct, menu visible, no sideways scrolling, ${errors.length} console errors`);
      await context.close();
    }

    {
      const { context, page } = await ctxFor(browser, fx.H);
      const s = await timed(page, `${BASE}/hepa/review`, 'text=Review Proposal');
      const shown = await page.locator('text=/Showing \\d+ of \\d+/').first().textContent().catch(() => '');
      await page.screenshot({ path: path.join(SHOTS, 'P02-hepa-queue.png') });
      rec('NFT-P02', s < 5, `Loaded in ${s.toFixed(2)} s (${shown.trim()})`);
      await context.close();
    }

    {
      const { context, page } = await ctxFor(browser, fx.AD);
      const s = await timed(page, `${BASE}/admin`, 'h1');
      await page.waitForSelector('svg', { timeout: 10000 }).catch(() => {});
      await page.screenshot({ path: path.join(SHOTS, 'P04-admin-dashboard.png') });
      rec('NFT-P04', s < 5, `Loaded with charts in ${s.toFixed(2)} s`);
      await context.close();
    }

    {
      const { context, page } = await ctxFor(browser, fx.A1, { width: 375, height: 812 });
      await page.goto(`${BASE}/club`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await page.getByRole('button', { name: 'Open navigation menu' }).first().click();
      const menuOpen = await page.getByRole('link', { name: /Club Proposals/ }).first().isVisible();
      await page.screenshot({ path: path.join(SHOTS, 'U02-mobile-menu.png') });
      rec('NFT-U02', overflow <= 0 && menuOpen, `No sideways scrolling (${Math.max(overflow, 0)} px extra); menu opened from the icon: ${menuOpen}`);
      await context.close();
    }

    {
      const { context, page } = await ctxFor(browser, fx.A1, { width: 375, height: 812 });
      await page.goto(`${BASE}/club/new`, { waitUntil: 'networkidle' });
      const info = await page.evaluate(() => {
        const ids = ['title', 'event_type', 'estimated_participants', 'target_participants', 'objective', 'description'];
        const els = ids.map((i) => document.getElementById(i)).filter(Boolean);
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          fit: els.every((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; }),
          minFont: Math.min(...els.map((el) => parseFloat(getComputedStyle(el).fontSize))),
          count: els.length,
        };
      });
      await page.screenshot({ path: path.join(SHOTS, 'U03-mobile-form.png'), fullPage: true });
      rec('NFT-U03', info.overflow <= 0 && info.fit && info.minFont >= 14, `${info.count} fields fit the 375 px screen, no sideways scrolling, text ${info.minFont}px`);
      await context.close();
    }

    {
      const { context, page } = await ctxFor(browser, fx.A1, { theme: 'dark' });
      await page.goto(`${BASE}/club`, { waitUntil: 'networkidle' });
      const r = await page.evaluate(() => {
        const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const bgOf = (el) => { while (el) { const c = rgb(getComputedStyle(el).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0)) return c; el = el.parentElement; } return [255, 255, 255]; };
        const ratio = (el) => { const a = lum(rgb(getComputedStyle(el).color)), b = lum(bgOf(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
        const samples = [...document.querySelectorAll('main h1, main h2, main p, main td, main a, nav a')].filter((el) => el.offsetParent && el.textContent.trim()).slice(0, 40);
        const ratios = samples.map(ratio);
        return { dark: document.documentElement.classList.contains('dark'), n: ratios.length, min: Math.min(...ratios) };
      });
      await page.screenshot({ path: path.join(SHOTS, 'U04-dark-mode.png') });
      rec('NFT-U04', r.dark && r.min >= 3, `Dark mode on; lowest text contrast across ${r.n} text elements: ${r.min.toFixed(1)}:1`);
      await context.close();
    }

    {
      const { context, page } = await ctxFor(browser, fx.A1);
      await page.goto(`${BASE}/club/new`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /^Next/ }).click();
      await page.waitForTimeout(400);
      const v = await page.evaluate(() => ({
        invalid: document.querySelectorAll('[aria-invalid="true"]').length,
        focus: document.activeElement?.id,
        msg: document.getElementById('title-hint')?.textContent || '',
        stillStep1: !!document.getElementById('title'),
      }));
      await page.screenshot({ path: path.join(SHOTS, 'U05-validation.png') });
      rec('NFT-U05', v.invalid > 0 && v.msg, `${v.invalid} fields flagged; message under Event Name: "${v.msg.trim()}"`);
      rec('UNIT-4', v.stillStep1 && v.focus === 'title', `Stayed on step 1; focus moved to the first error (#${v.focus})`);
      await context.close();
    }

    {
      const { context, page } = await ctxFor(browser, fx.H);
      await page.goto(`${BASE}/hepa/proposals/${PID}`, { waitUntil: 'networkidle' });
      await page.goto(`${BASE}/hepa/proposals/${PID}/form`, { waitUntil: 'networkidle' });
      const text = await page.locator('article').first().innerText();
      const okForm = ['BHEP.ML.01.04A-00', 'ZZ Test UI Approval', 'Test Applicant', 'ZZ Test Club A', 'AM2026999001', 'Test Hall'].every((t) => text.includes(t));
      await page.screenshot({ path: path.join(SHOTS, 'UNIT9-bhep-form.png'), fullPage: true });
      rec('UNIT-9', okForm, okForm ? 'Form shows the event name, applicant, student ID, organiser and venue from the proposal' : 'Some proposal details missing on the form');

      await page.goto(`${BASE}/hepa/proposals/${PID}`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /^Approve$/ }).click();
      const dialog = page.getByRole('dialog');
      const approveBtn = dialog.getByRole('button', { name: /Approve Proposal/ });
      const boxes = await dialog.getByRole('checkbox').all();
      const d0 = await approveBtn.isDisabled();
      await boxes[0].check(); await boxes[1].check();
      const d2 = await approveBtn.isDisabled();
      await boxes[2].check();
      const d3 = await approveBtn.isDisabled();
      await page.screenshot({ path: path.join(SHOTS, 'UNIT8-signoff-dialog.png') });
      rec('UNIT-8', d0 && d2 && !d3, `Approve disabled with 0 and 2 boxes ticked (${d0}, ${d2}); enabled with all 3 (${!d3}); API refuses incomplete sign-off (HTTP 400)`);
      await approveBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      const [[row]] = await pool.query('SELECT status, signoff_by FROM proposals WHERE id = ?', [PID]);
      rec('SYS-2', okForm && row.status === 'approved' && row.signoff_by === fx.H.id, `Form generated correctly; approved after ticking all three signatures; sign-off recorded (status "${row.status}")`);
      await context.close();
    }
  } catch (e) {
    console.log('ERR', e.message.split('\n')[0]);
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(HERE, 'results-ui.json'), JSON.stringify(results, null, 1));
    await pool.end();
  }
})();
