/* Projects page: a mini seqart demo. (The vine divider lives in assets/doodles.js.)
   Plain SVG and DOM, no libraries. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onView = (node, fn) => new IntersectionObserver((es, obs) => {
    if (es.some(e => e.isIntersecting)) { obs.disconnect(); fn(); }
  }, { threshold: 0.4 }).observe(node);

  // ---------- seqart, in miniature ----------
  // Palettes, shapes, and layout rules follow github.com/Larysha/seqart (palettes.py, shapes.py, layout.py).
  const PALETTES = {
    pastel: { A: '#F4C7B8', T: '#F7E1A0', C: '#A9D4D7', G: '#C8B6E2', N: '#E5E5E5' },
    pilus_tip: { A: '#7AA5C9', T: '#2E5C7E', C: '#1F8C8A', G: '#0F3A4A', N: '#D0D8DC' },
    mcherry_fusion: { A: '#F7CDCD', T: '#E07A7A', C: '#C0322E', G: '#6A0F12', N: '#DDDDDD' },
    nature: { A: '#8B6F3E', T: '#5E7A3A', C: '#274472', G: '#A0926B', N: '#CBC2B0' },
    synbio_sunset: { A: '#C75B2B', T: '#9B1B30', C: '#E8A53A', G: '#5C1A1A', N: '#D8C9B8' },
    mitochroma: { A: '#B7A6D6', T: '#A8C0A0', C: '#E0B4B8', G: '#7E6F9E', N: '#E0DCE0' },
    gfp_express: { A: '#C9F0C2', T: '#7FD16C', C: '#3FA64A', G: '#1F5C2A', N: '#DDDDDD' },
    viroid_bloom: { A: '#F490B8', T: '#7A3FB7', C: '#5FB85C', G: '#1F8C8A', N: '#D8D8D8' },
    tp53_reference: { A: '#A6D9D6', T: '#3DC3E8', C: '#5A6FD9', G: '#5B2A8F', N: '#D0D0D0' },
    chromatogram: { A: '#1FB04A', T: '#E03434', C: '#1F66E0', G: '#1A1A1A', N: '#BFBFBF' },
  };
  const H = Math.sqrt(3) / 2, f = x => +x.toFixed(2);
  const SHAPES = {
    circles: { draw: (x, y, s, c) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s / 2)}" fill="${c}"/>` },
    rounded_squares: { draw: (x, y, s, c) => `<rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" rx="${f(s * .22)}" fill="${c}"/>` },
    hexagons: {
      cw: .75, ch: H, hex: true,
      draw: (x, y, s, c) => `<polygon points="${[[-.5, 0], [-.25, -H / 2], [.25, -H / 2], [.5, 0], [.25, H / 2], [-.25, H / 2]].map(([a, b]) => `${f(x + a * s)},${f(y + b * s)}`).join(' ')}" fill="${c}" stroke="#fff" stroke-width="${f(s * .05)}"/>`,
    },
    diamonds: { draw: (x, y, s, c) => `<polygon points="${f(x)},${f(y - s / 2)} ${f(x + s / 2)},${f(y)} ${f(x)},${f(y + s / 2)} ${f(x - s / 2)},${f(y)}" fill="${c}"/>` },
    triangles: { ch: H, draw: (x, y, s, c) => `<polygon points="${f(x)},${f(y - s * H / 2)} ${f(x - s / 2)},${f(y + s * H / 2)} ${f(x + s / 2)},${f(y + s * H / 2)}" fill="${c}"/>` },
    stars: {
      draw: (x, y, s, c) => `<polygon points="${Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .2 : s / 2;
        return `${f(x + r * Math.cos(a))},${f(y + r * Math.sin(a))}`;
      }).join(' ')}" fill="${c}"/>`,
    },
  };
  const DMR6 = 'ATAATTTTAAAATATGTAAATTTTTAATCAATTTTAAATATATTTGATTTTTTTTTCCATATTTTTCCTCTTTCAACCAACTAGGAGGAGTCATTCTCCTTAATAATTATTGTTTTCTCTCTCTCATACTTCTTCGAATGAAACATAAGATTAATGATCTCTACAAGATAAAGGTAAGATGAATATGTGGCTAGAAGACTTGAGATATCGAGTCAACCCAACTTGTCCCACATGCCCTTCATTCACGTATATATGTATATTTTAGTGCAAGTGATCAGACTCATCTTCCAGGAAGCTGCTTAGTAGAGTGGTTATCCAATTTTCCTTAGGTTGCTACATATATAAGTCCATGGAATCAAAGGTGTTGTCCACCGGAATCCGGTACTTGACCTTGCCACAAAGTTACATCAGGCCAGAGCCGGAGAGGCCGAGACTCTCCCAAGTGAGTGAGTGTAAACATGTCCCCATAATCGACCTCGGCAAGGACGTAAACAGGGCCCAACTCATCCAACACATCGCCGATGCTTGCAGGCTCTATGGTTTTTTCCAGGTGATCAATCATGGGGTAGCTGCAGAAATGATGGAGAAAATGTTGGAGGTGGCCGATGAGTTCTACAGACTGCCGGTGGAGGAGAAGATGAAGCTGTATTCCGATGATCCCACCAAGACAATGAGGTTGTCAACCAGCTTTAATGTGAATAAGGAGAAGGTCCATAACTGGAGAGATTATCTCAGACTCCATTGTTATCCTCTGGATCAGTACACGCCTGAGTGGCCTTCCAATCCTCCTTCCTTCAAGGAAATTGTGAGTAGTTATTGCAAAGAGGTAAGAGAACTTGGGTTCAGACTACAAGAAATGATATCAGAGAGTTTAGGCTTGGAAAAGGATCATATAAAGAATGTTTTTGGTGAACAAGGGCAACACATGGCTGTAAACTATTATCCGCCATGTCCACAACCCGAGCTCACTTATGGATTGCCAGGACACACAGACCCCAACGCCCTTACCATTCTTCTTCAAGACCTACGAGTGGCAGGTCTTCAAGTTCTCAAGGATGGTACTTGGCTCGCTATCAAGCCACATCCCGGTGCTTTTGTCGTCAATATAGGCGATCAATTACAGGCTGTGAGTAATGGGAAATACAAAAGTGTATGGCATAGGGCCGTTGTGAATGCAGAGAGTGAAAGGCTATCAGTGGCTTCTTTCCTCTGCCCATGCAATGATGCAGTAATTGGCCCTGCAAAGCCTCTCACAGAAGATGGATCTGCACCCATTTACAAGAATTTCACATATGCTGAGTATTACAAGAAGTTCTGGGGCAGGGACTTGGATCAAGAACATTGCTTGGAACTATTCAAGAACTAGAAGCCTTTCCTGTCTAGTTTTCGATGACATTTCAGTAAGATGTGTAATAATATGGTCAAGTTGAACTTTCCTTGATTATTGTTGTATTTTGTGGTTCAAGTCTTTCTCGCAAGTGCTACATGTTTTTAAATAAAGTAGTCTCTAATTTCTTTCCTTAATATGTGTTTAGTGAATCATGTGCGAAGAGAACAAAAACGAGAGGAAGTGGAACCAGAATGAAATGAAATCTGAATCGAGAATTCAATTAAAGTGTTTTACGTGACTGAGAAAATGAAATGAAA';

  function layout(n, shape, W, Hh) {
    const blocks = n < 1000 ? 2 : n < 2500 ? 4 : n < 5000 ? 6 : 8, gutter = W * .045;
    const cw = shape.cw || 1, ch = shape.ch || 1, hex = !!shape.hex;
    const bw = (W - (blocks - 1) * gutter) / blocks;
    const fit = s => {
      const sub = Math.max(1, hex ? Math.floor((bw - s) / (s * cw)) + 1 : Math.floor(bw / (s * cw)));
      const rows = Math.max(1, hex ? Math.floor(Hh / (s * ch) - .5) : Math.floor(Hh / (s * ch)));
      return { sub, rows };
    };
    let s = Math.min(Math.sqrt(blocks * bw * Hh / (n * cw * ch)), 30), c = fit(s);
    while (blocks * c.sub * c.rows < n && s > .2) { s *= .98; c = fit(s); }
    const pos = [];
    for (let i = 0; i < n; i++) {
      const b = Math.floor(i / (c.sub * c.rows)), r0 = i % (c.sub * c.rows), j = Math.floor(r0 / c.rows), r = r0 % c.rows;
      pos.push([b * (bw + gutter) + s / 2 + j * s * cw, (r + .5) * s * ch + (hex && j % 2 ? s * ch / 2 : 0)]);
    }
    return { s, pos };
  }

  const demo = document.getElementById('seqart-demo');
  if (demo) {
    const $ = sel => demo.querySelector(sel);
    const poster = $('.sa-poster'), seqIn = $('#sa-seq'), titleIn = $('#sa-title'), palIn = $('#sa-palette'), shapeIn = $('#sa-shape');
    Object.keys(PALETTES).forEach(k => palIn.add(new Option(k.replace(/_/g, ' '), k)));
    Object.keys(SHAPES).forEach(k => shapeIn.add(new Option(k.replace(/_/g, ' '), k)));
    palIn.value = 'pastel'; shapeIn.value = 'hexagons';
    seqIn.value = DMR6;
    let job = 0;

    function render(animate) {
      const id = ++job;
      const seq = seqIn.value.split('\n').filter(l => !l.startsWith('>')).join('').toUpperCase().replace(/[^A-Z]/g, '')
        .replace(/U/g, 'T').replace(/[^ACGT]/g, 'N').slice(0, 3000);
      const pal = PALETTES[palIn.value], shape = SHAPES[shapeIn.value];
      // A-series portrait page in mm, as in the real tool
      const W = 210, PH = 297, pad = 16, top = 40, bottom = 26;
      const { s, pos } = layout(Math.max(seq.length, 1), shape, W - 2 * pad, PH - top - bottom - pad);
      const used = pos.length ? Math.max(...pos.map(p => p[0])) + s / 2 : 0, ox = pad + (W - 2 * pad - used) / 2, oy = top;
      const letters = [...'ATCG', ...(seq.includes('N') ? ['N'] : [])];
      const esc = t => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
      poster.innerHTML = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${PH}" font-family="Helvetica, Arial, sans-serif">
        <rect width="${W}" height="${PH}" fill="#fff"/>
        <text x="${W / 2}" y="22" text-anchor="middle" font-size="8.5" fill="#2A2A2A">${esc(titleIn.value || 'MY SEQUENCE')}</text>
        <text x="${W / 2}" y="30" text-anchor="middle" font-size="4.6" fill="#888">${seq.length.toLocaleString('en-GB')} bp</text>
        <g class="sa-grid"></g>
        <g>${letters.map((b, i) => {
          const lx = W / 2 + (i - (letters.length - 1) / 2) * 22, ly = PH - 17;
          return SHAPES[shapeIn.value].draw(lx, ly, 6, pal[b]) + `<text x="${lx}" y="${ly + 9}" text-anchor="middle" font-size="4" fill="#555">${b}</text>`;
        }).join('')}</g></svg>`;
      const grid = poster.querySelector('.sa-grid');
      const marks = pos.slice(0, seq.length).map(([x, y], i) => shape.draw(ox + x, oy + y, s, pal[seq[i]]));
      if (!animate || REDUCED) { grid.innerHTML = marks.join(''); return; }
      // print the bases in reading order, a batch per frame
      let k = 0;
      const step = () => {
        if (id !== job) return;
        grid.insertAdjacentHTML('beforeend', marks.slice(k, k += Math.max(12, Math.ceil(marks.length / 90))).join(''));
        if (k < marks.length) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    [palIn, shapeIn].forEach(x => x.addEventListener('change', () => render(true)));
    let t;
    [seqIn, titleIn].forEach(x => x.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => render(false), 250); }));
    $('#sa-surprise').addEventListener('click', () => {
      const pick = o => o[Math.floor(Math.random() * o.length)];
      palIn.value = pick(Object.keys(PALETTES)); shapeIn.value = pick(Object.keys(SHAPES));
      render(true);
    });
    $('#sa-download').addEventListener('click', () => {
      const svg = poster.querySelector('svg').outerHTML;
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), download: 'seqart-mini.svg' });
      a.click(); URL.revokeObjectURL(a.href);
    });
    render(false);
    onView(poster, () => render(true));
  }
})();
