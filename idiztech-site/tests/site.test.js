#!/usr/bin/env node
/*
 * Agent de test du site Idiz Tech.
 * Ouvre le site dans un vrai navigateur (Chromium via Playwright) et vérifie :
 * chargement, erreurs, responsive, traductions, thème, menu mobile, liens,
 * logos clients, animations, accessibilité de base et poids des fichiers.
 *
 * Usage :  node tests/site.test.js        (depuis le dossier idiztech-site)
 * Sortie : liste PASS / FAIL, code de sortie 1 si un test échoue.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const EMAIL = 'info@idiztech.be';
const PHONE = '+32484958344';
const WIDTHS = [320, 360, 375, 390, 414, 600, 768, 820, 1024, 1280, 1440, 1920];
const LANGS = ['fr', 'nl', 'en'];

/* ---------- tiny static server ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end('not found'); }
      rsp.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

/* ---------- reporting ---------- */
const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log(`  ✔ ${name}`); }
  catch (e) { results.push({ name, ok: false, err: e.message }); console.log(`  ✘ ${name}\n      → ${e.message.split('\n').join('\n        ')}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

/* ---------- helpers ---------- */
async function openPage(browser, url, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, reducedMotion: opts.reducedMotion || 'no-preference', locale: opts.locale || 'fr-BE' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('JS error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('console.error: ' + m.text()); });
  page.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) problems.push('request failed: ' + r.url()); });
  page.on('response', r => { if (r.status() >= 400 && !/fonts\./.test(r.url())) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(url, { waitUntil: 'load' });
  return { ctx, page, problems };
}
// scroll the whole page slowly so every observer fires, then wait for streams to finish
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  for (let y = 0; y <= h; y += Math.round(vh * 0.4)) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(120); }
  await page.waitForFunction(() => [...document.querySelectorAll('[data-stream]')].every(el => el._state === 'done' || el._state === undefined), null, { timeout: 30000 })
    .catch(() => { throw new Error('certains textes ne finissent jamais de s\'écrire'); });
  await page.waitForTimeout(1200); // caret removal + reveal transitions
}
function lum(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  return .2126 * r + .7152 * g + .0722 * b;
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

/* ---------- run ---------- */
(async () => {
  const srv = await serve();
  const URL = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch();
  console.log(`\nAgent de test Idiz Tech → ${URL}\n`);

  /* 1. Static checks on the source */
  console.log('Fichiers');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  await test('index.html pèse moins de 100 Ko', () => assert(html.length < 100 * 1024, `${(html.length / 1024).toFixed(0)} Ko`));
  await test('chaque logo pèse moins de 100 Ko', () => {
    const big = fs.readdirSync(path.join(ROOT, 'logos')).filter(f => fs.statSync(path.join(ROOT, 'logos', f)).size > 100 * 1024);
    assert(!big.length, 'trop lourds : ' + big.join(', '));
  });
  await test('balises de base présentes (lang, title, description, viewport, charset)', () => {
    for (const re of [/<html lang="fr"/, /<title>[^<]+<\/title>/, /<meta name="description" content="[^"]{30,}"/, /<meta name="viewport"/, /<meta charset="utf-8">/])
      assert(re.test(html), 'manquant : ' + re);
  });

  /* 2. Load + layout at every width */
  console.log('\nResponsive & erreurs');
  for (const w of WIDTHS) {
    await test(`largeur ${w}px : aucune erreur, aucun débordement horizontal, tout s'affiche`, async () => {
      const { ctx, page, problems } = await openPage(browser, URL, { viewport: { width: w, height: w < 800 ? 844 : 900 } });
      await scrollThrough(page);
      const r = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
        const hidden = [...document.querySelectorAll('.rv')].filter(e => getComputedStyle(e).opacity < 0.99).length;
        const invisible = [...document.querySelectorAll('[data-stream]')].filter(e => e.style.visibility === 'hidden' || !e.textContent.trim()).length;
        // elements sticking out of the viewport (excluding the marquee, which is clipped on purpose)
        const wide = [...document.querySelectorAll('body *')].filter(e => {
          if (e.closest('.logos-mq') || e.closest('.mnav')) return false;
          const b = e.getBoundingClientRect(); return b.width && (b.right > cw + 1 || b.left < -1);
        }).map(e => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '')).slice(0, 5);
        const carets = document.querySelectorAll('.caret').length;
        return { sw, cw, hidden, invisible, wide, carets };
      });
      await ctx.close();
      assert(!problems.length, problems.join('\n'));
      assert(r.sw <= r.cw, `scroll horizontal : ${r.sw}px > ${r.cw}px`);
      assert(!r.wide.length, 'éléments qui sortent de l\'écran : ' + r.wide.join(', '));
      assert(!r.hidden, `${r.hidden} bloc(s) jamais apparus`);
      assert(!r.invisible, `${r.invisible} texte(s) animé(s) vides ou cachés`);
      assert(!r.carets, `${r.carets} curseur(s) clignotant(s) restés à l'écran`);
    });
  }

  /* 3. Translations */
  console.log('\nTraductions');
  const { ctx: c0, page: p0 } = await openPage(browser, URL);
  const keysInDom = await p0.evaluate(() => [...new Set([...document.querySelectorAll('[data-i18n],[data-i18n-html]')].map(e => e.dataset.i18n || e.dataset.i18nHtml))]);
  await c0.close();
  const src = html.match(/const I18N = (\{[\s\S]*?\n {2}\});/);
  await test('le dictionnaire de traduction est lisible', () => assert(src, 'objet I18N introuvable dans index.html'));
  const I18N = src ? Function('return ' + src[1])() : {};
  await test('FR, NL et EN ont exactement les mêmes clés', () => {
    const base = Object.keys(I18N.fr || {}).sort().join();
    for (const l of LANGS) assert(I18N[l] && Object.keys(I18N[l]).sort().join() === base, `clés différentes pour ${l}`);
  });
  await test('chaque texte de la page a une traduction dans les 3 langues', () => {
    const miss = []; for (const l of LANGS) for (const k of keysInDom) if (!I18N[l] || !I18N[l][k]) miss.push(`${l}:${k}`);
    assert(!miss.length, 'manquant : ' + miss.join(', '));
  });
  await test('aucune traduction NL/EN n\'est restée identique au français (hors noms propres)', () => {
    const same = ['nav.services', 'svc.2.t', 'm.2.t', 'c.eyebrow', 'nav.clients', 'svc.eyebrow'];
    const dup = []; for (const l of ['nl', 'en']) for (const k in I18N.fr) if (I18N[l][k] === I18N.fr[k] && !same.includes(k)) dup.push(`${l}:${k}`);
    assert(!dup.length, 'non traduit : ' + dup.join(', '));
  });
  for (const l of LANGS) {
    await test(`langue ${l.toUpperCase()} : toute la page bascule et reste après rechargement`, async () => {
      const { ctx, page, problems } = await openPage(browser, URL);
      await page.click(`.langs [data-lang="${l}"]`);
      await scrollThrough(page);
      const r = await page.evaluate(l => ({
        lang: document.documentElement.lang, title: document.title,
        pressed: document.querySelector(`.langs [data-lang="${l}"]`).getAttribute('aria-pressed'),
        texts: [...document.querySelectorAll('[data-i18n]')].map(e => [e.dataset.i18n, e.textContent.trim()]),
      }), l);
      const wrong = r.texts.filter(([k, t]) => t !== I18N[l][k].trim()).map(([k]) => k);
      await page.reload(); await page.waitForTimeout(300);
      const after = await page.evaluate(() => document.documentElement.lang);
      await ctx.close();
      assert(!problems.length, problems.join('\n'));
      assert(r.lang === l, `<html lang> = ${r.lang}`);
      assert(r.title === I18N[l]['meta.title'], `titre d'onglet = ${r.title}`);
      assert(r.pressed === 'true', 'bouton de langue pas marqué actif');
      assert(!wrong.length, 'textes incorrects : ' + wrong.join(', '));
      assert(after === l, `langue perdue après rechargement (${after})`);
    });
  }
  await test('changer de langue pendant qu\'un texte s\'écrit donne le bon texte final', async () => {
    const { ctx, page } = await openPage(browser, URL);
    await page.evaluate(() => document.querySelector('#apropos').scrollIntoView());
    await page.waitForTimeout(500);
    await page.click('.langs [data-lang="nl"]');
    await page.waitForTimeout(2500);
    const t = await page.evaluate(() => document.querySelector('[data-i18n="a.lead"]').textContent.trim());
    await ctx.close();
    assert(t === I18N.nl['a.lead'], 'texte final : ' + t.slice(0, 60));
  });
  await test('la langue du navigateur est utilisée à la première visite (nl-BE → NL)', async () => {
    const { ctx, page } = await openPage(browser, URL, { locale: 'nl-BE' });
    const l = await page.evaluate(() => document.documentElement.lang); await ctx.close();
    assert(l === 'nl', 'langue = ' + l);
  });

  /* 4. Theme */
  console.log('\nThème clair / sombre');
  await test('le site démarre en sombre, bascule en clair et retient le choix', async () => {
    const { ctx, page } = await openPage(browser, URL);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const dark = await bg();
    await page.click('#theme-btn'); await page.waitForTimeout(600);
    const light = await bg(), attr = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.reload(); await page.waitForTimeout(600);
    const kept = await page.evaluate(() => document.documentElement.dataset.theme);
    await ctx.close();
    assert(lum(dark) < 0.05, 'fond sombre attendu, obtenu ' + dark);
    assert(attr === 'light' && lum(light) > 0.8, 'fond clair attendu, obtenu ' + light);
    assert(kept === 'light', 'thème perdu après rechargement');
  });
  for (const theme of ['dark', 'light']) {
    await test(`contraste lisible en mode ${theme === 'dark' ? 'sombre' : 'clair'} (texte ≥ 7:1, texte secondaire ≥ 4.5:1)`, async () => {
      const { ctx, page } = await openPage(browser, URL);
      if (theme === 'light') { await page.click('#theme-btn'); await page.waitForTimeout(600); }
      const c = await page.evaluate(() => { const s = getComputedStyle(document.body); const m = getComputedStyle(document.querySelector('.svc p')); return [s.backgroundColor, s.color, m.color]; });
      await ctx.close();
      assert(contrast(c[0], c[1]) >= 7, `texte ${contrast(c[0], c[1]).toFixed(1)}:1`);
      assert(contrast(c[0], c[2]) >= 4.5, `texte secondaire ${contrast(c[0], c[2]).toFixed(1)}:1`);
    });
  }
  await test('en mode clair, les logos clients passent en sombre', async () => {
    const { ctx, page } = await openPage(browser, URL);
    await page.click('#theme-btn'); await page.waitForTimeout(500);
    const f = await page.evaluate(() => getComputedStyle(document.querySelector('.logos-mq img')).filter);
    await ctx.close();
    assert(/invert\(1\)/.test(f), 'filtre = ' + f);
  });

  /* 5. Navigation */
  console.log('\nNavigation');
  await test('chaque lien interne (#…) mène à une section qui existe', async () => {
    const { ctx, page } = await openPage(browser, URL);
    const bad = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)));
    await ctx.close();
    assert(!bad.length, 'liens cassés : ' + bad.join(', '));
  });
  await test('ordinateur : les liens du menu sont visibles et défilent vers leur section', async () => {
    const { ctx, page } = await openPage(browser, URL);
    const vis = await page.isVisible('nav .bar ul a[href="#methode"]');
    await page.click('nav .bar ul a[href="#methode"]'); await page.waitForTimeout(1200);
    const top = await page.evaluate(() => document.querySelector('#methode').getBoundingClientRect().top);
    await ctx.close();
    assert(vis, 'liens du menu invisibles');
    assert(Math.abs(top) < 80, `la section n'est pas arrivée en haut (${Math.round(top)}px)`);
  });
  await test('mobile : le menu ☰ s\'ouvre, se ferme et mène à la bonne section', async () => {
    const { ctx, page } = await openPage(browser, URL, { viewport: { width: 390, height: 844 } });
    const desk = await page.isVisible('nav .bar ul');
    await page.click('#menu-btn'); await page.waitForTimeout(600);
    const open = await page.evaluate(() => [document.getElementById('menu-btn').getAttribute('aria-expanded'), document.querySelector('#mnav').getBoundingClientRect().height]);
    await page.click('#mnav a[href="#apropos"]'); await page.waitForTimeout(1200);
    const closed = await page.evaluate(() => document.getElementById('menu-btn').getAttribute('aria-expanded'));
    const top = await page.evaluate(() => document.querySelector('#apropos').getBoundingClientRect().top);
    await ctx.close();
    assert(!desk, 'les liens ordinateur sont visibles sur mobile');
    assert(open[0] === 'true' && open[1] > 150, 'le menu ne s\'ouvre pas');
    assert(closed === 'false', 'le menu ne se ferme pas après un clic');
    assert(Math.abs(top) < 80, `la section n'est pas arrivée en haut (${Math.round(top)}px)`);
  });
  await test('la flèche du haut de page descend vers les services', async () => {
    const { ctx, page } = await openPage(browser, URL);
    await page.click('.scroll-hint'); await page.waitForTimeout(1200);
    const top = await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().top);
    await ctx.close();
    assert(Math.abs(top) < 80, `services pas en haut (${Math.round(top)}px)`);
  });
  await test(`contact : e-mail ${EMAIL} et téléphone ${PHONE} corrects`, async () => {
    const { ctx, page } = await openPage(browser, URL);
    const r = await page.evaluate(() => [...document.querySelectorAll('.contact a')].map(a => a.getAttribute('href')));
    await ctx.close();
    assert(r.includes('mailto:' + EMAIL), 'lien e-mail : ' + r.join(', '));
    assert(r.includes('tel:' + PHONE), 'lien téléphone : ' + r.join(', '));
  });

  /* 6. Client logos */
  console.log('\nLogos clients');
  for (const w of [390, 1440]) {
    await test(`${w}px : les 12 logos se chargent, ne se chevauchent pas et défilent`, async () => {
      const { ctx, page, problems } = await openPage(browser, URL, { viewport: { width: w, height: 900 } });
      await page.evaluate(() => document.querySelector('#clients').scrollIntoView());
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('.logos-mq img')];
        const broken = imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute('src'));
        const rects = [...document.querySelectorAll('.logos-mq .grp')[0].querySelectorAll('img')].map(i => i.getBoundingClientRect());
        const overlaps = rects.slice(1).filter((b, k) => b.left - rects[k].right < 40).length;
        const squished = imgs.filter(i => Math.abs(i.getBoundingClientRect().width / i.getBoundingClientRect().height - i.naturalWidth / i.naturalHeight) > 0.05).length;
        return { n: imgs.length, broken, overlaps, squished, x: document.querySelector('.logos-mq .track').getBoundingClientRect().left };
      });
      await page.waitForTimeout(1000);
      const x2 = await page.evaluate(() => document.querySelector('.logos-mq .track').getBoundingClientRect().left);
      await ctx.close();
      assert(!problems.length, problems.join('\n'));
      assert(r.n === 12, `${r.n} logos au lieu de 12`);
      assert(!r.broken.length, 'logos cassés : ' + r.broken.join(', '));
      assert(!r.overlaps, `${r.overlaps} logo(s) trop proches (< 40px)`);
      assert(!r.squished, `${r.squished} logo(s) déformés`);
      assert(x2 < r.x, 'la bande de logos ne défile pas');
    });
  }
  await test('chaque logo a un texte alternatif (ou est marqué décoratif)', async () => {
    const { ctx, page } = await openPage(browser, URL);
    const r = await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length);
    await ctx.close();
    assert(!r, `${r} image(s) sans alt`);
  });

  /* 7. Animations */
  console.log('\nAnimations');
  await test('le texte s\'écrit mot par mot au scroll, puis le curseur disparaît', async () => {
    const { ctx, page } = await openPage(browser, URL);
    await page.evaluate(() => document.querySelector('#services').scrollIntoView());
    await page.waitForTimeout(700);
    const mid = await page.evaluate(() => { const e = document.querySelector('[data-i18n="svc.lead"]'); return [e.querySelectorAll('.tok').length, !!e.querySelector('.caret'), e.textContent.length]; });
    await page.waitForTimeout(6000);
    const end = await page.evaluate(() => { const e = document.querySelector('[data-i18n="svc.lead"]'); return [!!e.querySelector('.caret'), e.textContent.trim()]; });
    await ctx.close();
    assert(mid[0] > 0 && mid[1], 'aucune écriture progressive détectée');
    assert(mid[2] < I18N.fr['svc.lead'].length, 'le texte était déjà complet (pas d\'effet)');
    assert(!end[0], 'le curseur reste affiché');
    assert(end[1] === I18N.fr['svc.lead'], 'texte final différent');
  });
  await test('les compteurs finissent sur 2021, 100% et 24h', async () => {
    const { ctx, page } = await openPage(browser, URL);
    await page.evaluate(() => document.querySelector('.stats').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2500);
    const v = await page.evaluate(() => [...document.querySelectorAll('[data-count]')].map(e => e.textContent));
    await ctx.close();
    assert(v.join() === '2021,100%,24h', 'valeurs : ' + v.join(', '));
  });
  await test('« réduire les animations » : tout le texte est visible tout de suite', async () => {
    const { ctx, page } = await openPage(browser, URL, { reducedMotion: 'reduce' });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({
      hidden: [...document.querySelectorAll('[data-stream]')].filter(e => e.style.visibility === 'hidden' || !e.textContent.trim()).length,
      faded: [...document.querySelectorAll('.rv')].filter(e => getComputedStyle(e).opacity < 0.99).length,
      toks: document.querySelectorAll('.tok').length,
    }));
    await ctx.close();
    assert(!r.hidden && !r.faded && !r.toks, JSON.stringify(r));
  });

  /* 8. Accessibility basics */
  console.log('\nAccessibilité');
  await test('un seul titre H1 et des titres dans l\'ordre', async () => {
    const { ctx, page } = await openPage(browser, URL);
    const hs = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]));
    await ctx.close();
    assert(hs.filter(h => h === 1).length === 1, 'nombre de H1 : ' + hs.filter(h => h === 1).length);
    const jumps = hs.slice(1).filter((h, i) => h > hs[i] + 1);
    assert(!jumps.length, 'saut de niveau de titre : ' + hs.join(' '));
  });
  await test('chaque bouton et lien a un nom lisible par un lecteur d\'écran', async () => {
    const { ctx, page } = await openPage(browser, URL);
    const bad = await page.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => !(e.getAttribute('aria-label') || e.textContent.trim())).map(e => e.outerHTML.slice(0, 60)));
    await ctx.close();
    assert(!bad.length, bad.join('\n'));
  });
  await test('navigation au clavier : le focus est visible', async () => {
    const { ctx, page } = await openPage(browser, URL);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const o = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [document.activeElement.tagName, s.outlineStyle, s.outlineWidth]; });
    await ctx.close();
    assert(o[1] !== 'none' && o[2] !== '0px', 'pas de contour de focus sur ' + o[0]);
  });
  await test('zones cliquables d\'au moins 32px sur mobile', async () => {
    const { ctx, page } = await openPage(browser, URL, { viewport: { width: 375, height: 812 } });
    const small = await page.evaluate(() => [...document.querySelectorAll('nav button, .scroll-hint, .contact a')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.width < 32 || b.height < 26); }).map(e => e.textContent.trim() || e.getAttribute('aria-label')));
    await ctx.close();
    assert(!small.length, 'trop petits : ' + small.join(', '));
  });

  /* ---------- summary ---------- */
  await browser.close(); srv.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\n${results.length - fail.length}/${results.length} tests réussis` + (fail.length ? ` — ${fail.length} échec(s) :\n` + fail.map(f => '  • ' + f.name).join('\n') : ' ✔'));
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
