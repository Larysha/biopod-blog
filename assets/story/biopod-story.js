// BioPod homepage story. Needs GSAP + ScrollTrigger and d3-delaunay (loaded in index.qmd).
(() => {
gsap.registerPlugin(ScrollTrigger);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= helpers ================= */
const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
const txt = (parent, s, attrs) => { const t = el('text', attrs, parent); t.textContent = s; return t; };
let seed = 21;
const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const jit = a => (rand() - 0.5) * 2 * a;
const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const f = v => +v.toFixed(2);
const clamp01 = x => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const deg = d => d * Math.PI / 180;
const ptsD = pts => pts.length ? 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join('L') : 'M0 0';

function smooth(pts, closed = false) {
  const n = pts.length;
  const get = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
const poly = pts => 'M' + pts.map(p => `${f(p[0])} ${f(p[1])}`).join(' L');
function ellPts(cx, cy, rx, ry, rot = 0, a0 = 0, a1 = Math.PI * 2, n = 36, j = 0, closed = false) {
  const c = Math.cos(rot), s = Math.sin(rot), pts = [], m = closed ? n : n + 1;
  for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * i / n, jr = 1 + jit(j); const x = rx * Math.cos(a) * jr, y = ry * Math.sin(a) * jr; pts.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return pts;
}
const sketchEll = (cx, cy, rx, ry, rot = 0, j = 0.015) => smooth(ellPts(cx, cy, rx, ry, rot, -0.35 + rand() * 0.2, Math.PI * 2 + 0.1 + rand() * 0.25, 40, j));
const closedEll = (cx, cy, rx, ry, rot = 0, j = 0) => smooth(ellPts(cx, cy, rx, ry, rot, 0, Math.PI * 2, 36, j, true), true);
function roundedPoly(pts, rad) {
  const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const r1 = Math.min(rad, da / 2.2), r2 = Math.min(rad, db / 2.2);
    const p1 = [p[0] + (a[0] - p[0]) * r1 / da, p[1] + (a[1] - p[1]) * r1 / da], p2 = [p[0] + (b[0] - p[0]) * r2 / db, p[1] + (b[1] - p[1]) * r2 / db];
    d += (i ? 'L' : 'M') + `${f(p1[0])} ${f(p1[1])} Q${f(p[0])} ${f(p[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}
function leafShape(base, ang, len, wid) {
  const dir = [Math.cos(ang), Math.sin(ang)], nrm = [-dir[1], dir[0]], L = [], R = [], N = 30;
  const w = t => wid * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, t), 0.8)), 0.85) * (1 - 0.12 * t);
  const mid = t => [base[0] + dir[0] * len * t, base[1] + dir[1] * len * t];
  for (let i = 0; i <= N; i++) { const t = i / N, m = mid(t), ww = w(t); L.push([m[0] + nrm[0] * ww, m[1] + nrm[1] * ww]); R.push([m[0] - nrm[0] * ww, m[1] - nrm[1] * ww]); }
  const outline = smooth([...L, ...R.reverse().slice(1, -1)], true);
  let veins = '';
  [0.18, 0.32, 0.46, 0.6, 0.74, 0.86].forEach(t => [1, -1].forEach(s => { const a = mid(t), b = mid(Math.min(1, t + 0.13)), ww = w(t + 0.06) * 0.88; veins += `M${f(a[0])} ${f(a[1])} Q${f(a[0] + nrm[0] * s * ww * 0.5 + dir[0] * len * 0.03)} ${f(a[1] + nrm[1] * s * ww * 0.5 + dir[1] * len * 0.03)} ${f(b[0] + nrm[0] * s * ww)} ${f(b[1] + nrm[1] * s * ww)}`; }));
  const tip = mid(1);
  return { outline, veins, midrib: `M${f(base[0])} ${f(base[1])} L${f(tip[0])} ${f(tip[1])}`, mid, w, dir, nrm };
}

const INK = '#323619', RED = '#a5583a', SAGE = '#8f9e5c', LEAF = '#9fb371', OCHRE = '#c99a55', PEACH = '#f0b98f', ROSE = '#d9776b',
      LILAC = '#b79ac0', PLUM = '#8c5470', BUTTER = '#f1d38a', TEAL = '#6fa3a0', PAPER = '#f8f0ea', BLUSH = '#e6a99a', SOIL = '#b4906b';
const BCOL = { A: '#8fae6a', C: '#9f86c0', G: '#e0a94e', T: '#d9776b' }, BASES = 'ACGT';

/* ---------- Goodsell-style molecules ---------- */
function blob(parent, circles, fill, outline = 3) {
  const g = el('g', {}, parent);
  const o = el('g', { fill: INK }, g), fl = el('g', { fill }, g);
  circles.forEach(([x, y, r]) => { el('circle', { cx: f(x), cy: f(y), r: f(r + outline) }, o); el('circle', { cx: f(x), cy: f(y), r: f(r) }, fl); });
  return g;
}
function blobCircles(cx, cy, rx, ry, step, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let y = -ry; y <= ry; y += step * 0.86) for (let x = -rx; x <= rx; x += step) {
    const xx = x + jit(step * 0.25) + (Math.round((y + ry) / (step * 0.86)) % 2 ? step / 2 : 0), yy = y + jit(step * 0.25);
    if ((xx / rx) ** 2 + (yy / ry) ** 2 > 1) continue;
    out.push([cx + xx * c - yy * s, cy + xx * s + yy * c, step * (0.62 + rand() * 0.18)]);
  }
  return out;
}
const HCOL = ['#e59a95', '#efb8a8', '#b9a0cf', '#d7a6c4'];
function histone(parent, cx, cy, sc = 1) {
  const g = el('g', {}, parent);
  [[-26, -22], [26, -22], [-30, 22], [30, 22], [0, -34], [0, 34], [-8, 0], [12, 4]].forEach(([dx, dy], i) => blob(g, blobCircles(cx + dx * sc, cy + dy * sc, 26 * sc, 22 * sc, 11 * sc, i), HCOL[i % 4], 2.6 * sc));
  return g;
}

/* ---------- a double helix drawn along any centreline ---------- */
const RUNG_COLS = [BCOL.A, BCOL.C, BCOL.G, BCOL.T];
function helixGeom(pts, A, wl, phase = 0) {
  const n = pts.length, s1 = [], s2 = [], cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    const th = cum[i] * 2 * Math.PI / wl + phase, o1 = A * Math.sin(th), o2 = A * Math.sin(th + 2.3);
    s1.push([pts[i][0] - ty * o1, pts[i][1] + tx * o1]); s2.push([pts[i][0] - ty * o2, pts[i][1] + tx * o2]);
  }
  return { s1, s2 };
}
function makeHelix(parent, sc = 1) {
  const g = el('g', {}, parent);
  return { g, sc,
    body: el('path', { fill: 'none', stroke: BUTTER, 'stroke-opacity': .45, 'stroke-width': 30 * sc, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g),
    rungs: RUNG_COLS.map(c => el('path', { fill: 'none', stroke: c, 'stroke-width': 3.6 * sc, 'stroke-linecap': 'round' }, g)),
    hl: el('path', { fill: 'none', stroke: RED, 'stroke-width': 5 * sc, 'stroke-linecap': 'round', opacity: 0 }, g),
    o2: el('path', { fill: 'none', stroke: INK, 'stroke-width': 9 * sc, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g),
    f2: el('path', { fill: 'none', stroke: '#d98c5f', 'stroke-width': 5.5 * sc, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g),
    o1: el('path', { fill: 'none', stroke: INK, 'stroke-width': 9 * sc, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g),
    f1: el('path', { fill: 'none', stroke: '#e9b45f', 'stroke-width': 5.5 * sc, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g),
  };
}
// mask: optional per-point visibility; hlRange: [i0,i1] of points to highlight (a motif)
function setHelix(H, pts, A, wl, mask, hlRange) {
  const { s1, s2 } = helixGeom(pts, A, wl);
  const runs = arr => { let d = '', on = false; arr.forEach((p, i) => { if (!mask || mask[i]) { d += (on ? 'L' : 'M') + `${f(p[0])} ${f(p[1])}`; on = true; } else on = false; }); return d || 'M0 0'; };
  H.body.setAttribute('d', runs(pts));
  const rd = ['', '', '', '']; let hd = '';
  for (let i = 0; i < pts.length; i += 2) {
    if (mask && !mask[i]) continue;
    const seg = `M${f(s1[i][0])} ${f(s1[i][1])}L${f(s2[i][0])} ${f(s2[i][1])}`;
    if (hlRange && i >= hlRange[0] && i <= hlRange[1]) hd += seg; else rd[(i / 2) % 4] += seg;
  }
  rd.forEach((d, k) => H.rungs[k].setAttribute('d', d || 'M0 0'));
  H.hl.setAttribute('d', hd || 'M0 0');
  const d1 = runs(s1), d2 = runs(s2);
  H.o1.setAttribute('d', d1); H.f1.setAttribute('d', d1); H.o2.setAttribute('d', d2); H.f2.setAttribute('d', d2);
}
// a strand that wraps around a series of histone cores
function buildChain(centres, sc, start, end, tail) {
  const raw = [start], front = [true];
  const bez = (p0, p1, p2, p3, n) => { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; raw.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); front.push(true); } };
  const th0 = Math.PI * .95, turns = 1.65, rx = 78 * sc, ry = 64 * sc;
  centres.forEach(c => {
    const prev = raw[raw.length - 1], ws = [c[0] + rx * Math.cos(th0), c[1] + ry * Math.sin(th0)];
    bez(prev, [lerp(prev[0], ws[0], .35), lerp(prev[1], ws[1], .35)], [ws[0] - 50 * sc, ws[1] + 70 * sc], ws, 40);
    for (let i = 1; i <= 180; i++) { const th = th0 + Math.PI * 2 * turns * i / 180; raw.push([c[0] + rx * Math.cos(th), c[1] + ry * Math.sin(th) + 14 * sc * i / 180]); front.push(Math.sin(th) > 0); }
  });
  const we = raw[raw.length - 1];
  bez(we, [we[0] + 60 * sc, we[1] + 10 * sc], [lerp(we[0], end[0], .6), end[1]], end, 30);
  (tail || []).forEach(p => { raw.push(p); front.push(true); });
  return { raw, front };
}
function resample(raw, front, N) {
  const cum = [0]; for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const L = cum[cum.length - 1], pts = [], fr = []; let k = 0;
  for (let i = 0; i < N; i++) { const s = L * i / (N - 1); while (k < cum.length - 2 && cum[k + 1] < s) k++; const t = (s - cum[k]) / (cum[k + 1] - cum[k] || 1); pts.push([lerp(raw[k][0], raw[k + 1][0], t), lerp(raw[k][1], raw[k + 1][1], t)]); fr.push(front[k]); }
  return { pts, fr, L };
}

/* ---------- little creatures (heads point along +x) ---------- */
function ladybird(parent, sc = 1) {
  const g = el('g', {}, parent), body = el('g', { transform: 'rotate(90)' }, g);
  const legs = [-6, 0, 6].flatMap((y, k) => [-1, 1].map(s => ({ el: el('path', { d: `M${s * 7 * sc} ${y * sc} l${s * 7 * sc} ${(y * .3 - 2) * sc}`, stroke: INK, 'stroke-width': 1.6 * sc, 'stroke-linecap': 'round', fill: 'none' }, body), bx: s * 7 * sc, by: y * sc, phase: (k + (s > 0 ? 1 : 0)) % 2 })));
  el('path', { d: `M${-3 * sc} ${-12 * sc} q${-3 * sc} ${-6 * sc} ${-7 * sc} ${-7 * sc} M${3 * sc} ${-12 * sc} q${3 * sc} ${-6 * sc} ${7 * sc} ${-7 * sc}`, stroke: INK, 'stroke-width': 1.3 * sc, fill: 'none', 'stroke-linecap': 'round' }, body);
  el('ellipse', { cx: 0, cy: -10 * sc, rx: 6 * sc, ry: 5 * sc, fill: INK }, body);
  const shellL = el('path', { d: `M0 ${-8 * sc} A${10 * sc} ${11 * sc} 0 0 0 0 ${13 * sc} Z`, fill: '#c8553d', stroke: INK, 'stroke-width': 1.4 * sc }, body);
  const shellR = el('path', { d: `M0 ${-8 * sc} A${10 * sc} ${11 * sc} 0 0 1 0 ${13 * sc} Z`, fill: '#c8553d', stroke: INK, 'stroke-width': 1.4 * sc }, body);
  [[-5, -1], [-4, 7], [5, -1], [4, 7]].forEach(([x, y]) => el('circle', { cx: x * sc, cy: y * sc, r: 2 * sc, fill: INK }, body));
  el('circle', { cx: -2.5 * sc, cy: -11.5 * sc, r: 1.2 * sc, fill: PAPER }, body); el('circle', { cx: 2.5 * sc, cy: -11.5 * sc, r: 1.2 * sc, fill: PAPER }, body);
  return { g, shellL, shellR, legs, ang: null, amp: 22 };
}
function ant(parent, sc = 1) {
  const g = el('g', {}, parent);
  const legs = [-3, 0, 3].flatMap((x, k) => [-1, 1].map(s => ({ el: el('path', { d: `M${x * sc} 0 q${(x * .6) * sc} ${s * 5 * sc} ${(x * .9 - 1) * sc} ${s * 8 * sc}`, stroke: INK, 'stroke-width': 1.1 * sc, 'stroke-linecap': 'round', fill: 'none' }, g), bx: x * sc, by: 0, phase: (k + (s > 0 ? 1 : 0)) % 2 })));
  el('ellipse', { cx: -9 * sc, cy: 0, rx: 6 * sc, ry: 4.2 * sc, fill: INK }, g);
  el('ellipse', { cx: -1 * sc, cy: 0, rx: 4 * sc, ry: 2.6 * sc, fill: INK }, g);
  el('circle', { cx: 6 * sc, cy: 0, r: 3.4 * sc, fill: INK }, g);
  el('path', { d: `M${8 * sc} ${-1.5 * sc} q${4 * sc} ${-4 * sc} ${8 * sc} ${-3 * sc} M${8 * sc} ${1.5 * sc} q${4 * sc} ${4 * sc} ${8 * sc} ${3 * sc}`, stroke: INK, 'stroke-width': 1 * sc, fill: 'none', 'stroke-linecap': 'round' }, g);
  return { g, legs, ang: null, amp: 26 };
}
// walk a creature along a path; heading is smoothed so turns stay gentle
function placeOnPath(c, pathEl, t, len) {
  const L = len || pathEl.getTotalLength(), s = clamp01(t) * L;
  const p = pathEl.getPointAtLength(s), a = pathEl.getPointAtLength(Math.max(0, s - 7)), b = pathEl.getPointAtLength(Math.min(L, s + 7));
  let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  if (c.ang !== null) { const d = ((ang - c.ang + 540) % 360) - 180; ang = c.ang + d * 0.35; }
  c.ang = ang;
  c.g.setAttribute('transform', `translate(${f(p.x)} ${f(p.y)}) rotate(${f(ang)})`);
  // tripod gait: two alternating sets of legs, driven by distance walked
  c.legs.forEach(l => l.el.setAttribute('transform', `rotate(${f(Math.sin(s * .55 + l.phase * Math.PI) * c.amp)} ${l.bx} ${l.by})`));
}

/* =====================================================================
   HERO
   ===================================================================== */
{
  const art = $('sproutArt');
  const ground = [[-250, 120], [-160, 104], [-60, 96], [40, 100], [140, 92], [250, 112]];
  el('path', { d: smooth(ground) + 'L250 200 L-250 200Z', fill: 'url(#soilFade)' }, art);
  const soilLine = el('path', { d: smooth(ground), class: 'ink', pathLength: 1 }, art);
  const pebbles = [[-170, 140, 7], [-90, 160, 5], [120, 150, 8], [190, 132, 4], [30, 176, 6]].map(([x, y, r]) => el('path', { d: sketchEll(x, y, r, r * .7), class: 'ink t', pathLength: 1 }, art));
  const seedShell = el('path', { d: closedEll(-10, 118, 16, 10, 0.3), fill: OCHRE, 'fill-opacity': .8 }, art);
  const roots = ['M0 100 Q-6 130 -22 160', 'M0 100 Q8 140 4 182', 'M2 104 Q20 128 38 146', 'M-10 140 Q-34 150 -44 170'].map(d => el('path', { d, class: 'ink t w', pathLength: 1 }, art));
  const stem = el('path', { d: 'M0 100 C-6 40 18 -20 4 -90 C-4 -130 6 -170 10 -200', class: 'ink b', pathLength: 1 }, art);
  const leafDefs = [[[2, -60], -165, 120, 40], [[6, -70], -20, 130, 44], [[8, -150], -140, 90, 30], [[10, -160], -40, 96, 32]];
  const leaves = leafDefs.map(([b, a, l, w]) => { const L = leafShape(b, deg(a), l, w); const g = el('g', { class: 'sleaf' }, art); el('path', { d: L.outline, fill: LEAF, 'fill-opacity': .6, transform: 'translate(2 -2)' }, g); el('path', { d: L.outline, class: 'ink', pathLength: 1 }, g); el('path', { d: L.midrib + L.veins, class: 'ink t', pathLength: 1 }, g); g.base = b; return g; });
  const bud = el('path', { d: closedEll(10, -206, 9, 13), fill: PEACH, 'fill-opacity': .9, stroke: INK, 'stroke-width': 1.4 }, art);

  const walkPath = el('path', { d: smooth([[175, 104], [120, 100], [60, 99], [22, 94], [6, 66], [6, 20], [10, -24], [4, -58], [18, -80], [52, -94], [84, -100]]), fill: 'none' }, $('sprout'));
  const lb = ladybird($('ladybird'), 1.15);
  const LEN = walkPath.getTotalLength(), W = { t: 0 };
  const placeLB = () => placeOnPath(lb, walkPath, W.t, LEN);
  placeLB();

  const inks = [soilLine, ...pebbles, ...roots, stem, ...art.querySelectorAll('.sleaf .ink')];
  gsap.set(inks, { strokeDasharray: '1 2', strokeDashoffset: 1.01 });
  gsap.set(art.querySelectorAll('.sleaf path:first-child'), { opacity: 0 });
  gsap.set([seedShell, bud, lb.g], { opacity: 0 });
  const grow = gsap.timeline({ delay: .3 });
  grow.to(soilLine, { strokeDashoffset: 0, duration: .8 })
      .to(pebbles, { strokeDashoffset: 0, duration: .3, stagger: .05 }, '<.3')
      .to(seedShell, { opacity: 1, duration: .3 }, '<')
      .to(roots, { strokeDashoffset: 0, duration: .6, stagger: .08 }, '>-.1')
      .to(stem, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, '<.2')
      .to(art.querySelectorAll('.sleaf .ink'), { strokeDashoffset: 0, duration: .6, stagger: .1 }, '>-.5')
      .to(art.querySelectorAll('.sleaf path:first-child'), { opacity: 1, duration: .5, stagger: .1 }, '<.3')
      .to([bud, lb.g], { opacity: 1, duration: .4 }, '>-.2')
      .to(W, { t: .3, duration: 2.2, ease: 'sine.inOut', onUpdate: placeLB }, '<')
      .to(W, { t: 1, duration: 4.2, ease: 'sine.inOut', onUpdate: placeLB }, '>.5');
  if (reduceMotion) grow.progress(1);
  else leaves.forEach((g, i) => gsap.to(g, { rotation: i % 2 ? 3 : -3, svgOrigin: `${g.base[0]} ${g.base[1]}`, duration: 2.4 + i * .3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 3 + i * .2 }));

  // click the ladybird: it flies a loop and says something
  const LINES = ['hi!', 'wheee', 'technically a beetle', 'aphids, anyone?', 'back to work'];
  let li = 0, busy = false;
  const bubble = $('bubble'), bPath = bubble.querySelector('path'), bText = bubble.querySelector('text');
  function say(s, x, y) {
    bText.textContent = s; bText.setAttribute('x', x); bText.setAttribute('y', y - 30);
    const w = s.length * 9 + 28;
    bPath.setAttribute('d', `M${x - w / 2} ${y - 52} h${w} a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h${-w / 2 + 14} l-10 10 l-2 -10 h${-w / 2 + 6} a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8Z`);
    gsap.fromTo(bubble, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .25 });
    gsap.to(bubble, { opacity: 0, duration: .3, delay: 1.6 });
  }
  $('ladybird').addEventListener('click', () => {
    if (busy || grow.isActive()) return; busy = true;
    const p = walkPath.getPointAtLength(LEN), P = { a: 0 };
    const fly = gsap.timeline({ onComplete: () => { busy = false; lb.ang = null; placeLB(); say(LINES[li++ % LINES.length], p.x, p.y); } });
    fly.to(lb.shellL, { rotation: -35, svgOrigin: '0 -8', duration: .15 }, 0).to(lb.shellR, { rotation: 35, svgOrigin: '0 -8', duration: .15 }, 0)
       .to(P, { a: 1, duration: 1.8, ease: 'sine.inOut', onUpdate: () => {
         const a = P.a * Math.PI * 2, x = p.x + 70 * Math.sin(a) + 40 * Math.sin(a * 2), y = p.y - 110 * Math.sin(a / 2) ** 1.2;
         lb.g.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(-90 + Math.cos(a) * 50)})`);
       } }, .1)
       .to([lb.shellL, lb.shellR], { rotation: 0, svgOrigin: '0 -8', duration: .2 }, '>-.1');
  });
}

