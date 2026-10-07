// node _check.js - asserts on the pure maths behind figs.js
const assert = require('assert');
const f = require('./figs.js');

assert(Math.abs(f.normUpper(1.96) - 0.0249979) < 1e-6);
assert(Math.abs(f.normUpper(3.719) / 1e-4 - 1) < 1e-3);   // p = 1e-4 is z ~ 3.72
assert(Math.abs(f.normUpper(-1) - 0.8413447) < 1e-6);

const di = s => { const m = {}; for (let i = 0; i < s.length - 1; i++) m[s.slice(i, i + 2)] = (m[s.slice(i, i + 2)] || 0) + 1; return m; };
const seq = 'TTCAAATGACACGTGTCATTAAATTGTCAAGCTATATAAAGCATTGTACACGTGGCAAAT';
assert.strictEqual(seq.length, 60);
const rand = f.mulberry32(1);
for (let i = 0; i < 500; i++) {
  const s = f.dinucShuffle(seq, rand);
  assert.deepStrictEqual(di(s), di(seq));
  assert(s[0] === seq[0] && s[59] === seq[59]);
}

const net = f.makeNetwork(120);
assert.strictEqual(net.nodes.length, 60);
assert.strictEqual(f.fmtP(0.0249), '0.025');
assert.strictEqual(f.fmtP(1 / 1001), '0.001');
assert.strictEqual(f.fmtP(0.0000123), '1.2 × 10<sup>-5</sup>');
console.log('ok', 'tight links', f.linksWithin(net.tight, net.adj), 'loose links', f.linksWithin(net.loose, net.adj));
