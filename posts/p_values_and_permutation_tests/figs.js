/* Interactive figures for "p-values, null distributions, and permutation tests".
   Plain SVG and DOM, no libraries. Each figure fills a <div class="viz" id="..."> in index.qmd.
   Under node the pure functions are exported instead, for _check.js. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const COL = { nul: '#052b67', obs: '#671436', grey: '#bdbdbd', ink: '#323619' };
  const BASE = { A: '#538a8b', C: '#052b67', G: '#9e757f', T: '#671436' };

  // ---------- maths ----------
  // seeded PRNG (mulberry32), so the toy network is the same for every reader
  function mulberry32(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // complementary error function, fractional error < 1.2e-7 everywhere (Numerical Recipes erfcc)
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const normUpper = z => 0.5 * erfc(z / Math.SQRT2); // P(Z >= z)
  const gauss = rand => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

  function sample(n, k, rand) { // k distinct indices from 0..n-1 (partial Fisher-Yates)
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < k; i++) { const j = i + Math.floor(rand() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, k);
  }
  function shuffle(a, rand) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // toy co-expression network: 60 genes, two planted 10-gene sets with extra internal edges
  function makeNetwork(seed) {
    const rand = mulberry32(seed), N = 60, K = 10;
    const nodes = [];
    for (let tries = 0; nodes.length < N && tries < 1e5; tries++) {
      const p = { x: 34 + rand() * 612, y: 22 + rand() * 196 };
      if (nodes.every(q => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 > 31 ** 2)) nodes.push(p);
    }
    const order = sample(N, 2 * K, rand), tight = order.slice(0, K), loose = order.slice(K);
    const group = new Array(N).fill(0);
    tight.forEach(i => (group[i] = 1)); loose.forEach(i => (group[i] = 2));
    const adj = nodes.map(() => new Array(N).fill(false)), edges = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const p = group[i] === group[j] && group[i] === 1 ? 0.3 : group[i] === group[j] && group[i] === 2 ? 0.19 : 0.08;
      if (rand() < p) { adj[i][j] = adj[j][i] = true; edges.push([i, j]); }
    }
    return { nodes, adj, edges, tight, loose, N, K };
  }
  function linksWithin(set, adj) {
    let c = 0;
    for (let a = 0; a < set.length; a++) for (let b = a + 1; b < set.length; b++) if (adj[set[a]][set[b]]) c++;
    return c;
  }

  // dinucleotide-preserving shuffle (Altschul & Erickson 1985, via a random Eulerian walk)
  function dinucShuffle(s, rand) {
    const n = s.length, last = s[n - 1], out = {};
    for (let i = 0; i < n - 1; i++) (out[s[i]] = out[s[i]] || []).push(s[i + 1]);
    const verts = Object.keys(out);
    let lastEdge;
    for (;;) { // each vertex's final exit must lead, via other final exits, to the last base
      lastEdge = {};
      verts.forEach(v => { if (v !== last) lastEdge[v] = Math.floor(rand() * out[v].length); });
      const ok = verts.every(v => { let u = v; for (let k = 0; k < 5 && u !== last; k++) u = out[u][lastEdge[u]]; return u === last; });
      if (ok) break;
    }
    const queue = {}, pos = {};
    verts.forEach(v => {
      const es = out[v].slice();
      const fin = v !== last ? es.splice(lastEdge[v], 1) : [];
      queue[v] = shuffle(es, rand).concat(fin); pos[v] = 0;
    });
    let u = s[0], r = u;
    for (let i = 1; i < n; i++) { u = queue[u][pos[u]++]; r += u; }
    return r;
  }

  function fmtP(p) {
    p = +p.toPrecision(2);
    if (p >= 0.001) return String(p);
    let e = Math.floor(Math.log10(p)), m = +(p / 10 ** e).toFixed(1);
    if (m >= 10) { m = 1; e++; }
    return `${m} × 10<sup>${e}</sup>`;
  }
  const fmtN = n => Math.round(n).toLocaleString('en-GB');

  if (typeof document === 'undefined') {
    module.exports = { erfc, normUpper, mulberry32, makeNetwork, linksWithin, dinucShuffle, fmtP };
    return;
  }

  // ---------- DOM helpers ----------
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const htmlEl = (tag, attrs, parent, html) => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  const scale = (d0, d1, r0, r1) => {
    const f = v => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
    f.invert = p => d0 + ((p - r0) / (r1 - r0)) * (d1 - d0);
    return f;
  };
  function tween(ms, fn) {
    if (REDUCED) return fn(1);
    const t0 = performance.now();
    const step = now => {
      const t = Math.max(0, Math.min(1, (now - t0) / ms)); // rAF time can precede t0
      fn(1 - (1 - t) ** 3);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // figure body goes before the caption (.viz-note) if there is one
  function mount(root) {
    const body = htmlEl('div', { class: 'viz-body' });
    root.insertBefore(body, root.querySelector('.viz-note'));
    return body;
  }
  const row = parent => htmlEl('div', { class: 'viz-controls' }, parent);
  function button(parent, text, onClick) {
    const b = htmlEl('button', { type: 'button' }, parent, text);
    b.addEventListener('click', onClick);
    return b;
  }
  function toggle(parent, label, options, initial, onChange) {
    const g = htmlEl('div', { class: 'viz-toggle', role: 'group', 'aria-label': label }, parent);
    htmlEl('span', { class: 'viz-label' }, g, label);
    const btns = options.map(([value, text]) => {
      const b = button(g, text, () => { btns.forEach(x => x.setAttribute('aria-pressed', x === b)); onChange(value); });
      b.setAttribute('aria-pressed', value === initial);
      return b;
    });
  }
  function slider(parent, label, min, max, step, value, onInput) {
    const l = htmlEl('label', { class: 'viz-slider' }, parent);
    const span = htmlEl('span', { class: 'viz-label' }, l, label);
    const input = htmlEl('input', { type: 'range', min, max, step, value }, l);
    input.addEventListener('input', () => onInput(+input.value, span));
    onInput(+value, span);
    return input;
  }
  function xAxis(svg, x, y0, ticks, fmt, label) {
    const g = svgEl('g', { class: 'axis' }, svg);
    svgEl('line', { x1: x(ticks[0]), x2: x(ticks[ticks.length - 1]), y1: y0, y2: y0 }, g);
    ticks.forEach(t => {
      svgEl('line', { x1: x(t), x2: x(t), y1: y0, y2: y0 + 4 }, g);
      svgEl('text', { x: x(t), y: y0 + 18, 'text-anchor': 'middle' }, g).textContent = fmt(t);
    });
    svgEl('text', { x: (x(ticks[0]) + x(ticks[ticks.length - 1])) / 2, y: y0 + 38, 'text-anchor': 'middle', class: 'axis-title' }, g).textContent = label;
    return g;
  }
  const svgPoint = (svg, e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  // ---------- figure 1: the tail area ----------
  function figTail(root) {
    const body = mount(root);
    const W = 680, H = 270, X0 = -4, X1 = 5.5;
    const x = scale(X0, X1, 24, W - 24), y = scale(0, 0.5, H - 52, 12);
    const R3 = Math.sqrt(3);
    // skewed null: a gamma(3) variable rescaled to mean 0, sd 1, so x is a z-score under both shapes
    const skUpper = z => { const g = 3 + R3 * z; return g <= 0 ? 1 : Math.exp(-g) * (1 + g + (g * g) / 2); };
    const NULLS = {
      normal: { pdf: z => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI), upper: normUpper },
      skewed: { pdf: z => { const g = 3 + R3 * z; return g <= 0 ? 0 : (R3 * g * g * Math.exp(-g)) / 2; }, upper: skUpper },
    };
    const lower = (N, z) => 1 - N.upper(z);
    let shape = 'normal', sides = 'one', obs = 2.1;

    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'A null distribution with the tail beyond the observed value shaded' }, body);
    const curve = (a, b, pdf) => {
      if (b <= a) return '';
      let d = `M${x(a)},${y(0)}`;
      for (let v = a; v < b; v += 0.02) d += `L${x(v).toFixed(1)},${y(pdf(v)).toFixed(1)}`;
      return d + `L${x(b)},${y(pdf(b))}L${x(b)},${y(0)}Z`;
    };
    const area = svgEl('path', { fill: COL.nul, 'fill-opacity': 0.12, stroke: COL.nul, 'stroke-width': 1.5 }, svg);
    const ghost = svgEl('path', { fill: 'none', stroke: '#555', 'stroke-width': 1, 'stroke-dasharray': '4 3' }, svg);
    const ghostLab = svgEl('text', { x: x(-1.7), y: y(0.3), 'text-anchor': 'end', class: 'small' }, svg);
    ghostLab.textContent = 'normal, for comparison';
    const tailL = svgEl('path', { fill: COL.obs, 'fill-opacity': 0.5 }, svg);
    const tailR = svgEl('path', { fill: COL.obs, 'fill-opacity': 0.5 }, svg);
    svgEl('text', { x: x(0.9), y: y(0.42), fill: COL.nul, class: 'lab' }, svg).textContent = 'null distribution';
    xAxis(svg, x, y(0), [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5], String, 'test statistic, in standard deviations from the null mean (z)');
    const obsG = svgEl('g', { class: 'handle' }, svg);
    svgEl('line', { y1: y(0), y2: y(0.47), stroke: COL.obs, 'stroke-width': 2 }, obsG);
    svgEl('circle', { cy: y(0.47), r: 6, fill: COL.obs }, obsG);
    const obsLab = svgEl('text', { y: y(0.47) + 4, fill: COL.obs, class: 'lab' }, obsG);
    svgEl('rect', { x: -14, y: y(0.5), width: 28, height: y(0) - y(0.5), fill: 'transparent', class: 'grab' }, obsG);
    const out = htmlEl('p', { class: 'viz-readout', 'aria-live': 'polite' }, body);

    function draw() {
      const N = NULLS[shape], a = Math.abs(obs);
      area.setAttribute('d', curve(X0, X1, N.pdf));
      ghost.setAttribute('d', shape === 'skewed' ? curve(X0, X1, NULLS.normal.pdf) : '');
      ghostLab.style.display = shape === 'skewed' ? '' : 'none';
      let p, pNorm;
      if (sides === 'one') {
        tailL.setAttribute('d', '');
        tailR.setAttribute('d', curve(obs, X1, N.pdf));
        p = N.upper(obs); pNorm = normUpper(obs);
      } else {
        tailL.setAttribute('d', curve(X0, -a, N.pdf));
        tailR.setAttribute('d', curve(a, X1, N.pdf));
        p = Math.min(1, N.upper(a) + lower(N, -a)); pNorm = Math.min(1, 2 * normUpper(a));
      }
      obsG.setAttribute('transform', `translate(${x(obs)},0)`);
      const right = obs < 3.6;
      obsLab.setAttribute('x', right ? 10 : -10);
      obsLab.setAttribute('text-anchor', right ? 'start' : 'end');
      obsLab.textContent = 'observed';
      let html = `z = ${obs.toFixed(2)} &nbsp;·&nbsp; p = ${fmtP(p)} (${sides}-sided)`;
      if (p < 0.5) html += ` &nbsp;·&nbsp; about 1 in ${fmtN(1 / p)} results under the null are at least this extreme`;
      if (shape === 'skewed') html += `<br>Reading the same z off a normal null would give p = ${fmtP(pNorm)}`;
      out.innerHTML = html;
    }

    const c = row(body);
    toggle(c, 'Null shape', [['normal', 'normal'], ['skewed', 'skewed']], shape, v => { shape = v; draw(); });
    toggle(c, 'Test', [['one', 'one-sided'], ['two', 'two-sided']], sides, v => { sides = v; draw(); });
    const c2 = row(body);
    const input = slider(c2, 'Observed z', X0, X1, 0.01, obs, v => { obs = v; draw(); });

    // drag the observed line
    const grab = obsG.querySelector('.grab');
    grab.addEventListener('pointerdown', e => {
      grab.setPointerCapture(e.pointerId);
      const move = ev => {
        obs = Math.round(Math.max(X0, Math.min(X1, x.invert(svgPoint(svg, ev).x))) * 100) / 100;
        input.value = obs; draw();
      };
      const up = () => { grab.removeEventListener('pointermove', move); grab.removeEventListener('pointerup', up); };
      grab.addEventListener('pointermove', move);
      grab.addEventListener('pointerup', up);
    });
  }

  // ---------- figure 2: a permutation test on a toy network ----------
  function figPerm(root) {
    const body = mount(root);
    const net = makeNetwork(120);
    const { nodes, adj, edges, N, K } = net;
    const W = 680, H = 470;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'A toy gene network above a histogram of edge densities from random gene sets' }, body);

    // network
    svgEl('path', { d: edges.map(([i, j]) => `M${nodes[i].x},${nodes[i].y}L${nodes[j].x},${nodes[j].y}`).join(''), stroke: COL.grey, 'stroke-width': 0.8, 'stroke-opacity': 0.6, fill: 'none' }, svg);
    const hi = svgEl('g', {}, svg);
    const dots = nodes.map(n => svgEl('circle', { cx: n.x, cy: n.y, r: 5.5, fill: '#faf5ec', stroke: COL.ink, 'stroke-width': 1 }, svg));
    const netLab = svgEl('text', { x: 14, y: 244, class: 'small' }, svg);

    // histogram of null densities, one bar per possible number of connected pairs
    const KMAX = 18, x = scale(-0.5, KMAX + 0.5, 40, W - 20), yBase = H - 52, yTop = 286;
    const bw = (x(1) - x(0)) * 0.82;
    const bars = Array.from({ length: KMAX + 1 }, (_, k) => svgEl('rect', { x: x(k) - bw / 2, width: bw, y: yBase, height: 0, fill: COL.nul, 'fill-opacity': 0.45, stroke: COL.nul, 'stroke-width': 0.6 }, svg));
    xAxis(svg, x, yBase, [0, 3, 6, 9, 12, 15, 18], String, 'number of links among the 10 genes');
    const yMaxLab = svgEl('text', { x: 36, y: yTop + 4, 'text-anchor': 'end', class: 'small' }, svg);
    svgEl('line', { x1: 38, x2: 42, y1: yTop, y2: yTop, stroke: '#333' }, svg);
    svgEl('text', { x: 46, y: yTop + 4, class: 'small' }, svg).textContent = 'random sets';
    const obsG = svgEl('g', {}, svg);
    svgEl('line', { y1: yTop - 8, y2: yBase, stroke: COL.obs, 'stroke-width': 2 }, obsG);
    const obsLab = svgEl('text', { y: yTop - 14, 'text-anchor': 'middle', fill: COL.obs, class: 'lab' }, obsG);
    const out = htmlEl('p', { class: 'viz-readout', 'aria-live': 'polite' }, body);

    let which = 'tight', counts = new Array(K * (K - 1) / 2 + 1).fill(0), n = 0, busy = false;
    const observedSet = () => net[which];
    const obsK = () => linksWithin(observedSet(), adj);

    function showSet(set, colour) {
      const inSet = new Set(set);
      dots.forEach((d, i) => d.setAttribute('fill', inSet.has(i) ? colour : '#faf5ec'));
      let d = '';
      for (let a = 0; a < K; a++) for (let b = a + 1; b < K; b++) if (adj[set[a]][set[b]]) {
        const p = nodes[set[a]], q = nodes[set[b]];
        d += `M${p.x},${p.y}L${q.x},${q.y}`;
      }
      hi.innerHTML = '';
      svgEl('path', { d, stroke: colour, 'stroke-width': 2.2, fill: 'none', 'stroke-opacity': 0.85 }, hi);
      const k = linksWithin(set, adj);
      netLab.innerHTML = '';
      netLab.textContent = `${colour === COL.obs ? 'observed set' : 'random set'}: ${k} links among 10 genes`;
      netLab.setAttribute('fill', colour);
    }
    function drawHist() {
      const ymax = Math.max(10, Math.max(...counts) * 1.1);
      counts.forEach((c, k) => { if (!bars[k]) return; const h = (c / ymax) * (yBase - yTop); bars[k].setAttribute('y', yBase - h); bars[k].setAttribute('height', h); });
      yMaxLab.textContent = fmtN(ymax);
      const ko = obsK();
      obsG.setAttribute('transform', `translate(${x(ko)},0)`);
      obsLab.textContent = `observed: ${ko} links`;
      if (!n) { out.innerHTML = 'Press a button to draw random gene sets of the same size and build the null distribution.'; return; }
      const b = counts.reduce((s, c, k) => s + (k >= ko ? c : 0), 0);
      const mean = counts.reduce((s, c, k) => s + c * k, 0) / n;
      const sd = Math.sqrt(counts.reduce((s, c, k) => s + c * (k - mean) ** 2, 0) / (n - 1 || 1));
      out.innerHTML = `${fmtN(n)} random sets &nbsp;·&nbsp; ${fmtN(b)} with at least as many links as the observed set` +
        `<br>p = (${fmtN(b)} + 1) / (${fmtN(n)} + 1) = ${fmtP((b + 1) / (n + 1))}` +
        (n > 1 ? ` &nbsp;·&nbsp; null mean ${mean.toFixed(1)} links, sd ${sd.toFixed(1)} &nbsp;·&nbsp; z = ${((ko - mean) / sd).toFixed(2)}` : '');
    }
    function addRandom() {
      const s = sample(N, K, Math.random);
      counts[linksWithin(s, adj)]++; n++;
      return s;
    }
    const c = row(body);
    button(c, 'Shuffle once', () => { if (busy) return; showSet(addRandom(), COL.nul); drawHist(); });
    button(c, 'Shuffle 1,000 times', () => {
      if (busy) return;
      busy = true;
      let left = 1000;
      const step = () => {
        let s;
        for (let i = 0; i < (REDUCED ? 1000 : 20) && left > 0; i++, left--) s = addRandom();
        showSet(s, COL.nul); drawHist();
        if (left > 0) requestAnimationFrame(step);
        else { busy = false; showSet(observedSet(), COL.obs); }
      };
      step();
    });
    button(c, 'Reset', () => { if (busy) return; counts.fill(0); n = 0; showSet(observedSet(), COL.obs); drawHist(); });
    toggle(c, 'Observed gene set', [['tight', 'tight set'], ['loose', 'loose set']], which, v => {
      if (busy) return;
      which = v; showSet(observedSet(), COL.obs); drawHist();
    });
    showSet(observedSet(), COL.obs); drawHist();
  }

  // ---------- figure 3: p-values from many experiments ----------
  function figPdist(root) {
    const body = mount(root);
    const NEXP = 2000, BINS = 20, SIZES = [3, 5, 10, 20, 50, 100, 500, 2000];
    const W = 680, H = 250, x = scale(0, 1, 40, W - 20), yBase = H - 52, yTop = 20;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Histogram of p-values from 2,000 simulated experiments' }, body);
    const bw = (x(1 / BINS) - x(0)) * 0.9;
    const bars = Array.from({ length: BINS }, (_, i) => svgEl('rect', { x: x(i / BINS) + 1, width: bw, y: yBase, height: 0, fill: i ? COL.nul : COL.obs, 'fill-opacity': 0.45, stroke: i ? COL.nul : COL.obs, 'stroke-width': 0.6 }, svg));
    const flat = svgEl('line', { x1: x(0), x2: x(1), stroke: '#555', 'stroke-dasharray': '4 3' }, svg);
    const flatLab = svgEl('text', { x: x(1), 'text-anchor': 'end', class: 'small' }, svg);
    flatLab.textContent = 'flat: what you expect when the null is true';
    const sigLab = svgEl('text', { x: x(0.025), 'text-anchor': 'start', fill: COL.obs, class: 'lab' }, svg);
    xAxis(svg, x, yBase, [0, 0.2, 0.4, 0.6, 0.8, 1], String, 'p-value');
    const yMaxLab = svgEl('text', { x: 36, y: yTop + 4, 'text-anchor': 'end', class: 'small' }, svg);
    svgEl('line', { x1: 38, x2: 42, y1: yTop, y2: yTop, stroke: '#333' }, svg);
    const out = htmlEl('p', { class: 'viz-readout', 'aria-live': 'polite' }, body);

    let d = 0, nPer = 5, cur = new Array(BINS).fill(0), ymaxCur = 250, timer;
    function simulate() {
      const counts = new Array(BINS).fill(0), mu = d * Math.sqrt(nPer / 2);
      for (let i = 0; i < NEXP; i++) {
        const p = 2 * normUpper(Math.abs(mu + gauss(Math.random)));
        counts[Math.min(BINS - 1, Math.floor(p * BINS))]++;
      }
      return { counts, mu };
    }
    function update() {
      const { counts, mu } = simulate(), from = cur.slice(), y0 = ymaxCur;
      const y1 = Math.max(250, Math.max(...counts) * 1.1);
      tween(450, t => {
        const ymax = y0 + (y1 - y0) * t, sy = v => yBase - (v / ymax) * (yBase - yTop);
        cur = from.map((f, i) => f + (counts[i] - f) * t);
        cur.forEach((c, i) => { bars[i].setAttribute('y', sy(c)); bars[i].setAttribute('height', yBase - sy(c)); });
        flat.setAttribute('y1', sy(NEXP / BINS)); flat.setAttribute('y2', sy(NEXP / BINS));
        flatLab.setAttribute('y', sy(NEXP / BINS) - 6);
        sigLab.setAttribute('y', sy(cur[0]) - 6);
        yMaxLab.textContent = fmtN(ymax);
        ymaxCur = ymax;
      });
      const pct = (counts[0] / NEXP) * 100;
      const expected = (normUpper(1.96 - mu) + normUpper(1.96 + mu)) * 100;
      sigLab.textContent = `p < 0.05: ${pct.toFixed(1)}%`;
      out.innerHTML = `${pct.toFixed(1)}% of the ${fmtN(NEXP)} experiments give p < 0.05 (theory: ${expected.toFixed(1)}%). ` +
        (d === 0
          ? 'There is no real difference in any of them, so every one of those is a false positive.'
          : `This is the power to detect a true difference of ${d.toFixed(2)} standard deviations with ${fmtN(nPer)} samples per group.`);
    }
    const queue = () => { clearTimeout(timer); timer = setTimeout(update, 60); };
    const c = row(body);
    slider(c, '', 0, 1.5, 0.05, d, (v, span) => { d = v; span.textContent = `True difference: ${v.toFixed(2)} sd`; queue(); });
    slider(c, '', 0, SIZES.length - 1, 1, 1, (v, span) => { nPer = SIZES[v]; span.textContent = `Samples per group: ${fmtN(nPer)}`; queue(); });
  }

  // ---------- figure 4: what a shuffle keeps and what it destroys ----------
  function figShuffle(root) {
    const body = mount(root);
    const ORIG = 'TTCAAATGACACGTGTCATTAAATTGTCAAGCTATATAAAGCATTGTACACGTGGCAAAT';
    const L = ORIG.length, PER = 30, CW = 21.3, X0 = 22, Y0 = 34, RH = 40;
    const W = 680, H = 300;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'A 60 base sequence, its base counts, and its dinucleotide counts' }, body);
    const cell = i => [X0 + (i % PER) * CW, Y0 + Math.floor(i / PER) * RH];
    const marks = Array.from({ length: L }, (_, i) => { const [cx, cy] = cell(i); return svgEl('rect', { x: cx - 1, y: cy - 21, width: CW, height: 28, fill: COL.obs, 'fill-opacity': 0 }, svg); });
    const letters = ORIG.split('').map(b => ({ b, el: svgEl('text', { class: 'base', fill: BASE[b], 'text-anchor': 'start' }, svg) }));
    const motifLab = svgEl('text', { x: X0, y: Y0 + RH + 34, class: 'lab' }, svg);

    // base counts (left) and dinucleotide grid (right)
    const count = s => { const m = {}; for (const ch of s) m[ch] = (m[ch] || 0) + 1; return m; };
    const di = s => { const m = {}; for (let i = 0; i < s.length - 1; i++) m[s.slice(i, i + 2)] = (m[s.slice(i, i + 2)] || 0) + 1; return m; };
    const B = 'ACGT', c0 = count(ORIG), d0 = di(ORIG), GY = 150;
    svgEl('text', { x: X0, y: GY, class: 'lab' }, svg).textContent = 'base counts';
    const baseTxt = [...B].map((b, i) => {
      svgEl('text', { x: X0, y: GY + 26 + i * 24, class: 'base small-base', fill: BASE[b] }, svg).textContent = b;
      return svgEl('text', { x: X0 + 22, y: GY + 26 + i * 24 }, svg);
    });
    const GX = 330, cw = 52, ch = 24;
    svgEl('text', { x: GX, y: GY, class: 'lab' }, svg).textContent = 'dinucleotide counts (row base, then column base)';
    const gridCells = {};
    [...B].forEach((a, r) => {
      svgEl('text', { x: GX + 6, y: GY + 30 + (r + 1) * ch - 8, class: 'base small-base', fill: BASE[a] }, svg).textContent = a;
      svgEl('text', { x: GX + 30 + r * cw + cw / 2, y: GY + 24, 'text-anchor': 'middle', class: 'base small-base', fill: BASE[a] }, svg).textContent = a;
      [...B].forEach((b, k) => {
        const gx = GX + 30 + k * cw, gy = GY + 30 + r * ch;
        const rect = svgEl('rect', { x: gx, y: gy, width: cw - 2, height: ch - 2, fill: COL.grey, 'fill-opacity': 0.35 }, svg);
        const t = svgEl('text', { x: gx + cw / 2 - 1, y: gy + ch - 8, 'text-anchor': 'middle' }, svg);
        gridCells[a + b] = { rect, t };
      });
    });
    const out = htmlEl('p', { class: 'viz-readout', 'aria-live': 'polite' }, body);

    function render(seq, animate) {
      // move each letter object to a position holding the same base, picking randomly among them
      const free = {};
      [...B].forEach(b => (free[b] = shuffle(letters.filter(l => l.b === b), Math.random)));
      [...seq].forEach((b, i) => {
        const l = free[b].pop(), [cx, cy] = cell(i);
        l.el.style.transition = animate && !REDUCED ? 'transform 0.9s cubic-bezier(.5,0,.2,1)' : 'none';
        l.el.style.transform = `translate(${cx}px, ${cy}px)`;
        l.el.textContent = b;
      });
      const hits = [];
      for (let i = 0; i + 5 <= L; i++) { const w = seq.slice(i, i + 5); if (w === 'ACGTG' || w === 'CACGT') hits.push(i); }
      const on = new Set(hits.flatMap(i => [0, 1, 2, 3, 4].map(k => i + k)));
      const sites = hits.filter((h, k) => k === 0 || h > hits[k - 1] + 4).length; // CACGTG reads ACGTG on both strands: one site
      setTimeout(() => marks.forEach((m, i) => m.setAttribute('fill-opacity', on.has(i) ? 0.18 : 0)), animate && !REDUCED ? 900 : 0);
      motifLab.textContent = `ACGTG motif (either strand): ${sites} ${sites === 1 ? 'site' : 'sites'}`;
      const c = count(seq), d = di(seq);
      [...B].forEach((b, i) => (baseTxt[i].textContent = `${c[b] || 0} (original ${c0[b] || 0})`));
      let same = 0;
      for (const k in gridCells) {
        const v = d[k] || 0, ok = v === (d0[k] || 0);
        same += ok;
        gridCells[k].t.textContent = v;
        gridCells[k].rect.setAttribute('fill', ok ? COL.grey : COL.obs);
        gridCells[k].rect.setAttribute('fill-opacity', ok ? 0.35 : 0.4);
      }
      out.innerHTML = `Base counts: all 4 unchanged &nbsp;·&nbsp; dinucleotide counts: ${same} of 16 match the original`;
    }
    const c = row(body);
    button(c, 'Shuffle bases', () => render(shuffle([...ORIG], Math.random).join(''), true));
    button(c, 'Shuffle, keeping dinucleotides', () => render(dinucShuffle(ORIG, Math.random), true));
    button(c, 'Reset', () => render(ORIG, true));
    render(ORIG, false);
  }

  const figs = { 'viz-tail': figTail, 'viz-perm': figPerm, 'viz-pdist': figPdist, 'viz-shuffle': figShuffle };
  for (const id in figs) { const el = document.getElementById(id); if (el) figs[id](el); }
})();