/* =====================================================================
   STORY: nested zoom levels (0 nucleosome, 1 chromatin, 2 nucleus, 3 cells, 4 leaf, 5 plant, 6 field)
   ===================================================================== */
const LV = [];
function makeLevel(i, k, a) {
  const g = el('g', { style: 'display:none' }, $('levels'));
  const inner = el('g', {}, g);
  return (LV[i] = { g, inner, inks: [], washes: [], k, a });
}
const ink = (L, d, cls = '', parent, style) => { const p = el('path', { d, class: 'ink ' + cls, pathLength: 1 }, parent || L.inner); if (style) p.setAttribute('style', style); L.inks.push(p); return p; };
const wsh = (L, d, color, op = .5, extra = {}, parent) => { const p = el('path', { d, fill: color, 'fill-opacity': op, transform: 'translate(2.5 -2)', ...extra }, parent || L.inner); L.washes.push(p); return p; };

const PLANT_LEAVES = [
  { node: [0, 90], ang: deg(200), len: 220, wid: 70 },
  { node: [2, -40], ang: deg(-22), len: 270, wid: 85 },
  { node: [4, -170], ang: deg(205), len: 190, wid: 60 },
  { node: [5, -255], ang: deg(-52), len: 140, wid: 44 },
  { node: [6, -300], ang: deg(-100), len: 70, wid: 24 },
];
const PLANT_STEM = [[0, 330], [-5, 150], [3, -60], [6, -320]];
const K5 = 6;

