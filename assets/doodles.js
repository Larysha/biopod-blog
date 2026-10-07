/* Small homepage creatures for pages and posts: an ant, ladybird or sprout on up to three headings,
   and a vine with a caterpillar wherever the page has <svg class="bp-vine">.
   Ported from assets/story/biopod-story.js. Purely decorative. */
(() => {
  const INK = '#323619', LEAF = '#9fb371';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = document.createElement('style');
  css.textContent = `
    h2.bp-doodled { position: relative; }
    .bp-doodle { position: absolute; bottom: 1px; pointer-events: none; overflow: visible; }
    .bp-sprout { bottom: 0; }
    .bp-ant { bottom: -3px; }
    .bp-sprout .ink { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.4s ease; }
    .bp-sprout .wash { opacity: 0; transition: opacity .6s ease 1s; }
    .bp-sprout.grown .ink { stroke-dashoffset: 0; }
    .bp-sprout.grown .wash { opacity: .75; }
    .bp-sprout .plant { transform-box: fill-box; transform-origin: 50% 100%; }
    .bp-sprout.grown .plant { animation: bp-sway 5s ease-in-out 1.6s infinite; }
    @keyframes bp-sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(4deg); } }
    .bp-vine { display: block; width: 100%; height: 80px; overflow: hidden; margin: 2.4rem 0 1rem; }
    .bp-vine .vine-line { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.6s ease; }
    .bp-vine.drawn .vine-line { stroke-dashoffset: 0; }
    @media (prefers-reduced-motion: reduce) {
      .bp-vine .vine-line { transition: none; stroke-dashoffset: 0; }
      .bp-sprout .ink, .bp-sprout .wash { transition: none; }
      .bp-sprout.grown .plant { animation: none; }
    }`;
  document.head.appendChild(css);

  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = reduce;
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const onView = (node, fn) => new IntersectionObserver((es, obs) => {
    if (es.some(e => e.isIntersecting)) { obs.disconnect(); fn(); }
  }, { threshold: 0.4 }).observe(node);

  // ---------- vine with swaying leaves and a caterpillar ----------
  document.querySelectorAll('.bp-vine').forEach(svg => {
    svg.setAttribute('viewBox', '0 0 1200 80');
    svg.setAttribute('preserveAspectRatio', 'xMinYMid slice');
    const vine = el('path', { d: 'M0 52 C120 36 220 64 360 50 C500 36 620 66 760 52 C900 38 1040 62 1200 48', fill: 'none', stroke: INK, 'stroke-width': 1.2, pathLength: 1, class: 'vine-line' }, svg);
    const len = vine.getTotalLength();
    [70, 180, 300, 430, 560, 700, 830, 980, 1110].forEach((x, i) => {
      const p = vine.getPointAtLength(len * x / 1200), L = 30 + (i % 3) * 6, W = 11;
      const g = el('g', { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${i % 2 ? -63 : -120})`, class: 'vine-leaf' }, svg);
      const leaf = el('path', { d: `M0 0 Q${L * .45} ${-W} ${L} 0 Q${L * .45} ${W} 0 0 Z M0 0 L${L * .85} 0`, fill: LEAF, 'fill-opacity': .6, stroke: INK, 'stroke-width': 1.2 }, g);
      if (!REDUCED) el('animateTransform', { attributeName: 'transform', type: 'rotate', values: '-6;6;-6', dur: `${3.6 + (i % 4) * .6}s`, begin: `${-i * .4}s`, repeatCount: 'indefinite' }, leaf);
    });
    const cat = el('g', {}, svg);
    const segs = Array.from({ length: 7 }, (_, i) => el('circle', { r: i === 6 ? 8 : 6.5, fill: i === 6 ? '#8fae6a' : (i % 2 ? '#a9c27a' : '#9fb371'), stroke: INK, 'stroke-width': 1.3 }, cat));
    const eye = el('circle', { r: 1.6, fill: INK }, cat);
    const place = t => segs.forEach((s, i) => {
      const p = vine.getPointAtLength(((t * len) + i * 11) % len), hump = Math.max(0, Math.sin(t * 90 - i * .9)) * 6;
      s.setAttribute('cx', p.x.toFixed(1)); s.setAttribute('cy', (p.y - 7 - hump).toFixed(1));
      if (i === 6) { eye.setAttribute('cx', (p.x + 3).toFixed(1)); eye.setAttribute('cy', (p.y - 10 - hump).toFixed(1)); }
    });
    place(0.05);
    onView(svg, () => {
      svg.classList.add('drawn');
      if (REDUCED) return;
      const t0 = performance.now();
      const loop = now => { place((0.05 + (now - t0) / 70000) % 1); requestAnimationFrame(loop); }; // one lap every 70 s, as on the homepage
      requestAnimationFrame(loop);
    });
  });


  const antLeg = (x, s) => `<path data-x="${x}" data-y="0" data-p="${(x / 3 + 1 + (s > 0 ? 1 : 0)) % 2}" d="M${x} 0 q${x * .6} ${s * 5} ${x * .9 - 1} ${s * 8}" stroke="${INK}" stroke-width="1.1" stroke-linecap="round" fill="none"/>`;
  const ANT = `${[-3, 0, 3].flatMap(x => [-1, 1].map(s => antLeg(x, s))).join('')}
    <ellipse cx="-9" rx="6" ry="4.2" fill="${INK}"/><ellipse cx="-1" rx="4" ry="2.6" fill="${INK}"/><circle cx="6" r="3.4" fill="${INK}"/>
    <path d="M8 -1.5 q4 -4 8 -3 M8 1.5 q4 4 8 3" stroke="${INK}" fill="none" stroke-linecap="round"/>`;
  const LADYBIRD = `<g transform="rotate(90)">${[-6, 0, 6].flatMap((y, k) => [-1, 1].map(s =>
      `<path data-x="${s * 7}" data-y="${y}" data-p="${(k + (s > 0 ? 1 : 0)) % 2}" d="M${s * 7} ${y} l${s * 7} ${y * .3 - 2}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`)).join('')}
    <path d="M-3 -12 q-3 -6 -7 -7 M3 -12 q3 -6 7 -7" stroke="${INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <ellipse cy="-10" rx="6" ry="5" fill="${INK}"/>
    <g class="shell" data-s="-1"><path d="M0 -8 A10 11 0 0 0 0 13 Z" fill="#c8553d" stroke="${INK}" stroke-width="1.4"/><circle cx="-5" cy="-1" r="2" fill="${INK}"/><circle cx="-4" cy="7" r="2" fill="${INK}"/></g>
    <g class="shell" data-s="1"><path d="M0 -8 A10 11 0 0 1 0 13 Z" fill="#c8553d" stroke="${INK}" stroke-width="1.4"/><circle cx="5" cy="-1" r="2" fill="${INK}"/><circle cx="4" cy="7" r="2" fill="${INK}"/></g>
    <circle cx="-2.5" cy="-11.5" r="1.2" fill="#f8f0ea"/><circle cx="2.5" cy="-11.5" r="1.2" fill="#f8f0ea"/></g>`;
  const LEAVES = 'M2 -22 Q-12 -30 -12 -40 Q0 -38 2 -24 M2 -26 Q14 -36 12 -44 Q2 -42 2 -28';
  const SPROUT = `<g class="plant"><path class="wash" d="${LEAVES}" fill="#9fb371"/>
    <path class="ink" pathLength="1" d="M0 0 Q-2 -14 2 -30" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path class="ink" pathLength="1" d="${LEAVES}" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linejoin="round"/></g>`;
  const KIND = {
    ant: { box: '-16 -9 34 18', w: 34, h: 18, html: ANT },
    ladybird: { box: '-16 -13 32 26', w: 32, h: 26, html: LADYBIRD },
    sprout: { box: '-16 -48 32 50', w: 30, h: 47, html: SPROUT },
  };

  function animate(ms, fn, done) {
    const t0 = performance.now();
    const step = now => {
      const t = Math.max(0, Math.min(1, (now - t0) / ms));
      fn(t);
      if (t < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
  }
  // tripod gait: two alternating leg sets swing with distance walked
  const gait = (legs, x, amp) => legs.forEach(l => l.setAttribute('transform', `rotate(${Math.sin(x * .55 + l.dataset.p * Math.PI) * amp} ${l.dataset.x} ${l.dataset.y})`));
  // ladybird lifts both shell halves twice
  const flutter = shells => animate(700, t => {
    const a = Math.sin(t * Math.PI * 2) ** 2 * 28;
    shells.forEach(s => s.setAttribute('transform', `rotate(${s.dataset.s * a} 0 -8)`));
  });

  function addDoodle(h, kind) {
    const k = KIND[kind];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', k.box);
    svg.setAttribute('width', k.w); svg.setAttribute('height', k.h);
    svg.setAttribute('class', `bp-doodle bp-${kind}`);
    svg.innerHTML = k.html;
    h.classList.add('bp-doodled');
    h.appendChild(svg);

    const legs = [...svg.querySelectorAll('[data-p]')], shells = [...svg.querySelectorAll('.shell')];
    const rest = () => h.clientWidth - (kind === 'ant' ? 70 : 46);
    const from = () => (kind === 'ant' ? 0 : rest() - 70); // the ant crosses the line, the ladybird potters a short way
    let arrived = reduce || kind === 'sprout';
    svg.style.left = (arrived ? rest() : from()) + 'px';
    addEventListener('resize', () => { if (arrived) svg.style.left = rest() + 'px'; });

    const start = () => {
      if (kind === 'sprout') return svg.classList.add('grown');
      if (reduce) return;
      const x0 = from(), x1 = rest();
      animate(kind === 'ant' ? 3200 : 1800, t => {
        const x = x0 + (1 - (1 - t) ** 2) * (x1 - x0);
        svg.style.left = x + 'px';
        gait(legs, x, t < 1 ? (kind === 'ant' ? 26 : 18) : 0);
      }, () => { arrived = true; if (kind === 'ladybird') setTimeout(() => flutter(shells), 400); });
    };
    if (kind === 'ladybird' && !reduce) h.addEventListener('mouseenter', () => { if (arrived) flutter(shells); });
    new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting)) { obs.disconnect(); start(); }
    }, { threshold: 1 }).observe(h);
  }

  // up to three headings spread through the page; creatures picked by URL so a page always looks the same
  const h2s = [...document.querySelectorAll('#quarto-document-content h2.anchored')];
  const n = h2s.length;
  const picks = n === 1 ? [0] : [1, Math.floor(n / 2), n - 2];
  const kinds = ['ant', 'ladybird', 'sprout'];
  const seed = [...location.pathname].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  [...new Set(picks.filter(i => i >= 0 && i < n))]
    .forEach((i, j) => addDoodle(h2s[i], kinds[(seed + j) % kinds.length]));
})();
