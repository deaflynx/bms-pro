/**
 * Responsive gate: asserts no horizontal overflow and no undersized tap targets
 * across every route at phone and tablet widths.
 *
 * This is the check that caught four real bugs during the mockup phase — flex
 * items with min-width pushing the page sideways, a header button running off
 * the edge, non-wrapping meta rows, and 22px tap targets.
 *
 * Drives headless Chrome over the DevTools Protocol because a screenshot cannot
 * tell you scrollWidth. Node 22 ships a global WebSocket, so there is no
 * dependency to install.
 *
 * Usage:
 *   npm run build
 *   npx astro preview --port 4321 &
 *   npm run test:responsive
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const BASE = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4321/bms-pro';
const PORT = 9222 + Math.floor(process.uptime() * 7) % 500;
const PROFILE = `/tmp/bms-responsive-${process.pid}`;

const ROUTES = [
  '/',
  '/products/',
  '/products/bms-m/',
  '/products/bms-pro/',
  '/products/bms-nexus/',
  '/products/bms-quadro/',
  '/how-it-works/',
  '/documents/',
  '/documents/bms-m/passport/',
  '/documents/bms-m/declaration/',
  '/documents/bms-m/technical-conditions/',
  '/about/',
  '/contacts/',
  '/faq/',
  '/privacy-policy/',
];

const VIEWPORTS = [
  { label: 'phone 360', width: 360, height: 740, mobile: true },
  { label: 'phone 390', width: 390, height: 844, mobile: true },
  { label: 'tablet 768', width: 768, height: 1024, mobile: false },
];

const MIN_TAP = 24;

const PROBE = `(() => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const overflow = [];
  const smallTaps = [];

  const scrollable = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['auto','scroll','hidden'].includes(s.overflowX) || ['auto','scroll','hidden'].includes(s.overflow)) return true;
    }
    return false;
  };

  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (getComputedStyle(el).position === 'fixed') return;
    if ((r.right > vw + 1 || r.left < -1) && !scrollable(el)) {
      const cn = typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
        : '';
      overflow.push(el.tagName.toLowerCase() + cn + ' right=' + Math.round(r.right));
    }
  });

  document.querySelectorAll('a, button, input, summary, [role=button]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (getComputedStyle(el).display === 'inline') return;
    if (r.height < ${MIN_TAP}) {
      smallTaps.push((el.textContent || el.tagName).trim().slice(0, 30) + ' h=' + Math.round(r.height));
    }
  });

  return JSON.stringify({ vw, sw: de.scrollWidth, overflow: overflow.slice(0, 6), smallTaps: smallTaps.slice(0, 6) });
})()`;

function launch() {
  return spawn(
    'google-chrome-stable',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
}

async function target() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`);
      const page = (await res.json()).find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

async function main() {
  const proc = launch();
  let ws;
  let failures = 0;

  try {
    ws = new WebSocket(await target());
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error('WebSocket to Chrome failed'));
    });

    let id = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };
    const cmd = (method, params = {}) =>
      new Promise((res) => {
        const i = ++id;
        pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method, params }));
      });

    await cmd('Page.enable');
    await cmd('Runtime.enable');

    for (const vp of VIEWPORTS) {
      console.log(`\n=== ${vp.label} ===`);
      await cmd('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });

      for (const route of ROUTES) {
        await cmd('Page.navigate', { url: `${BASE}${route}` });
        await new Promise((r) => setTimeout(r, 700));
        const res = await cmd('Runtime.evaluate', {
          expression: PROBE,
          returnByValue: true,
        });

        let d;
        try {
          d = JSON.parse(res.result.result.value);
        } catch {
          console.log(`  FAIL ${route} — probe did not run`);
          failures++;
          continue;
        }

        const bad = d.sw > d.vw || d.overflow.length > 0 || d.smallTaps.length > 0;
        if (!bad) {
          console.log(`  ok   ${route}`);
          continue;
        }
        failures++;
        console.log(`  FAIL ${route}  vw=${d.vw} scrollW=${d.sw}`);
        for (const o of d.overflow) console.log(`         overflow: ${o}`);
        for (const t of d.smallTaps) console.log(`         tap target: ${t}`);
      }
    }
  } finally {
    ws?.close();
    proc.kill();
    try {
      rmSync(PROFILE, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }

  console.log(
    failures === 0
      ? `\nPASS — ${ROUTES.length} routes x ${VIEWPORTS.length} viewports, no overflow, no tap target under ${MIN_TAP}px`
      : `\nFAIL — ${failures} route/viewport combinations have problems`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

await main();