/* ================= 6: the field ================= */
const LF = makeLevel(6, 1, [0, 0]);
const fieldPlants = [];
let anchorPlant;
{
  const L = LF, VP = [0, -140];
  wsh(L, 'M-700 -700 H700 V-140 H-700Z', BLUSH, .3, { transform: '' });
  L.sunG = el('g', {}, L.inner);
  L.sunWash = wsh(L, closedEll(190, -268, 40, 40), '#ee9a64', .8, {}, L.sunG);
  ink(L, sketchEll(190, -268, 39, 39), '', L.sunG);
  L.rays = el('g', {}, L.sunG);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + .12, r1 = i % 2 ? 50 : 54, r2 = i % 2 ? 64 : 74; ink(L, poly([[190 + r1 * Math.cos(a), -268 + r1 * Math.sin(a)], [190 + r2 * Math.cos(a), -268 + r2 * Math.sin(a)]]), 't r', L.rays); }
  const hills = [[-520, -140], [-400, -176], [-280, -160], [-160, -206], [-30, -178], [100, -196], [240, -160], [380, -182], [520, -150]];
  wsh(L, smooth(hills) + 'L520 -140 L-520 -140Z', LILAC, .3);
  ink(L, smooth(hills));
  wsh(L, 'M-700 -140 H700 V700 H-700Z', SOIL, .28, { transform: '' });
  ink(L, 'M-560 -140 L560 -140', 't');
  for (let j = -4; j <= 4; j++) { const xb = -100 + j * 170; ink(L, poly([[VP[0] + j * 2, VP[1]], [xb * 1.35, VP[1] + 560 * 1.35]]), 't w'); }
  for (let i = 0; i < 40; i++) { const x = -330 + rand() * 660, y = -60 + rand() * 400; ink(L, `M${f(x)} ${f(y)} l${f(9 + rand() * 10)} ${f(jit(1.5))}`, 't w'); }
  L.cracks = ['M60 330 L74 306 L66 290 L92 270 L110 278', 'M74 306 L104 314 L120 300', 'M170 316 L180 292 L206 284 L214 262', 'M-240 300 L-226 282 L-204 280'].map(d => ink(L, d, 'w'));
  // a crack that forms as you read
  L.crackG = el('g', {}, L.inner);
  L.growCrack = el('path', { d: 'M-268 318 L-254 296 L-260 278 L-236 262 L-230 240 L-208 232 M-260 278 L-284 266 L-296 252 M-236 262 L-214 270 L-196 264', class: 'ink w', pathLength: 1 }, L.crackG);
  [0.15, 0.22, 0.3, 0.4, 0.6, 0.8].forEach(t => {
    for (let j = -4; j <= 4; j++) {
      const xb = -100 + j * 170, c = [VP[0] + t * (xb - VP[0]), VP[1] + t * 560], s = 100 * t;
      if (Math.abs(c[0]) > 470) continue;
      const g = el('g', {}, L.inner), sc = s / 60 / K5, stressed = rand() < .45;
      const P = { c, s, t, j, g, washes: [], stressed, base: [c[0], c[1] + 330 * sc] };
      ink(L, smooth(PLANT_STEM.map(([x, y]) => [c[0] + x * sc, c[1] + y * sc])), t > .5 ? '' : 't', g);
      PLANT_LEAVES.forEach(lf => {
        const sh = leafShape([c[0] + lf.node[0] * sc, c[1] + lf.node[1] * sc], lf.ang, lf.len * sc, lf.wid * sc);
        P.washes.push(wsh(L, sh.outline, stressed ? OCHRE : LEAF, .62, { transform: '' }, g));
        ink(L, sh.outline, 't', g);
      });
      if (t >= 0.3) {
        const top = [c[0] + 6 * sc, c[1] - 320 * sc], r = Math.max(3, s * .07), fl = el('g', { opacity: 0 }, g);
        [0, 72, 144, 216, 288].forEach(a => el('ellipse', { cx: f(top[0]), cy: f(top[1] - r), rx: f(r * .6), ry: f(r), fill: PEACH, stroke: INK, 'stroke-width': .8, transform: `rotate(${a} ${f(top[0])} ${f(top[1])})` }, fl));
        el('circle', { cx: f(top[0]), cy: f(top[1]), r: f(r * .5), fill: OCHRE }, fl);
        P.flower = fl; P.top = top;
      }
      fieldPlants.push(P);
      if (t === 0.6 && j === 0) anchorPlant = P;
    }
  });
  L.antPath = el('path', { d: smooth([[-420, 372], [-250, 352], [-80, 366], [80, 348], [250, 364], [420, 350]]), fill: 'none' }, L.inner);
  L.ants = [0, 1, 2].map(() => ant(L.inner, 1.3));
}

/* ================= 5: one plant ================= */
const LP = makeLevel(5, K5, anchorPlant.c);
let plantBug, plantBugPath;
const plantLeafGroups = [];
{
  const L = LP;
  wsh(L, 'M-700 330 C-300 318 300 340 700 326 V700 H-700Z', SOIL, .4, { transform: '' });
  ink(L, smooth([[-520, 334], [-260, 324], [0, 332], [260, 322], [520, 330]]));
  ['M0 334 Q-30 380 -90 420', 'M0 334 Q10 400 -10 460', 'M2 336 Q60 370 110 430', 'M-40 380 Q-80 384 -120 400', 'M60 372 Q80 360 130 362'].forEach(d => ink(L, d, 't w'));
  wsh(L, smooth(PLANT_STEM.map(([x, y]) => [x - 6, y])) + 'L' + smooth(PLANT_STEM.slice().reverse().map(([x, y]) => [x + 6, y])).slice(1) + 'Z', LEAF, .55, { transform: '' });
  ink(L, smooth(PLANT_STEM.map(([x, y]) => [x - 6, y])));
  ink(L, smooth(PLANT_STEM.map(([x, y]) => [x + 6, y])));
  PLANT_LEAVES.forEach(lf => {
    const g = el('g', {}, L.inner), sh = leafShape(lf.node, lf.ang, lf.len, lf.wid);
    wsh(L, sh.outline, LEAF, .6, {}, g); ink(L, sh.outline, '', g); ink(L, sh.midrib, 't', g); ink(L, sh.veins, 't', g);
    g.node = lf.node; plantLeafGroups.push(g);
  });
  plantBugPath = el('path', { d: smooth([[-6, 326], [-6, 240], [-4, 150], [-1, 60], [2, -10], [4, -38], [30, -52], [70, -66], [104, -80]]), fill: 'none' }, L.inner);
  plantBug = ladybird(L.inner, 1.9);
}
const LEAF_B = PLANT_LEAVES[1];
const LEAF_B_CENTRE = [LEAF_B.node[0] + Math.cos(LEAF_B.ang) * LEAF_B.len * .5, LEAF_B.node[1] + Math.sin(LEAF_B.ang) * LEAF_B.len * .5];

/* ================= 4: one leaf ================= */
const K4 = 680 / LEAF_B.len;
const LL = makeLevel(4, K4, LEAF_B_CENTRE);
let cellAnchor, leafSh, aphidPos;
{
  const L = LL, len = 680, wid = LEAF_B.wid * K4;
  const base = [-Math.cos(LEAF_B.ang) * len / 2, -Math.sin(LEAF_B.ang) * len / 2];
  const sh = leafSh = leafShape(base, LEAF_B.ang, len, wid);
  wsh(L, sh.outline, LEAF, .6); ink(L, sh.outline, 'b'); ink(L, sh.midrib, 'b'); ink(L, sh.veins);
  let net = '';
  for (let i = 0; i < 70; i++) { const t = .08 + rand() * .84, s = rand() < .5 ? 1 : -1, m = sh.mid(t), off = sh.w(t) * (.15 + rand() * .7) * s; const p = [m[0] + sh.nrm[0] * off, m[1] + sh.nrm[1] * off], a = rand() * Math.PI; net += `M${f(p[0])} ${f(p[1])} l${f(Math.cos(a) * 18)} ${f(Math.sin(a) * 18)}`; }
  ink(L, net, 't', null, 'stroke-opacity:.6');
  const m = sh.mid(.56), off = sh.w(.56) * .42;
  cellAnchor = [m[0] + sh.nrm[0] * off, m[1] + sh.nrm[1] * off];
  aphidPos = [cellAnchor[0] - 120, cellAnchor[1] + 40];
  [[0, 0, 20, 1], [38, 26, -35, .85], [-34, 46, 70, .9], [12, 58, 160, .75]].forEach(([dx, dy, rot, sz]) => {
    const aph = el('g', { transform: `translate(${f(aphidPos[0] + dx)} ${f(aphidPos[1] + dy)}) rotate(${rot}) scale(${sz})` }, L.inner);
    el('ellipse', { cx: 0, cy: 0, rx: 9, ry: 6, fill: '#a9c27a', stroke: INK, 'stroke-width': 1.3 }, aph);
    el('circle', { cx: 8, cy: 0, r: 3, fill: '#93ad66', stroke: INK, 'stroke-width': 1 }, aph);
    el('path', { d: 'M-6 4 l-4 6 M0 5 l0 7 M6 4 l4 6 M-6 -4 l-4 -6 M0 -5 l0 -7 M6 -4 l4 -6 M10 -2 q8 -6 12 -2 M10 2 q8 6 12 2 M-9 -2 l-5 -3 M-9 2 l-5 3', stroke: INK, 'stroke-width': 1.1, fill: 'none' }, aph);
  });
}

/* ================= 3: cells forming ================= */
const LC = makeLevel(3, 24, cellAnchor);
const NUC_ANCHOR = [12, -14];
LC.cells = [];
let capCell;
{
  const L = LC;
  wsh(L, 'M-800 -800 H800 V800 H-800Z', '#e8d9b5', .55, { transform: '' });
  const seeds = [[0, 0]];
  for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { if (!i && !j) continue; const x = i * 104 + (Math.abs(j) % 2 ? 52 : 0) + jit(22), y = j * 90 + jit(20); if (Math.hypot(x, y) < 620) seeds.push([x, y]); }
  const vor = d3.Delaunay.from(seeds).voronoi([-700, -700, 700, 700]);
  seeds.forEach((sd, i) => {
    const cp = vor.cellPolygon(i); if (!cp) return;
    const pts = cp.slice(0, -1).map(([x, y]) => { const dx = sd[0] - x, dy = sd[1] - y, d = Math.hypot(dx, dy); return [x + dx * 7 / d, y + dy * 7 / d]; });
    const g = el('g', {}, L.inner), d = roundedPoly(pts, 16);
    el('path', { d, fill: '#cfdcab', 'fill-opacity': .75 }, g);
    el('path', { d, class: 'ink' }, g);
    const chl = [];
    pts.forEach(p => { const q = [sd[0] + (p[0] - sd[0]) * .72, sd[1] + (p[1] - sd[1]) * .72], a = Math.atan2(p[1] - sd[1], p[0] - sd[0]) + Math.PI / 2; chl.push(q); el('path', { d: closedEll(q[0], q[1], 12, 6.5, a), fill: '#8fb06a', stroke: INK, 'stroke-width': 1.3 }, g); });
    const n = i === 0 ? [...NUC_ANCHOR, 22] : [sd[0] + jit(14), sd[1] + jit(14), 17];
    el('circle', { cx: f(n[0]), cy: f(n[1]), r: n[2], fill: '#e9b3a8', stroke: INK, 'stroke-width': 1.6 }, g);
    el('circle', { cx: f(n[0] - n[2] * .3), cy: f(n[1] + n[2] * .2), r: n[2] * .3, fill: PLUM, 'fill-opacity': .6 }, g);
    const mito = [];
    [[-1, 1], [1, -1]].forEach(([sx, sy]) => {
      const m = [sd[0] + sx * 28 + jit(4), sd[1] + sy * 26 + jit(4)], a = rand() * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
      el('path', { d: closedEll(m[0], m[1], 9, 5, a), fill: '#eaa48c', stroke: INK, 'stroke-width': 1.2 }, g);
      el('path', { d: `M${f(m[0] - 6 * ca)} ${f(m[1] - 6 * sa)} q${f(3 * ca - 3 * sa)} ${f(3 * sa + 3 * ca)} ${f(6 * ca)} ${f(6 * sa)} t${f(6 * ca)} ${f(6 * sa)}`, fill: 'none', stroke: INK, 'stroke-width': .8 }, g);
      mito.push(m);
    });
    const c = { g, seed: sd, d: Math.hypot(sd[0], sd[1]), chl, mito };
    L.cells.push(c);
    if (!capCell || Math.hypot(sd[0] - 200, sd[1] + 180) < Math.hypot(capCell.seed[0] - 200, capCell.seed[1] + 180)) capCell = c;
  });
  L.cells.sort((a, b) => a.d - b.d);
}

/* ================= 2: the nucleus ================= */
const K2 = 14.5, K1 = 3.7, K0 = 3;
const FIBRE_ANCHOR = [80, 70];   // where the chromatin close-up sits inside the nucleus
const LN = makeLevel(2, K2, NUC_ANCHOR);
// chromatin close-up geometry (level 1), defined here so the nucleus can draw a small copy of it
const FIBRE = [[-430, 130], [-300, 20], [-170, 120], [-40, 0], [95, 110], [225, -5], [350, 95], [470, -15]];
const FIBRE_IDX = 3;
{
  const L = LN;
  wsh(L, closedEll(0, 0, 320, 320), '#efc4b8', .55, { transform: '' });
  ink(L, sketchEll(0, 0, 322, 322, 0, .004), 'b');
  ink(L, sketchEll(0, 0, 308, 308, 0, .004), 't');
  for (let i = 0; i < 22; i++) { const a = i * Math.PI * 2 / 22; blob(L.inner, [[315 * Math.cos(a), 315 * Math.sin(a), 9], [315 * Math.cos(a + .03), 315 * Math.sin(a + .03), 7]], LILAC, 2.5); }
  const nucleolus = ellPts(-120, -95, 78, 62, .3, 0, Math.PI * 2, 16, .08, true);
  wsh(L, smooth(nucleolus, true), PLUM, .45); ink(L, smooth(nucleolus, true));
  L.nucleolus = [-120, -95];
  const tube = (pts, beads) => {
    el('path', { d: smooth(pts), fill: 'none', stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.inner);
    el('path', { d: smooth(pts), fill: 'none', stroke: BUTTER, 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.inner);
    beads.forEach(([x, y], i) => blob(L.inner, [[x, y, 6], [x + 2, y - 2, 4.5]], HCOL[i % 4], 1.6));
  };
  for (let s = 0; s < 7; s++) {
    let p = [jit(220), jit(220)], a = rand() * Math.PI * 2; const pts = [p];
    for (let i = 0; i < 26; i++) { a += jit(.9); p = [p[0] + Math.cos(a) * 22, p[1] + Math.sin(a) * 22]; if (Math.hypot(...p) > 270) { a += Math.PI; p = [p[0] * .9, p[1] * .9]; } if (Math.hypot(p[0] - FIBRE_ANCHOR[0], p[1] - FIBRE_ANCHOR[1]) < 60) { a += Math.PI; } pts.push(p); }
    tube(pts, pts.filter((_, i) => i % 2));
  }
  // the strand we zoom into: a small copy of the chromatin close-up
  const mini = FIBRE.map(([x, y]) => [FIBRE_ANCHOR[0] + x / K1, FIBRE_ANCHOR[1] + y / K1]);
  tube([[mini[0][0] - 60, mini[0][1] + 60], ...mini, [mini[mini.length - 1][0] + 50, mini[mini.length - 1][1] - 70]], mini);
  L.capChromatin = mini[1];
}

/* ================= 1: chromatin, beads on a string ================= */
const L0_ORIGIN = [FIBRE[FIBRE_IDX][0] + 150 / K0, FIBRE[FIBRE_IDX][1] - 10 / K0];
const LB = makeLevel(1, K1, FIBRE_ANCHOR);
{
  const L = LB, sc = 1 / K0;
  const crowd = el('g', { opacity: .4 }, L.inner);
  for (let i = 0; i < 30; i++) blob(crowd, blobCircles(jit(480), jit(480), 6 + rand() * 7, 4 + rand() * 5, 4, rand() * 3), ['#ead7c9', '#dcd3e6', '#d6e2c8', '#f1dcc0'][i % 4], 1);
  const ch = buildChain(FIBRE, sc, [-560, 250], [600, -120]);
  const { pts, fr } = resample(ch.raw, ch.front, 1100);
  const back = makeHelix(L.inner, sc);
  setHelix(back, pts, 13 * sc, 56 * sc);
  FIBRE.forEach(([x, y]) => histone(L.inner, x, y, sc));
  const front = makeHelix(L.inner, sc);
  setHelix(front, pts, 13 * sc, 56 * sc, fr);
  front.body.setAttribute('stroke-opacity', 0);
}

/* ================= 0: one nucleosome, and a gene ================= */
const L0 = makeLevel(0, K0, L0_ORIGIN);
const M = { u: 0, motif: 0, aba: 0, tf: 0, polIn: 0, polX: 40, detach: 0, ribo: 0, fold: 0 };
const L0C = { s: 1, fx: 0, fy: 0 };
const mol = {};
{
  const g = L0.inner;
  const crowd = el('g', { opacity: .45 }, g);
  for (let i = 0; i < 34; i++) { const x = jit(440), y = jit(440); if (Math.abs(y - 40) < 40) continue; blob(crowd, blobCircles(x, y, 14 + rand() * 18, 10 + rand() * 12, 9, rand() * 3), ['#ead7c9', '#dcd3e6', '#d6e2c8', '#f1dcc0'][i % 4], 2); }
  const HC = [-150, 10];
  const tail = []; for (let x = 80; x <= 520; x += 10) tail.push([x, 40]);
  const ch = buildChain([HC], 1, [-640, 200], [70, 40], tail);
  const { pts: wrapped, fr: frontS, L: Ltot } = resample(ch.raw, ch.front, 380);
  const N = wrapped.length;
  const straight = wrapped.map((_, i) => [520 - Ltot + Ltot * i / (N - 1), 40]);
  const mi = straight.map((p, i) => p[0] > -118 && p[0] < -56 ? i : -1).filter(i => i >= 0);
  Object.assign(mol, { wrapped, straight, frontS, N, HC, motifRange: [mi[0], mi[mi.length - 1]], motifX: -87 });
  mol.back = makeHelix(g);
  mol.histone = el('g', {}, g); histone(mol.histone, HC[0], HC[1]);
  mol.front = makeHelix(g); mol.front.body.setAttribute('stroke-opacity', 0);
  // ABA: small molecules drifting in
  mol.aba = Array.from({ length: 9 }, () => {
    const a = el('g', { opacity: 0 }, g);
    blob(a, [[0, 0, 4.5], [6, -3, 3.5], [-5, 4, 3.5], [3, 6, 3]], '#c5d88a', 1.6);
    return { el: a, from: [380 + rand() * 260, -420 - rand() * 200], to: [60 + rand() * 300, -320 + rand() * 230], ph: rand() * 6 };
  });
  // transcription factor: a bZIP dimer gripping the DNA like forceps
  mol.tf = el('g', {}, g);
  [-1, 1].forEach(s => {
    const arm = []; for (let i = 0; i <= 8; i++) { const t = i / 8; arm.push([s * lerp(24, 7, t), lerp(6, -110, t), 10.5 - t * 2]); }
    blob(mol.tf, [...arm, ...blobCircles(s * 22, -150, 30, 26, 11)], s < 0 ? LILAC : '#cdb4d8', 3);
  });
  blob(mol.tf, [[0, -118, 10], [0, -132, 10]], '#a98ab8', 3);
  // Mediator: a large co-activator that bridges the ABF and the polymerase
  mol.med = el('g', { opacity: 0 }, g);
  blob(mol.med, blobCircles(-22, -150, 62, 42, 13, .2), '#e6c9b0', 3);
  blob(mol.med, blobCircles(14, -112, 34, 26, 11, -.4), '#d9b99e', 2.5);
  // RNA polymerase II
  mol.pol = el('g', {}, g);
  blob(mol.pol, blobCircles(0, -6, 82, 66, 13), '#a9bb84', 3);
  blob(mol.pol, blobCircles(-26, -34, 34, 26, 11, .4), '#8fa06a', 2.5);
  blob(mol.pol, blobCircles(34, 20, 30, 22, 11, -.3), '#bfcd9a', 2.5);
  // mRNA: a single strand with bases along one side
  mol.mrnaT = el('path', { fill: 'none', stroke: '#d9776b', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
  mol.mrnaO = el('path', { fill: 'none', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  mol.mrnaB = el('path', { fill: 'none', stroke: PEACH, 'stroke-width': 6.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  // ribosome
  mol.ribo = el('g', { opacity: 0 }, g);
  blob(mol.ribo, blobCircles(0, -28, 58, 38, 12), '#d9b48f', 3);
  blob(mol.ribo, blobCircles(0, 18, 46, 22, 10), '#efdcc0', 3);
  // protein chain
  mol.protO = el('g', { fill: INK }, g); mol.protF = el('g', { fill: TEAL }, g);
  mol.beads = []; const NB = 26, packed = []; let ring = 0;
  while (packed.length < NB) { const n = ring ? ring * 6 : 1; for (let q = 0; q < n && packed.length < NB; q++) { const a = q / n * Math.PI * 2 + ring; packed.push([ring * 15 * Math.cos(a), ring * 15 * Math.sin(a) * .85]); } ring++; }
  for (let i = 0; i < NB; i++) mol.beads.push({ o: el('circle', { r: 11, opacity: 0 }, mol.protO), f: el('circle', { r: 8, opacity: 0 }, mol.protF), packed: packed[i] });
  mol.foldC = [230, -110];
}
const mrnaLen = () => Math.max(0, M.polX - 40) * 1.05;
const freePt = s => [-170 + s * 1.05, -250 + 18 * Math.sin(s / 26)];
function renderMol() {
  const { wrapped, straight, frontS, N } = mol;
  const pts = wrapped.map((p, i) => { const u = smoothstep(0, 1, M.u * 1.6 - (1 - i / (N - 1)) * .6); return [lerp(p[0], straight[i][0], u), lerp(p[1], straight[i][1], u)]; });
  const hl = M.motif > .02 ? mol.motifRange : null;
  setHelix(mol.back, pts, 13, 56, null, hl);
  setHelix(mol.front, pts, 13, 56, frontS, hl);
  mol.front.g.setAttribute('opacity', 1 - smoothstep(.25, .55, M.u));
  mol.back.hl.setAttribute('opacity', M.motif); mol.front.hl.setAttribute('opacity', M.motif);
  mol.histone.setAttribute('transform', `translate(${f(-150 * M.u)} ${f(170 * M.u)}) rotate(${f(-25 * M.u)} ${mol.HC[0]} ${mol.HC[1]})`);
  mol.aba.forEach((a, i) => {
    const t = clamp01(M.aba * 1.3 - i * .035), x = lerp(a.from[0], a.to[0], t) + 10 * Math.sin(t * 7 + a.ph), y = lerp(a.from[1], a.to[1], t) + 8 * Math.cos(t * 9 + a.ph);
    a.el.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(t * 140 + a.ph * 30)})`); a.el.setAttribute('opacity', smoothstep(0, .15, t));
  });
  const tf = M.tf, tx = lerp(240, mol.motifX, tf) + 30 * Math.sin(tf * 10) * (1 - tf), ty = lerp(-460, 40, tf) + 12 * Math.cos(tf * 13) * (1 - tf);
  mol.tf.setAttribute('transform', `translate(${f(tx)} ${f(ty)}) rotate(${f(55 * (1 - tf) * Math.sin(tf * 6 + 1))})`);
  mol.tf.setAttribute('opacity', smoothstep(0, .15, tf));
  const pin = M.polIn, px = lerp(520, M.polX, pin), py = lerp(-360, 34, pin);
  mol.med.setAttribute('opacity', smoothstep(0, .35, pin));
  mol.med.setAttribute('transform', `translate(${f(60 * (1 - pin))} ${f(-120 * (1 - smoothstep(0, 1, pin)))})`);
  mol.pol.setAttribute('transform', `translate(${f(px + 300 * M.detach)} ${f(py - 30 * M.detach)})`);
  mol.pol.setAttribute('opacity', smoothstep(0, .2, pin) * (1 - smoothstep(.4, 1, M.detach)));
  const Lm = mrnaLen(), mp = [];
  for (let s = 0; s <= Lm; s += 5) { const a = [M.polX - 10 - s * .72, -40 - s * .5 + 14 * Math.sin(s / 20)], b = freePt(Lm - s); mp.push([lerp(a[0], b[0], M.detach), lerp(a[1], b[1], M.detach)]); }
  const md = mp.length > 1 ? ptsD(mp) : 'M0 0';
  let td = '';
  for (let i = 1; i < mp.length - 1; i += 2) { const a = mp[i - 1], b = mp[i + 1]; const tx2 = b[0] - a[0], ty2 = b[1] - a[1], m = Math.hypot(tx2, ty2) || 1; td += `M${f(mp[i][0])} ${f(mp[i][1])}l${f(-ty2 / m * 10)} ${f(tx2 / m * 10)}`; }
  mol.mrnaO.setAttribute('d', md); mol.mrnaB.setAttribute('d', md); mol.mrnaT.setAttribute('d', td || 'M0 0');
  const mo = mp.length > 1 ? 1 : 0; [mol.mrnaO, mol.mrnaB, mol.mrnaT].forEach(e => e.setAttribute('opacity', mo));
  const rp = freePt(M.ribo * Lm);
  mol.ribo.setAttribute('transform', `translate(${f(rp[0])} ${f(rp[1])})`);
  mol.ribo.setAttribute('opacity', smoothstep(0, .05, M.ribo) * (1 - smoothstep(.6, 1, M.fold)));
  const nb = mol.beads.length;
  mol.beads.forEach((b, i) => {
    const on = M.ribo * nb > i + .5, sp = freePt((i + .5) / nb * Lm);
    const chain = [lerp(sp[0], rp[0] - (M.ribo * nb - i) * 3, .3), sp[1] - 56 - 10 * Math.sin(i * 1.3)];
    const x = lerp(chain[0], mol.foldC[0] + b.packed[0], M.fold), y = lerp(chain[1], mol.foldC[1] + b.packed[1], M.fold);
    [b.o, b.f].forEach(c => { c.setAttribute('cx', f(x)); c.setAttribute('cy', f(y)); c.setAttribute('opacity', on ? 1 : 0); });
    b.o.setAttribute('r', lerp(9.5, 11, M.fold));
  });
}

/* ---------- camera ---------- */
const Z = { v: 6 };
const SCALES = ['≈ 10 nm', '≈ 50 nm', '≈ 1 µm', '≈ 20 µm', '≈ 1 cm', '≈ 10 cm', '≈ 5 m'];
const scaleTxt = $('scalebar').querySelector('text');
function place(L, S, fx, fy, op) {
  if (op <= 0.002) { L.g.style.display = 'none'; return; }
  L.g.style.display = '';
  L.g.setAttribute('transform', `scale(${S}) translate(${-fx} ${-fy})`);
  L.g.style.setProperty('--sw', 1 / S);
  L.g.setAttribute('opacity', op);
}
function renderZoom() {
  const z = Math.max(0, Math.min(6, Z.v));
  const n = Math.min(Math.floor(z), 5), t = z - n, kn = LV[n].k, an = LV[n].a;
  const So = Math.pow(kn, 1 - t), u = (1 / So - 1 / kn) / (1 - 1 / kn), fo = [an[0] * (1 - u), an[1] * (1 - u)];
  LV.forEach((L, i) => { if (i !== n && i !== n + 1) L.g.style.display = 'none'; });
  if (z < 1e-4) { LV[1].g.style.display = 'none'; place(LV[0], L0C.s, L0C.fx, L0C.fy, 1); }
  else {
    place(LV[n + 1], So, fo[0], fo[1], smoothstep(.06, .5, t));
    place(LV[n], So / kn, (fo[0] - an[0]) * kn, (fo[1] - an[1]) * kn, 1 - smoothstep(.45, .9, t));
  }
  scaleTxt.textContent = SCALES[Math.round(z)];
}

/* =====================================================================
   MODEL SCENE (stage coordinates)
   ===================================================================== */
const MOD = $('model');
const SEQ = 'TTCAGCACGTGGCATTATAAAGCC';   // an ABRE (ACGTGG) and a TATA box
const MS = { win: 0, scan: 0, pulse: 0, out: 0 };
const mdl = {};
{
  const g = MOD, x0 = -264, cw = 22, gy = -240;
  mdl.A = el('g', { transform: 'translate(0 150)' }, g); mdl.C = el('g', {}, g); mdl.D = el('g', { opacity: 0 }, g);
  const A = mdl.A;
  mdl.ribbon = el('g', {}, A);
  const rib = []; for (let x = x0 - 6; x <= x0 + 24 * cw + 6; x += 3) rib.push([x, -322]);
  setHelix(makeHelix(mdl.ribbon, .75), rib, 10, 44);
  mdl.letters = SEQ.split('').map((b, i) => txt(A, b, { class: 'mono', x: x0 + i * cw + cw / 2, y: -280, 'text-anchor': 'middle', 'font-size': 19, fill: BCOL[b], opacity: 0 }));
  mdl.rowLab = BASES.split('').map((b, r) => txt(A, b, { class: 'mono', x: x0 - 13, y: gy + r * cw + 15, 'text-anchor': 'middle', 'font-size': 14, fill: INK, opacity: 0 }));
  mdl.cols = SEQ.split('').map((b, i) => {
    const col = el('g', { opacity: 0 }, A);
    BASES.split('').forEach((bb, r) => {
      const on = bb === b;
      el('rect', { x: x0 + i * cw + 1.5, y: gy + r * cw + 1.5, width: cw - 3, height: cw - 3, rx: 4, fill: on ? BCOL[b] : PAPER, 'fill-opacity': on ? .9 : .5, stroke: INK, 'stroke-width': on ? 1.3 : .5, 'stroke-opacity': on ? 1 : .4 }, col);
      if (on) txt(col, '1', { class: 'mono', x: x0 + i * cw + cw / 2, y: gy + r * cw + 15.5, 'text-anchor': 'middle', 'font-size': 12, fill: INK });
    });
    return col;
  });
  mdl.win = el('g', { opacity: 0 }, A);
  el('rect', { x: x0 - 3, y: gy - 5, width: 6 * cw + 6, height: 4 * cw + 10, rx: 9, fill: 'none', stroke: RED, 'stroke-width': 3 }, mdl.win);
  txt(mdl.win, 'filter', { class: 'script', x: x0 + 3 * cw, y: gy - 10, 'text-anchor': 'middle', 'font-size': 17, fill: RED });
  const target = 'ACGTGG', base = -64;
  mdl.bars = [];
  for (let j = 0; j <= 24 - 6; j++) {
    let m = 0; for (let q = 0; q < 6; q++) m += SEQ[j + q] === target[q];
    const h = Math.pow(m / 6, 3) * 54 + 3;
    mdl.bars.push(el('rect', { x: x0 + (j + 2.5) * cw + 3, y: base - h, width: cw - 6, height: h, rx: 2, fill: m === 6 ? RED : '#c9a67a', stroke: INK, 'stroke-width': .8, opacity: 0 }, A));
  }
  mdl.track = el('path', { d: `M${x0} ${base} H${x0 + 24 * cw}`, class: 'ink t', pathLength: 1 }, A);
  mdl.trackLab = txt(A, 'filter response', { class: 'script', x: x0, y: base + 20, 'font-size': 16, fill: INK, opacity: 0 });
  mdl.logo = el('g', { opacity: 0 }, A);
  [['A', 1], ['C', 1], ['G', 1], ['T', 1], ['G', 1], ['G', .55]].forEach(([b, h], i) => {
    const x = -132 + 11 + i * 22;
    const t = txt(mdl.logo, b, { class: 'mono', x, y: 0, 'font-size': 30, fill: BCOL[b], 'text-anchor': 'middle' });
    t.setAttribute('transform', `translate(0 -8) translate(${x} 0) scale(1 ${h}) translate(${-x} 0)`);
  });
  txt(mdl.logo, 'learned pattern', { class: 'script', x: 40, y: -12, 'font-size': 17, fill: RED });

  const C = mdl.C;
  mdl.strips = [];
  for (let i = 0; i < 13; i++) { const s = el('g', { opacity: 0 }, C); for (let q = 0; q < 22; q++) { const b = BASES[Math.floor(rand() * 4)]; el('rect', { x: -292 + q * 6, y: 74 + i * 13, width: 5, height: 8, fill: BCOL[b], 'fill-opacity': .85 }, s); } mdl.strips.push(s); }
  mdl.dataLab = txt(C, 'training examples', { class: 'script', x: -226, y: 58, 'text-anchor': 'middle', 'font-size': 17, fill: INK, opacity: 0 });
  const layers = [[-100, 5], [0, 6], [95, 4], [178, 1]];
  const nodes = layers.map(([x, n]) => Array.from({ length: n }, (_, i) => [x, 156 + (i - (n - 1) / 2) * 34]));
  mdl.edges = []; let ed = '';
  for (let l = 0; l < nodes.length - 1; l++) nodes[l].forEach(a => nodes[l + 1].forEach(b => { mdl.edges.push([a, b]); ed += `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`; }));
  mdl.edgePath = el('path', { d: ed, class: 'ink t', pathLength: 1, style: 'stroke-opacity:.45' }, C);
  mdl.arrowIn = el('path', { d: 'M-150 156 L-122 156 M-131 149 L-122 156 L-131 163', class: 'ink', pathLength: 1 }, C);
  mdl.nodes = nodes.flat().map(([x, y], i, arr) => el('circle', { cx: x, cy: y, r: i === arr.length - 1 ? 14 : 10, fill: PAPER, stroke: INK, 'stroke-width': 1.6, opacity: 0 }, C));
  mdl.pulses = Array.from({ length: 16 }, () => ({ e: mdl.edges[Math.floor(rand() * mdl.edges.length)], o: rand(), el: el('circle', { r: 3.5, fill: RED, opacity: 0 }, C) }));
  mdl.gauge = el('g', { opacity: 0 }, C);
  el('path', { d: 'M226 236 L226 96 Q226 84 238 84 Q250 84 250 96 L250 236 Q250 250 238 250 Q226 250 226 236Z', fill: PAPER, stroke: INK, 'stroke-width': 1.6 }, mdl.gauge);
  mdl.fill = el('rect', { x: 230, y: 246, width: 16, height: 0, rx: 5, fill: RED, 'fill-opacity': .85 }, mdl.gauge);
  txt(mdl.gauge, 'predicted', { class: 'script', x: 238, y: 54, 'text-anchor': 'middle', 'font-size': 17, fill: INK });
  txt(mdl.gauge, 'expression', { class: 'script', x: 238, y: 72, 'text-anchor': 'middle', 'font-size': 17, fill: INK });
  el('path', { d: 'M193 156 L222 156', class: 'ink' }, mdl.gauge);

  const D = mdl.D, ox = -220, oy = 230;
  mdl.checkInks = [
    el('path', { d: `M${ox} ${oy} L${ox} -170 M${ox - 8} -158 L${ox} -172 L${ox + 8} -158`, class: 'ink', pathLength: 1 }, D),
    el('path', { d: `M${ox} ${oy} L240 ${oy} M228 ${oy - 8} L242 ${oy} L228 ${oy + 8}`, class: 'ink', pathLength: 1 }, D),
  ];
  el('path', { d: `M${ox + 10} ${oy - 10} L220 -150`, class: 'ink t r', 'stroke-dasharray': '6 7' }, D);
  txt(D, 'predicted expression', { class: 'script', x: 10, y: oy + 34, 'text-anchor': 'middle', 'font-size': 21, fill: INK });
  txt(D, 'measured expression', { class: 'script', x: ox - 16, y: 30, 'text-anchor': 'middle', 'font-size': 21, fill: INK, transform: `rotate(-90 ${ox - 16} 30)` });
  mdl.cdots = [];
  for (let i = 0; i < 46; i++) { const t = rand(), x = ox + 20 + t * 420, y = oy - 20 - t * 360 + gauss() * 16; mdl.cdots.push(el('circle', { cx: f(x), cy: f(y), r: 5, fill: SAGE, stroke: INK, 'stroke-width': 1, opacity: 0 }, D)); }
  const outl = [[-120, -40], [-60, -10], [120, 170], [60, 190]];
  outl.forEach(([x, y]) => mdl.cdots.push(el('circle', { cx: x, cy: y, r: 5.5, fill: PLUM, stroke: INK, 'stroke-width': 1, opacity: 0 }, D)));
  mdl.rings = outl.map(([x, y]) => el('path', { d: sketchEll(x, y, 15, 14), class: 'ink r', pathLength: 1 }, D));
  mdl.hmm = txt(D, 'hmm.', { class: 'script', x: -98, y: -60, 'font-size': 26, fill: RED, opacity: 0 });
  mdl.hmm2 = txt(D, 'shortcut, or new biology?', { class: 'script', x: 150, y: 222, 'text-anchor': 'middle', 'font-size': 19, fill: RED, opacity: 0 });
  mdl.tube = el('g', { opacity: 0, transform: 'translate(10 -262) rotate(12)' }, g);
  el('path', { d: 'M-16 -70 L-16 40 Q-16 64 0 64 Q16 64 16 40 L16 -70', fill: PAPER, 'fill-opacity': .7, stroke: INK, 'stroke-width': 1.8 }, mdl.tube);
  el('path', { d: 'M-15 10 L15 10 L15 40 Q15 62 0 62 Q-15 62 -15 40Z', fill: '#cfe0b4', 'fill-opacity': .9 }, mdl.tube);
  el('path', { d: 'M0 10 Q-2 -14 2 -30 M2 -22 Q-12 -30 -12 -40 Q0 -38 2 -24 M2 -26 Q14 -36 12 -44 Q2 -42 2 -28', fill: LEAF, stroke: INK, 'stroke-width': 1.4 }, mdl.tube);
  el('path', { d: 'M-22 -70 L22 -70', stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, mdl.tube);
  txt(mdl.tube, 'test it', { class: 'script', x: 34, y: -2, 'font-size': 22, fill: RED, transform: 'rotate(-12)' });
}
function renderModel() {
  mdl.win.setAttribute('transform', `translate(${f(MS.win * 22)} 0)`);
  mdl.bars.forEach((b, j) => b.setAttribute('opacity', MS.scan >= j - .2 && MS.scan > 0 ? 1 : 0));
  mdl.pulses.forEach(p => { const t = (MS.pulse * 3 + p.o) % 1, [a, b] = p.e; p.el.setAttribute('cx', f(lerp(a[0], b[0], t))); p.el.setAttribute('cy', f(lerp(a[1], b[1], t))); p.el.setAttribute('opacity', MS.pulse > 0 && MS.pulse < 1 ? .9 : 0); });
  mdl.fill.setAttribute('height', f(156 * MS.out)); mdl.fill.setAttribute('y', f(246 - 156 * MS.out));
}

/* ---------- bridge captions: handwritten notes that carry the in-between moments ---------- */
const CAP = $('caps');
function cap(text, at, target, anchor = 'start') {
  const g = el('g', { opacity: 0 }, CAP);
  txt(g, text, { class: 'script', x: at[0], y: at[1], 'text-anchor': anchor, 'font-size': 23, fill: '#8e3f24', stroke: '#efe2da', 'stroke-width': 6, 'stroke-linejoin': 'round', 'paint-order': 'stroke' });
  const w = text.length * 9.8, x0 = anchor === 'end' ? at[0] - w : anchor === 'middle' ? at[0] - w / 2 : at[0], x1 = x0 + w;
  const sx = target[0] > x1 ? x1 + 4 : target[0] < x0 ? x0 - 4 : (x0 + x1) / 2, sy = target[1] > at[1] ? at[1] + 7 : at[1] - 20;
  el('path', { d: `M${sx} ${sy} Q${f((sx + target[0]) / 2 + 12)} ${f((sy + target[1]) / 2 - 14)} ${f(target[0])} ${f(target[1])}`, fill: 'none', stroke: '#8e3f24', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, g);
  el('circle', { cx: f(target[0]), cy: f(target[1]), r: 3.2, fill: '#8e3f24', stroke: '#efe2da', 'stroke-width': 1.5 }, g);
  return g;
}
const mitoCell = LC.cells.reduce((b, c) => Math.hypot(c.seed[0] + 180, c.seed[1] - 170) < Math.hypot(b.seed[0] + 180, b.seed[1] - 170) ? c : b);
const mitoCap = mitoCell.mito[0];
const chlCell = LC.cells.reduce((b, c) => Math.hypot(c.seed[0] + 210, c.seed[1] + 140) < Math.hypot(b.seed[0] + 210, b.seed[1] + 140) ? c : b);
const chlCap = chlCell.chl.reduce((b, q) => q[1] < b[1] ? q : b);
const L0screen = (p, c) => [(p[0] - c.fx) * c.s, (p[1] - c.fy) * c.s];
const stressedPlant = fieldPlants.find(p => p.t === 0.22 && p.j === 4);
stressedPlant.stressed = true; stressedPlant.washes.forEach(w => w.setAttribute('fill', OCHRE));
const TXCAM = { s: .8, fx: 90, fy: -70 };
const CAPS = [
  [cap('drought-stressed leaves', [112, -112], [stressedPlant.c[0] + 7, stressedPlant.c[1] - 6], 'end'), .05, .6],
  [cap('stomata close to save water', [120, -230], [150, -110]), 1.02, 1.55],
  [cap('roots grow deeper', [120, 300], [80, 368]), 1.08, 1.55],
  [cap('veins carry water from the roots', [-60, -250], leafSh.mid(.3)), 1.76, 2.0],
  [cap('aphids, each about 2 mm long', [-340, 250], [aphidPos[0] - 48, aphidPos[1] + 30]), 1.76, 2.0],
  [cap('mesophyll cell', [capCell.seed[0], capCell.seed[1] - 118], capCell.seed, 'middle'), 2.3, 2.66],
  [cap('chloroplasts', [chlCap[0] - 10, chlCap[1] - 92], chlCap, 'middle'), 2.34, 2.66],
  [cap('nucleus', [NUC_ANCHOR[0] - 40, NUC_ANCHOR[1] + 128], [NUC_ANCHOR[0] - 6, NUC_ANCHOR[1] + 22], 'middle'), 2.38, 2.66],
  [cap('mitochondria', [mitoCap[0], mitoCap[1] + 96], [mitoCap[0], mitoCap[1] + 8], 'middle'), 2.42, 2.66],
  [cap('chromatin', [-20, 360], LN.capChromatin), 3.02, 3.42],
  [cap('nucleolus', [-300, -220], LN.nucleolus), 3.06, 3.42],
  [cap('nucleosomes', [-320, -150], [FIBRE[1][0], FIBRE[1][1] - 26]), 3.74, 4.02],
  [cap('linker DNA', [140, 230], [160, 55]), 3.78, 4.02],
  [cap('histone core: eight proteins', [-360, -150], [-160, -40]), 4.32, 4.8],
  [cap('DNA, about 2 nm across', [120, -120], [300, 34]), 4.36, 4.8],
  [cap('DNA pattern, now exposed', [-340, -110], [-87, 34]), 5.42, 5.8],
  [cap('ABA', [300, -330], [190, -230], 'end'), 6.0, 6.8],
  [cap('ABF dimer', [-330, -260], [-104, -118]), 6.5, 6.8],
  [cap('ABRE', [40, 190], [-80, 52]), 6.55, 6.8],
  [cap('Mediator', [-150, -250], L0screen([-50, -175], TXCAM), 'middle'), 7.05, 7.82],
  [cap('RNA polymerase II', [40, 260], L0screen([300, 60], TXCAM)), 7.2, 7.82],
  [cap('mRNA', [-200, -250], L0screen([190, -96], TXCAM)), 7.5, 7.82],
  [cap('ribosome', [-330, -330], L0screen([-80, -280], TXCAM)), 8.15, 8.6],
  [cap('folding protein', [150, 120], L0screen([230, -100], TXCAM)), 8.62, 8.86],
];

/* ---------- initial state ---------- */
const dash = els => gsap.set(els, { strokeDasharray: '1 2', strokeDashoffset: 1.01 });
LV.forEach(L => { dash(L.inks); gsap.set(L.washes, { opacity: 0 }); });
dash([LF.growCrack, mdl.track, mdl.edgePath, mdl.arrowIn, ...mdl.checkInks, ...mdl.rings]);
LC.cells.forEach(c => gsap.set(c.g, { scale: 0.05, opacity: 0, svgOrigin: `${f(c.seed[0])} ${f(c.seed[1])}` }));
gsap.set(plantBug.g, { opacity: 0 });
renderMol(); renderModel(); renderZoom();
placeOnPath(plantBug, plantBugPath, 0);

/* ---------- the field draws itself when it first comes into view ---------- */
const fieldIntro = gsap.timeline({ paused: true });
fieldIntro.to(LF.inks, { strokeDashoffset: 0, duration: .9, stagger: { amount: 1.6 }, ease: 'power1.inOut' })
          .to(LF.washes, { opacity: 1, duration: .5, stagger: { amount: 1.2 } }, .6);
ScrollTrigger.create({ trigger: '#story', start: 'top 75%', once: true, onEnter: () => reduceMotion ? fieldIntro.progress(1) : fieldIntro.play() });

/* ---------- ambient life: breeze, sun, ants ---------- */
if (!reduceMotion) {
  fieldPlants.forEach(p => gsap.fromTo(p.g, { rotation: -1.6, svgOrigin: `${f(p.base[0])} ${f(p.base[1])}` }, { rotation: 1.6, svgOrigin: `${f(p.base[0])} ${f(p.base[1])}`, duration: 2.2 + rand() * 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: -rand() * 3 }));
  plantLeafGroups.forEach((g, i) => gsap.fromTo(g, { rotation: -2.5, svgOrigin: `${g.node[0]} ${g.node[1]}` }, { rotation: 2.5, svgOrigin: `${g.node[0]} ${g.node[1]}`, duration: 2.6 + i * .35, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: -i }));
  gsap.to(LF.rays, { rotation: 360, svgOrigin: '190 -268', duration: 90, repeat: -1, ease: 'none' });
  gsap.fromTo(LF.rays.children, { opacity: .35 }, { opacity: 1, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: .18, repeat: -1, yoyo: true } });
  gsap.timeline({ repeat: -1, repeatDelay: 1.5 })
    .fromTo(LF.growCrack, { strokeDashoffset: 1.01, opacity: 1 }, { strokeDashoffset: 0, duration: 3.5, ease: 'power1.inOut' })
    .to(LF.growCrack, { opacity: 0, duration: 1.2 }, '+=4');
  const A = { t: 0 }, antLen = LF.antPath.getTotalLength();
  gsap.to(A, { t: 1, duration: 34, repeat: -1, ease: 'none', onUpdate: () => LF.ants.forEach((a, i) => { a.ang = null; placeOnPath(a, LF.antPath, (A.t + i * .065) % 1, antLen); }) });
} else { LF.ants.forEach((a, i) => placeOnPath(a, LF.antPath, .3 + i * .04)); gsap.set(LF.growCrack, { strokeDashoffset: 0 }); }

/* =====================================================================
   SCROLL TIMELINE: 1 unit per step of text. Each step holds its scene, then moves on.
   ===================================================================== */
const N_STEPS = 13;
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => updateCrumbs() });
const zoomTo = (v, at, dur) => tl.to(Z, { v, duration: dur, ease: 'sine.inOut', onUpdate: renderZoom }, at);
const sketch = (L, at, dur) => { tl.to(L.inks, { strokeDashoffset: 0, duration: dur * .6, stagger: { amount: dur * .4 } }, at); tl.to(L.washes, { opacity: 1, duration: dur * .4, stagger: { amount: dur * .4 } }, at + dur * .3); };
const molTo = (props, at, dur, ease = 'sine.inOut') => tl.to(M, { ...props, duration: dur, ease, onUpdate: renderMol }, at);
const modTo = (props, at, dur, ease = 'none') => tl.to(MS, { ...props, duration: dur, ease, onUpdate: renderModel }, at);

const texts = [...document.querySelectorAll('.st')];
gsap.set(texts.slice(1), { autoAlpha: 0 });
texts.forEach((t, i) => {
  if (i) tl.fromTo(t, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .12, immediateRender: false }, i - .22);
  if (i < N_STEPS - 1) tl.to(t, { autoAlpha: 0, y: -14, duration: .1 }, i + .78);
});
CAPS.forEach(([g, a, b]) => { tl.to(g, { opacity: 1, duration: .06 }, a); tl.to(g, { opacity: 0, duration: .06 }, b - .06); });

// 0 field, then into one plant
zoomTo(5, .55, .45); sketch(LP, .55, .45);
// 1 plant: the ladybird climbs; then plant -> leaf
tl.to(plantBug.g, { opacity: 1, duration: .04 }, .95);
tl.to({ t: 0 }, { t: 1, duration: .55, ease: 'sine.inOut', onUpdate: function () { placeOnPath(plantBug, plantBugPath, this.targets()[0].t); } }, .95);
zoomTo(4, 1.5, .3); sketch(LL, 1.5, .3);
// 2 leaf (a pause with captions) -> cells growing into each other
zoomTo(3, 1.98, .32);
tl.to(LC.washes, { opacity: 1, duration: .1 }, 2.0);
LC.cells.forEach(c => tl.to(c.g, { scale: 1, opacity: 1, svgOrigin: `${f(c.seed[0])} ${f(c.seed[1])}`, duration: .16, ease: 'back.out(1.5)' }, 2.04 + Math.min(1, c.d / 620) * .34));
// 3 nucleus, then chromatin (beads on a string)
zoomTo(2, 2.62, .38); sketch(LN, 2.62, .36);
zoomTo(1, 3.38, .36);
// 4 into one nucleosome
zoomTo(0, 4.0, .3);
// 5 opening up
molTo({ u: 1 }, 4.86, .52); molTo({ motif: 1 }, 5.3, .14);
// 6 ABA arrives; an ABF finds the motif
molTo({ aba: 1 }, 5.82, .5, 'none'); molTo({ tf: 1 }, 6.05, .55, 'power2.out');
// 7 pull back a little; RNA polymerase II transcribes
tl.to(L0C, { s: TXCAM.s, fx: TXCAM.fx, fy: TXCAM.fy, duration: .26, ease: 'sine.inOut', onUpdate: renderZoom }, 6.78);
molTo({ polIn: 1 }, 6.92, .28, 'power2.out'); molTo({ polX: 330 }, 7.2, .5, 'none');
// 8 export and translation, then folding
molTo({ detach: 1 }, 7.84, .2); molTo({ ribo: 1 }, 8.05, .45, 'none'); molTo({ fold: 1 }, 8.5, .2);
// 9 DNA as data: sequence -> one-hot matrix -> a filter scanning slowly
tl.to(L0.g, { opacity: 0, duration: .1 }, 8.84);
tl.to('#scalebar', { opacity: 0, duration: .08 }, 8.84);
tl.to(MOD, { opacity: 1, duration: .08 }, 8.88);
tl.from(mdl.ribbon, { scaleX: .2, opacity: 0, svgOrigin: '0 -322', duration: .14, immediateRender: false }, 8.9);
tl.to(mdl.letters, { opacity: 1, duration: .02, stagger: .006 }, 8.98);
tl.to(mdl.rowLab, { opacity: 1, duration: .05 }, 9.1);
tl.to(mdl.cols, { opacity: 1, duration: .03, stagger: .008 }, 9.1);
tl.to(mdl.win, { opacity: 1, duration: .03 }, 9.32);
tl.to(mdl.track, { strokeDashoffset: 0, duration: .08 }, 9.3);
tl.to(mdl.trackLab, { opacity: 1, duration: .05 }, 9.32);
modTo({ win: 18, scan: 18 }, 9.36, .46);
modTo({ win: 6 }, 9.82, .08, 'sine.inOut');
tl.to(mdl.logo, { opacity: 1, duration: .06 }, 9.88);
// 10 training data feeds the network
tl.to(mdl.A, { y: 0, duration: .14, ease: 'sine.inOut' }, 9.96);
tl.to(mdl.strips, { opacity: 1, duration: .03, stagger: .015 }, 10.0);
tl.from(mdl.strips, { x: -90, duration: .16, stagger: .015, immediateRender: false }, 10.0);
tl.to(mdl.dataLab, { opacity: 1, duration: .05 }, 10.02);
tl.to([mdl.edgePath, mdl.arrowIn], { strokeDashoffset: 0, duration: .2 }, 10.1);
tl.to(mdl.nodes, { opacity: 1, duration: .03, stagger: .008 }, 10.15);
modTo({ pulse: 1 }, 10.28, .5);
tl.to(mdl.gauge, { opacity: 1, duration: .05 }, 10.42);
modTo({ out: .86 }, 10.48, .3, 'power2.out');
// 11 the careful part: the network clears away completely; the test tube arrives with the text
tl.to([mdl.A, mdl.C], { opacity: 0, duration: .1 }, 10.8);
tl.to(mdl.tube, { opacity: 1, duration: .08 }, 10.86);
tl.from(mdl.tube, { y: -50, rotation: 30, duration: .14, ease: 'back.out(2)', immediateRender: false }, 10.86);
tl.to(mdl.D, { opacity: 1, duration: .05 }, 10.9);
tl.to(mdl.checkInks, { strokeDashoffset: 0, duration: .14 }, 10.92);
tl.to(mdl.cdots, { opacity: 1, duration: .02, stagger: .004 }, 11.04);
tl.to(mdl.rings, { strokeDashoffset: 0, duration: .08, stagger: .04 }, 11.32);
tl.to([mdl.hmm, mdl.hmm2], { opacity: 1, duration: .05 }, 11.48);
// 12 slowly back out to the field, which now copes better
tl.to(MOD, { opacity: 0, duration: .1 }, 11.86);
tl.to(L0C, { s: 1, fx: 0, fy: 0, duration: .01 }, 11.9);
tl.to(L0.g, { opacity: 1, duration: .1, onUpdate: renderZoom }, 11.94);
tl.to('#scalebar', { opacity: 1, duration: .1 }, 11.94);
zoomTo(6, 12.02, .76);
tl.to(fieldPlants.flatMap(p => p.washes), { fill: LEAF, duration: .1, stagger: { amount: .08 } }, 12.72);
tl.to(LF.sunWash, { fill: PEACH, duration: .1 }, 12.72);
tl.to([...LF.cracks, LF.crackG], { opacity: .25, duration: .1 }, 12.72);
fieldPlants.filter(p => p.flower).forEach((p, i) => tl.fromTo(p.flower, { opacity: 0, scale: 0, svgOrigin: `${f(p.top[0])} ${f(p.top[1])}` }, { opacity: 1, scale: 1, svgOrigin: `${f(p.top[0])} ${f(p.top[1])}`, duration: .06, ease: 'back.out(3)', immediateRender: false }, 12.8 + (i % 9) * .01));
tl.to({}, { duration: .01 }, N_STEPS - .01);

ScrollTrigger.create({ animation: tl, trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 0.6 });

// "where am I" trail
const CRUMBS = ['field', 'plant', 'leaf', 'cell', 'nucleus', 'chromatin', 'gene', 'model'];
const crumbEls = [];
const CRUMB_T = [0, 1, 1.88, 2.45, 3.18, 3.88, 4.5, 9.4];
const storyY = t => { const s = $('story'); return s.offsetTop + (t / N_STEPS) * (s.offsetHeight - innerHeight); };
CRUMBS.forEach((c, i) => {
  if (i) { const sep = document.createElement('i'); sep.textContent = '›'; sep.setAttribute('aria-hidden', 'true'); $('crumbs').appendChild(sep); }
  const b = document.createElement('button'); b.textContent = c; b.setAttribute('aria-label', `Jump to ${c}`);
  b.addEventListener('click', () => window.scrollTo({ top: storyY(CRUMB_T[i]), behavior: reduceMotion ? 'auto' : 'smooth' }));
  $('crumbs').appendChild(b); crumbEls.push(b);
});
function updateCrumbs() {
  const t = tl.time(), inModel = t > 8.86 && t < 11.94;
  const cur = inModel ? 7 : Math.round(6 - Z.v);
  crumbEls.forEach((s, i) => { s.classList.toggle('on', i === cur); s.classList.toggle('seen', i < cur || (t > 11.94 && i < 7)); });
}
updateCrumbs();

/* =====================================================================
   ABOUT: a caterpillar on a vine, and a portrait with a visitor
   ===================================================================== */
{
  const c = $('crawl');
  const vine = el('path', { d: 'M0 52 C120 36 220 64 360 50 C500 36 620 66 760 52 C900 38 1040 62 1200 48', class: 'ink t', pathLength: 1 }, c);
  const vlen = vine.getTotalLength();
  const leafs = [70, 180, 300, 430, 560, 700, 830, 980, 1110].map((x, i) => {
    const p = vine.getPointAtLength(vlen * x / 1200), sh = leafShape([p.x, p.y], i % 2 ? -1.1 : -2.1, 30 + (i % 3) * 6, 11);
    const g = el('g', {}, c); el('path', { d: sh.outline, fill: LEAF, 'fill-opacity': .6, stroke: INK, 'stroke-width': 1.2 }, g); g.base = [p.x, p.y]; return g;
  });
  const cat = el('g', {}, c);
  const segs = Array.from({ length: 7 }, (_, i) => el('circle', { r: i === 6 ? 8 : 6.5, fill: i === 6 ? '#8fae6a' : (i % 2 ? '#a9c27a' : '#9fb371'), stroke: INK, 'stroke-width': 1.3 }, cat));
  const eye = el('circle', { r: 1.6, fill: INK }, cat);
  const S = { t: 0 };
  const placeCat = () => segs.forEach((s, i) => {
    const d = ((S.t * vlen) + i * 11) % vlen, p = vine.getPointAtLength(d), hump = Math.max(0, Math.sin(S.t * 90 - i * .9)) * 6;
    s.setAttribute('cx', f(p.x)); s.setAttribute('cy', f(p.y - 7 - hump));
    if (i === 6) { eye.setAttribute('cx', f(p.x + 3)); eye.setAttribute('cy', f(p.y - 10 - hump)); }
  });
  placeCat();
  gsap.set(vine, { strokeDasharray: '1 2', strokeDashoffset: 1.01 });
  ScrollTrigger.create({ trigger: c, start: 'top 90%', once: true, onEnter: () => {
    gsap.to(vine, { strokeDashoffset: 0, duration: 1.4 });
    if (!reduceMotion) {
      gsap.to(S, { t: 1, duration: 70, repeat: -1, ease: 'none', onUpdate: placeCat });
      leafs.forEach((g, i) => gsap.fromTo(g, { rotation: -6, svgOrigin: `${f(g.base[0])} ${f(g.base[1])}` }, { rotation: 6, svgOrigin: `${f(g.base[0])} ${f(g.base[1])}`, duration: 1.8 + (i % 4) * .3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: -i * .4 }));
    }
  } });

  const s = $('portrait');
  const bd = smooth(ellPts(0, 0, 190, 205, .1, 0, Math.PI * 2, 12, .05, true), true);
  const cp = el('clipPath', { id: 'portraitClip' }, el('defs', {}, s)); el('path', { d: bd }, cp);
  el('path', { d: bd, fill: LEAF, 'fill-opacity': .5, transform: 'translate(12 10)' }, s);
  el('image', { href: 'images/profile3.jpg', x: -330, y: -230, width: 640, height: 626, 'clip-path': 'url(#portraitClip)', preserveAspectRatio: 'xMidYMid slice' }, s);
  el('path', { d: bd, fill: 'none', stroke: INK, 'stroke-width': 2 }, s);
  const vp = [[-210, 170], [-150, 210], [-60, 226], [40, 220], [130, 196], [190, 140], [214, 70]];
  const pv = el('path', { d: smooth(vp), class: 'ink', pathLength: 1 }, s);
  const pleaves = [[-120, 214, -2.6], [10, 222, 1.8], [150, 184, -0.8], [205, 100, -1.6]].map(([x, y, a]) => { const g = el('g', {}, s); el('path', { d: leafShape([x, y], a, 46, 17).outline, fill: LEAF, 'fill-opacity': .7, stroke: INK, 'stroke-width': 1.3 }, g); g.base = [x, y]; return g; });
  const tend = el('path', { d: smooth([[214, 70], [226, 40], [240, 30], [250, 40], [244, 52], [234, 46]]), class: 'ink r', pathLength: 1 }, s);
  const bugPath = el('path', { d: smooth(vp), fill: 'none' }, s);
  const lb = ladybird(s, 1.1);
  gsap.set([pv, tend], { strokeDasharray: '1 2', strokeDashoffset: 1.01 });
  gsap.set(pleaves, { opacity: 0 }); gsap.set(lb.g, { opacity: 0 });
  const B = { t: 0 }, bl = bugPath.getTotalLength(), moveB = () => placeOnPath(lb, bugPath, B.t, bl);
  placeOnPath(lb, bugPath, 0, bl);
  const at = gsap.timeline({ paused: true });
  at.to(pv, { strokeDashoffset: 0, duration: 1.2 }).to(pleaves, { opacity: 1, duration: .3, stagger: .15 }, '<.4').to(tend, { strokeDashoffset: 0, duration: .5 }, '>')
    .to(lb.g, { opacity: 1, duration: .2 }, '<').to(B, { t: .45, duration: 3, ease: 'sine.inOut', onUpdate: moveB }, '<').to(B, { t: .82, duration: 2.6, ease: 'sine.inOut', onUpdate: moveB }, '>.8');
  ScrollTrigger.create({ trigger: s, start: 'top 75%', once: true, onEnter: () => {
    if (reduceMotion) { at.progress(1); return; }
    at.play();
    pleaves.forEach((g, i) => gsap.fromTo(g, { rotation: -5, svgOrigin: `${g.base[0]} ${g.base[1]}` }, { rotation: 5, svgOrigin: `${g.base[0]} ${g.base[1]}`, duration: 2 + i * .3, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  } });
}

ScrollTrigger.create({ trigger: '#about', start: 'top 80%', onEnter: () => $('toTop').classList.add('show'), onLeaveBack: () => $('toTop').classList.remove('show') });
$('toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
