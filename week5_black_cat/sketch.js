// Sesame — a small black cat whose fur tells you how it feels about where it is.
// p5.js port: 256×144 low-res canvas, scaled up with noSmooth() + pixelated CSS.
// Controls: 1–4 or ←/→ switch scenes, Space toggles the auto tour.

const W = 256, H = 144;
const DWELL = 10;          // seconds per scene while touring
const TRANS_DUR = 0.9;     // dissolve length in seconds
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

let g;                     // current draw target (a p5.Graphics)
let ALPHA = 1;             // global alpha for pixel fills
let bufA, bufB;            // offscreen buffers for the dissolve
let THR;                   // per-pixel dissolve thresholds
const BG = {};
let fireGlow;

/* ---------- pixel primitives ---------- */
const rd = Math.round;
const colCache = {};
function rgb(c) {
  let v = colCache[c];
  if (!v) { const n = parseInt(c.slice(1), 16); v = colCache[c] = [n >> 16, n >> 8 & 255, n & 255]; }
  return v;
}
// p5's fill() builds a color object each call, so skip it when nothing changed
function F(c) {
  const k = c + '|' + ALPHA;
  if (g._sesFill === k) return;
  g._sesFill = k;
  const v = rgb(c);
  g.fill(v[0], v[1], v[2], ALPHA * 255);
}
function R(x, y, w, h, c) { if (c) F(c); g.rect(rd(x), rd(y), w, h); }
function P(x, y, c) { R(x, y, 1, 1, c); }
function disc(cx, cy, r, c) {
  F(c); const x0 = rd(cx), y0 = rd(cy), rr = (r + .5) * (r + .5), ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) { const q = rr - dy * dy; if (q < 0) continue; const hw = Math.floor(Math.sqrt(q)); g.rect(x0 - hw, y0 + dy, hw * 2 + 1, 1); }
}
function ell(cx, cy, rx, ry, c) {
  F(c); const x0 = rd(cx), y0 = rd(cy), ri = rd(ry);
  for (let dy = -ri; dy <= ri; dy++) { const k = dy / (ry + .5), q = 1 - k * k; if (q < 0) continue; const hw = rd(rx * Math.sqrt(q)); g.rect(x0 - hw, y0 + dy, hw * 2 + 1, 1); }
}
function tri(x1, y1, x2, y2, x3, y3, c) {
  F(c); const p = [[x1, y1], [x2, y2], [x3, y3]];
  const y0 = Math.floor(Math.min(y1, y2, y3)), yE = Math.ceil(Math.max(y1, y2, y3));
  for (let y = y0; y < yE; y++) {
    const sy = y + .5; let lo = 1e9, hi = -1e9;
    for (let i = 0; i < 3; i++) {
      const [ax, ay] = p[i], [bx, by] = p[(i + 1) % 3];
      if ((sy >= ay && sy < by) || (sy >= by && sy < ay)) { const x = ax + (sy - ay) * (bx - ax) / (by - ay); if (x < lo) lo = x; if (x > hi) hi = x; }
    }
    if (lo <= hi) { const a = rd(lo), b = rd(hi); g.rect(a, y, Math.max(1, b - a), 1); }
  }
}
// Bresenham line (named ln so it doesn't shadow p5's line())
function ln(x0, y0, x1, y1, c) {
  F(c); x0 = rd(x0); y0 = rd(y0); x1 = rd(x1); y1 = rd(y1);
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (let i = 0; i < 300; i++) {
    g.rect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
const qb = (a, b, c, t) => { const u = 1 - t; return u * u * a + 2 * u * t * b + t * t * c; };
function tube(x0, y0, x1, y1, x2, y2, r0, r1, c, n = 14) { for (let i = 0; i <= n; i++) { const t = i / n; disc(qb(x0, x1, x2, t), qb(y0, y1, y2, t), r0 + (r1 - r0) * t, c); } }
const BY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bay = (x, y) => (BY[y & 3][x & 3] + .5) / 16;
// Ordered-dither gradient, written straight into the pixel array
function bands(cols, y0, y1) {
  g.loadPixels(); const px = g.pixels;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / (y1 - y0) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(f)), fr = f - i;
    const ca = rgb(cols[i]), cb = rgb(cols[i + 1]);
    for (let x = 0; x < W; x++) {
      const v = bay(x, y) < fr ? cb : ca, j = 4 * (y * W + x);
      px[j] = v[0]; px[j + 1] = v[1]; px[j + 2] = v[2]; px[j + 3] = 255;
    }
  }
  g.updatePixels();
}
function glowE(rx, ry, col, pow = 2) {
  const gr = createGraphics(rx * 2, ry * 2); gr.pixelDensity(1); gr.loadPixels();
  const v = rgb(col), w = rx * 2;
  for (let yy = 0; yy < ry * 2; yy++) for (let xx = 0; xx < w; xx++) {
    const d = Math.hypot((xx - rx + .5) / rx, (yy - ry + .5) / ry);
    if (d < 1 && bay(xx, yy) < Math.pow(1 - d, pow) * 1.1) { const j = 4 * (yy * w + xx); gr.pixels[j] = v[0]; gr.pixels[j + 1] = v[1]; gr.pixels[j + 2] = v[2]; gr.pixels[j + 3] = 255; }
  }
  gr.updatePixels(); return gr;
}
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mixHex(a, b, t) {
  const pa = rgb(a), pb = rgb(b);
  return '#' + ((1 << 24) | (rd(lerp(pa[0], pb[0], t)) << 16) | (rd(lerp(pa[1], pb[1], t)) << 8) | rd(lerp(pa[2], pb[2], t))).toString(16).slice(1);
}
function mk() { const b = createGraphics(W, H); b.pixelDensity(1); b.noSmooth(); b.noStroke(); return b; }

/* tiny bitmap glyphs */
const G = {
  H: ['101', '101', '111', '101', '101'], O: ['111', '101', '101', '101', '111'], N: ['1001', '1101', '1011', '1001', '1001'], K: ['1001', '1010', '1100', '1010', '1001'],
  '!': ['1', '1', '1', '0', '1'], heart: ['01010', '11111', '11111', '01110', '00100'], note: ['0110', '0101', '0100', '1100', '1100'],
  check: ['00001', '00011', '10110', '11100', '01000']
};
function glyph(k, x, y, c, s = 1) {
  const rows = G[k]; F(c);
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === '1') g.rect(rd(x) + i * s, rd(y) + j * s, s, s);
  return rows[0].length * s;
}
function pixText(str, x, y, c) { let cx = x; for (const ch of str) cx += glyph(ch, cx, y, c) + 1; }

/* ---------- Sesame ---------- */
const CAT = '#17131f', EYE = '#f4d35e', NOSE = '#e58fa0', EARPK = '#4a2638', WHISK = '#9d93b8', BLUSH = '#c9607c', GLASS = '#d8b36a';
function eye(type, x, y) {
  switch (type) {
    case 'open': R(x, y, 3, 2, EYE); R(x + 1, y, 1, 2, CAT); break;
    case 'half': R(x, y + 1, 3, 1, EYE); P(x + 1, y + 1, CAT); break;
    case 'closed': R(x, y + 1, 3, 1, WHISK); break;
    case 'happy': P(x, y + 1, WHISK); P(x + 1, y, WHISK); P(x + 2, y + 1, WHISK); break;
    case 'content': P(x, y, WHISK); P(x + 1, y + 1, WHISK); P(x + 2, y, WHISK); break;
  }
}
function face(hx, hy, o) {
  const lx = o.lookX || 0, ey = hy - 1;
  const [el, er] = Array.isArray(o.eyes) ? o.eyes : [o.eyes, o.eyes];
  eye(o.blink ? 'closed' : el, hx - 4 + lx, ey); eye(o.blink ? 'closed' : er, hx + 2 + lx, ey);
  P(hx + lx, hy + 2, NOSE); P(hx + lx - 1, hy + 3, o.mouth || WHISK); P(hx + lx + 1, hy + 3, o.mouth || WHISK);
  ln(hx - 5, hy + 2, hx - 10, hy + 1, WHISK); ln(hx - 5, hy + 3, hx - 10, hy + 4, WHISK);
  ln(hx + 5, hy + 2, hx + 10, hy + 1, WHISK); ln(hx + 5, hy + 3, hx + 10, hy + 4, WHISK);
  if (o.blush) { R(hx - 6 + lx, hy + 1, 2, 1, BLUSH); R(hx + 5 + lx, hy + 1, 2, 1, BLUSH); }
  if (o.glasses) {
    const fr = (x0, y0) => { R(x0, y0, 5, 1, GLASS); R(x0, y0 + 3, 5, 1, GLASS); R(x0, y0, 1, 4, GLASS); R(x0 + 4, y0, 1, 4, GLASS); };
    fr(hx - 5 + lx, ey - 1); fr(hx + 1 + lx, ey - 1); P(hx + lx, ey, GLASS); P(hx - 6 + lx, ey, GLASS); P(hx + 6 + lx, ey, GLASS);
    if (o.reflect) { P(hx - 4 + lx, ey, '#4f7cb0'); P(hx - 2 + lx, ey, '#7fd1b9'); P(hx + 2 + lx, ey, '#4f7cb0'); P(hx + 4 + lx, ey, '#7fd1b9'); }
    if (o.glint != null) { const gi = rd(o.glint * 10); const gx = hx - 4 + lx + gi + (gi > 2 ? 3 : 0); if (gi <= 5) P(gx > hx + 4 + lx ? hx + 4 + lx : gx, ey, '#ffffff'); }
  }
}
function earsUp(hx, hy, c, r, et = 0) {
  tri(hx - r, hy - 1, hx - 1, hy - r + 1, hx - r + 1 - et, hy - r - 5, c);
  tri(hx + 1, hy - r + 1, hx + r, hy - 1, hx + r - 1, hy - r - 5, c);
}
function innerEars(hx, hy, r, et = 0) {
  tri(hx - r + 1, hy - 3, hx - 2, hy - r + 1, hx - r + 1.5 - et, hy - r - 2, EARPK);
  tri(hx + 2, hy - r + 1, hx + r - 1, hy - 3, hx + r - 1.5, hy - r - 2, EARPK);
}

function sitCat(x, y, o) {
  const hx = x + (o.headDX || 0) + (o.sway || 0), hy = y - 20 + (o.headDY || 0), tw = o.tailWave || 0, et = o.earTwitch || 0;
  const pw = o.paws || [0, 0], py = o.pawY != null ? o.pawY : y - 1, tc = o.tailCurl || 0;
  const sil = (c, ox, oy) => {
    tube(x + 5 + ox, y - 3 + oy, x + 15 + ox, y - 1 + oy, x + 14 + tw + ox, y - 13 + oy, 1.1, 1, c);
    if (tc) disc(x + 13 + tw - tc + ox, y - 15 + oy, 1, c);
    ell(x + ox, y - 8 + oy, 7, 8, c); ell(x - 5 + ox, y - 3 + oy, 4, 3, c); ell(x + 5 + ox, y - 3 + oy, 4, 3, c);
    ell(x - 3 + ox, py + pw[0] + oy, 2, 1, c); ell(x + 3 + ox, py + pw[1] + oy, 2, 1, c);
    disc(hx + ox, hy + oy, 6, c); ell(hx + ox, hy + 2 + oy, 7, 3, c); earsUp(hx + ox, hy + oy, c, 6, et);
  };
  for (const [dx, dy, col] of o.rims) sil(col, dx, dy);
  sil(CAT, 0, 0); innerEars(hx, hy, 6, et); face(hx, hy, o);
  return { hx, hy };
}

function lieCat(x, y, o) {
  const b = o.breath || 0, hx = x + 12, hy = y - 8 + (b > .6 ? 1 : 0), tw = o.tailWave || 0, et = o.earTwitch || 0;
  const sil = (c, ox, oy) => {
    tube(x - 10 + ox, y - 3 + oy, x - 21 + ox, y + oy, x - 24 + tw + ox, y - 6 + oy, 1.1, .9, c);
    ell(x + ox, y - 5 + oy, 12, 4.5 + b * .7, c); ell(x - 7 + ox, y - 6 + oy, 5, 4.5 + b * .5, c);
    ell(x + 14 + ox, y - 1 + oy, 4, 1, c);
    disc(hx + ox, hy + oy, 5, c); ell(hx + ox, hy + 2 + oy, 6, 2.5, c); earsUp(hx + ox, hy + oy, c, 5, et);
  };
  for (const [dx, dy, col] of o.rims) sil(col, dx, dy);
  sil(CAT, 0, 0); innerEars(hx, hy, 5, et); face(hx, hy, o);
  return { hx, hy };
}

// Halloween-cat pose: arched back, bottle-brush tail, fur spikes scaled by `puff`
function archCat(x, y, o) {
  const p = o.puff, a = o.arch, jit = o.jit, tb = o.tb || 0, hx = x + 11, hy = y - 14;
  const ay = u => y - 12 - 5 * a * Math.sin(Math.PI * u);
  const br = 3.5 + p * 1.5;
  const sil = (c, ox, oy) => {
    const tr0 = 1.4 + p * 1.6, tr1 = 1.1 + p * 1.3;
    tube(x - 9 + ox, y - 14 + oy, x - 16 + ox, y - 22 + oy, x - 13 + tb + ox, y - 35 + oy, tr0, tr1, c);
    for (const lx of [-9, -6, 5, 8]) R(x + lx + ox, y - 12 + oy, 2, 12, c);
    for (let i = 0; i <= 8; i++) { const u = i / 8; disc(x - 9 + 17 * u + ox, ay(u) + oy, br, c); }
    disc(hx + ox, hy + oy, 5, c); ell(hx + 1 + ox, hy + 2 + oy, 5, 2.5, c);
    tri(hx - 3 + ox, hy - 3 + oy, hx + 1 + ox, hy - 4 + oy, hx - 9 + ox, hy - 7 + oy, c);
    tri(hx + ox, hy - 4 + oy, hx + 4 + ox, hy - 3 + oy, hx - 5 + ox, hy - 9 + oy, c);
    if (p > .05) {
      for (let i = 1; i < 12; i++) {
        const u = i / 12, bx = x - 9 + 17 * u, by = ay(u), d = -5 * a * Math.PI * Math.cos(Math.PI * u), L = Math.hypot(17, d);
        const nx = d / L, ny = -17 / L, tx = 17 / L, ty = d / L, len = br + 1 + p * (2 + jit[i] * 2.2);
        tri(bx + nx * br - tx * 1.7 + ox, by + ny * br - ty * 1.7 + oy, bx + nx * br + tx * 1.7 + ox, by + ny * br + ty * 1.7 + oy, bx + nx * len + ox, by + ny * len + oy, c);
      }
      for (let k = 1; k <= 7; k++) {
        const t = k / 8, cx = qb(x - 9, x - 16, x - 13 + tb, t), cy = qb(y - 14, y - 22, y - 35, t);
        const dx = 2 * (1 - t) * (-7) + 2 * t * (3 + tb), dy = 2 * (1 - t) * (-8) + 2 * t * (-13), L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L, r = lerp(tr0, tr1, t);
        for (const s of [1, -1]) {
          const len = r + 1 + p * (1.5 + jit[(k * 3 + (s > 0 ? 1 : 2)) % 12] * 2);
          tri(cx + s * nx * r - dx / L * 1.4 + ox, cy + s * ny * r - dy / L * 1.4 + oy, cx + s * nx * r + dx / L * 1.4 + ox, cy + s * ny * r + dy / L * 1.4 + oy, cx + s * nx * len + ox, cy + s * ny * len + oy, c);
        }
      }
      for (let i = 0; i < 4; i++) { const bx = x - 6 + i * 4; tri(bx - 1.5 + ox, ay(.2 + i * .2) + br - 1 + oy, bx + 1.5 + ox, ay(.2 + i * .2) + br - 1 + oy, bx + ox, ay(.2 + i * .2) + br + 1 + p * 1.5 + oy, c); }
    }
  };
  for (const [dx, dy, col] of o.rims) sil(col, dx, dy);
  sil(CAT, 0, 0);
  R(hx - 4, hy - 3, 2, 3, EYE); P(hx - 3, hy - 2, CAT);
  R(hx, hy - 3, 3, 3, EYE); P(hx + 1, hy - 2, CAT); P(hx, hy - 3, '#ffffff');
  P(hx + 4, hy, NOSE); R(hx + 2, hy + 2, 2, 2, '#b24a62'); P(hx + 2, hy + 2, '#ffffff');
  ln(hx + 3, hy + 1, hx + 10, hy - 1, WHISK); ln(hx + 3, hy + 2, hx + 10, hy + 3, WHISK);
  return { hx, hy };
}

/* ---------- supporting cast ---------- */
function dog(x, y, o) {
  const TAN = '#d49a5b', LT = '#f1d5a8', DK = '#8b5a32', OUT = '#3a2414';
  tube(x + 6, y - 3, x + 12, y - 4, x + 13 + o.wag * 3, y - 10, 1.5, 1, TAN);
  ell(x, y - 8, 8, 8, TAN); ell(x, y - 7, 4, 6, LT); ell(x - 5, y - 1, 3, 1.5, TAN); ell(x + 5, y - 1, 3, 1.5, TAN);
  ell(x + 1, y - 8, 4, 3, '#b8682e'); P(x + 1, y - 8, OUT); ln(x + 4, y - 10, x + 11, y - 15, '#7a4520'); R(x + 11, y - 17, 2, 2, '#7a4520');
  ell(x - 1, y - 9 + o.strum, 2, 1.5, TAN); ell(x + 9, y - 13, 1.5, 1.5, TAN);
  const hx = x + o.bob, hy = y - 21;
  disc(hx, hy, 7, TAN); ell(hx, hy + 3, 4, 3, LT);
  ell(hx - 7, hy + 1 + (o.bob ? 1 : 0), 2.5, 5, DK); ell(hx + 7, hy + 1 + (o.bob ? 0 : 1), 2.5, 5, DK);
  P(hx - 3, hy - 3, LT); P(hx + 3, hy - 3, LT);
  if (o.happy) { P(hx - 4, hy - 1, OUT); P(hx - 3, hy - 2, OUT); P(hx - 2, hy - 1, OUT); P(hx + 2, hy - 1, OUT); P(hx + 3, hy - 2, OUT); P(hx + 4, hy - 1, OUT); }
  else { R(hx - 3, hy - 2, 1, 2, OUT); R(hx + 3, hy - 2, 1, 2, OUT); }
  R(hx - 1, hy + 1, 3, 2, OUT); P(hx, hy + 3, OUT); R(hx, hy + 4, 2, 2, '#e7708a');
  return { hx, hy };
}
function bunny(x, y, o) {
  const WH = '#efeaf3', SH = '#c7bfd6', PK = '#f0a0b4';
  disc(x - 6, y - 3, 2, WH);
  ell(x, y - 6, 6, 6, WH); ell(x - 3, y - 5, 3, 4, SH);
  ell(x - 3, y, 2.5, 1, WH); ell(x + 3, y, 2.5, 1, WH);
  const ef = o.earFlop;
  ell(x - 3, y - 27, 1.5, 6, WH); ell(x - 3, y - 27, .5, 4, PK);
  ell(x + 3, y - 24, 1.5, 3, WH); ell(x + 6 + ef, y - 28, 3, 1.5, WH); P(x + 6 + ef, y - 28, PK);
  disc(x, y - 16, 5, WH);
  if (o.happy) { P(x - 3, y - 17, '#2a2233'); P(x - 2, y - 18, '#2a2233'); P(x - 1, y - 17, '#2a2233'); P(x + 1, y - 17, '#2a2233'); P(x + 2, y - 18, '#2a2233'); P(x + 3, y - 17, '#2a2233'); }
  else { R(x - 2, y - 18, 1, 2, '#2a2233'); R(x + 2, y - 18, 1, 2, '#2a2233'); }
  P(x, y - 15, PK); P(x - 4, y - 14, '#f6c1cf'); P(x + 4, y - 14, '#f6c1cf');
  ln(x + 4, y - 9, x + 30, y - 12, '#7a5230'); ell(x + 4, y - 9, 1.5, 1, WH);
  if (o.mallow) R(x + 30, y - 14, 3, 3, o.mallow);
}
function bird(x, y) { disc(x, y - 3, 2.5, '#5aa9e6'); R(x - 2, y - 3, 2, 1, '#3b7fc0'); P(x + 3, y - 3, '#f2a33a'); P(x + 1, y - 4, '#1c2333'); P(x, y - 1, '#cfe8fb'); P(x, y, '#f2a33a'); }
function butterfly(x, y, open, c1, c2) {
  R(x, y - 1, 1, 3, '#3a2a3a');
  if (open) { R(x - 2, y - 2, 2, 2, c1); R(x + 1, y - 2, 2, 2, c1); R(x - 2, y, 2, 1, c2); R(x + 1, y, 2, 1, c2); }
  else { R(x - 1, y - 2, 1, 2, c1); R(x + 1, y - 2, 1, 2, c1); }
}
function taxi(x, y, dir) {
  const X = rd(x);
  g.push();
  if (dir < 0) { g.translate(X * 2 + 30, 0); g.scale(-1, 1); }
  const Y = '#f5c518';
  ALPHA = .16; tri(X + 30, y - 7, X + 66, y - 13, X + 66, y + 1, '#fff3c0'); ALPHA = 1;
  R(X, y - 8, 30, 5, Y); R(X, y - 4, 30, 1, '#c99a0c'); R(X + 7, y - 12, 15, 4, Y); R(X + 8, y - 11, 6, 3, '#8fc7de'); R(X + 15, y - 11, 6, 3, '#8fc7de');
  R(X + 12, y - 14, 5, 2, '#fff1a6'); for (let i = 0; i < 30; i += 2) P(X + i, y - 6, '#1b1b1b');
  R(X + 29, y - 7, 1, 2, '#fffbe0'); R(X, y - 7, 1, 2, '#ff4d4d');
  disc(X + 6, y - 2, 2, '#141218'); disc(X + 23, y - 2, 2, '#141218'); P(X + 6, y - 2, '#8a8a99'); P(X + 23, y - 2, '#8a8a99');
  g.pop();
  g._sesFill = ''; // pop() restored the old fill, so drop the cache
}
function fire(x, y, t) {
  R(x - 9, y - 2, 18, 2, '#4a2f1c'); ln(x - 8, y, x + 7, y - 4, '#5e3b22'); ln(x - 7, y - 4, x + 8, y, '#5e3b22');
  for (const [col, s] of [['#d8431f', 1], ['#ff8f2e', .72], ['#ffd25a', .46], ['#fff3b8', .22]])
    for (let i = -3; i <= 3; i++) {
      const fx = x + i * 2.4 * s + Math.sin(t * 4 + i * 2) * 1.2 * s, h = (13 + 5 * Math.sin(t * 8 + i * 1.9) + 3 * Math.sin(t * 13.7 + i * 3.1)) * s * (1 - Math.abs(i) / 4.5), w = 3 * s + 1;
      tri(fx - w, y - 1, fx + w, y - 1, fx + Math.sin(t * 6 + i) * 2 * s, y - 1 - h - 4 * s, col);
    }
  for (let k = -3; k <= 3; k++) { disc(x + k * 4, y + 1 + (k & 1), 1.5, '#5a5664'); P(x + k * 4 - 1, y + (k & 1), '#8a8696'); }
}

/* ---------- backgrounds (rendered once in setup) ---------- */
let cityWins = [];
function genCity() {
  g = mk(); const r = rng(7);
  bands(['#241c45', '#3a2a60', '#6a3a72', '#b5566e', '#ef8a64', '#f7b27a'], 0, 104);
  for (let i = 0; i < 34; i++) P(r() * W | 0, r() * 40 | 0, r() < .3 ? '#fff4d6' : '#8f7fb8');
  disc(36, 22, 6, '#f7e9c6'); P(34, 20, '#e6d3ac'); P(38, 24, '#e6d3ac'); P(35, 25, '#e6d3ac');
  const FAR = '#5a3a72', FW = '#b8737a';
  let fx = -2;
  while (fx < W) {
    const w = 6 + (r() * 12 | 0), h = 18 + (r() * 30 | 0); R(fx, 104 - h, w, h, FAR); if (r() < .3) R(fx + (w >> 1) - 1, 104 - h - 4, 2, 4, FAR);
    for (let yy = 104 - h + 3; yy < 100; yy += 3) for (let xx = fx + 1; xx < fx + w - 1; xx += 2) if (r() < .12) P(xx, yy, FW);
    fx += w + (r() * 3 | 0) - 1;
  }
  // Chrysler-ish spire
  const cx = 64; R(cx - 6, 40, 12, 64, FAR); for (let k = 0; k < 5; k++) ell(cx, 40 - k * 4, (12 - k * 2.4) / 2, 3, FAR); R(cx, 8, 1, 20, FAR);
  for (let k = 0; k < 4; k++) { const w = 10 - k * 2.4; for (let i = -w / 2 + 1; i < w / 2; i += 2) P(cx + i, 38 - k * 4, '#e0a07a'); }
  // Empire-ish stack
  const ex = 196; R(ex - 12, 58, 24, 46, FAR); R(ex - 8, 44, 16, 14, FAR); R(ex - 5, 34, 10, 10, FAR); R(ex - 3, 26, 6, 8, FAR); R(ex - 1, 18, 3, 8, FAR); R(ex, 6, 1, 12, FAR);
  for (let yy = 46; yy < 100; yy += 3) for (let xx = ex - 10; xx <= ex + 10; xx += 3) if (r() < .3) P(xx, yy, FW);
  cityWins = []; let mx = -4;
  while (mx < W) {
    const w = 18 + (r() * 18 | 0), h = 26 + (r() * 34 | 0), top = 104 - h; R(mx, top, w, h, r() < .5 ? '#2b2147' : '#241b3d'); R(mx - 1, top, w + 2, 2, '#1b1430');
    for (let wy = top + 5; wy < 100; wy += 5) for (let wx = mx + 3; wx < mx + w - 3; wx += 4) { const lit = r() < .38; R(wx, wy, 2, 3, lit ? '#ffcf70' : '#3b2f5a'); cityWins.push([wx, wy, lit]); }
    if (r() < .55 && w > 16) { // water tower
      const tx = mx + 3 + (r() * (w - 12) | 0); R(tx, top - 3, 1, 3, '#1b1430'); R(tx + 6, top - 3, 1, 3, '#1b1430'); R(tx, top - 9, 7, 6, '#4a3340');
      R(tx, top - 7, 7, 1, '#2f2230'); R(tx, top - 5, 7, 1, '#2f2230'); tri(tx - 1, top - 9, tx + 8, top - 9, tx + 3.5, top - 13, '#2a1f2c');
    }
    if (r() < .4) { const fx2 = mx + w - 9; for (let yy = top + 6; yy < 98; yy += 8) { R(fx2, yy, 7, 1, '#17112a'); ln(fx2, yy, fx2 + 6, yy + 7, '#17112a'); } }
    mx += w + (r() * 2 | 0);
  }
  // sidewalk, curb, road
  R(0, 104, W, 18, '#6c6480'); R(0, 104, W, 1, '#4d4662'); for (let xx = 8; xx < W; xx += 22) R(xx, 105, 1, 17, '#5d5672');
  for (let i = 0; i < 60; i++) P(r() * W, 106 + r() * 15, '#7a7290');
  R(0, 122, W, 1, '#9a92ad'); R(0, 123, W, 2, '#4a4460'); R(0, 125, W, 19, '#2d2a3b');
  for (let xx = 0; xx < W; xx += 14) R(xx, 137, 7, 1, '#c9b25a');
  ell(70, 141, 5, 1, '#1d1a28'); R(66, 141, 9, 1, '#3a3650');
  // subway entrance
  R(16, 112, 27, 10, '#1a1626'); for (let yy = 114; yy < 122; yy += 2) R(17, yy, 25, 1, '#2a2538');
  R(14, 108, 1, 14, '#2f5a3a'); R(44, 108, 1, 14, '#2f5a3a'); R(14, 108, 31, 1, '#2f5a3a');
  R(14, 103, 1, 6, '#2f5a3a'); R(44, 103, 1, 6, '#2f5a3a'); disc(14, 101, 2, '#5fd18a'); disc(44, 101, 2, '#5fd18a'); P(13, 100, '#c9f5d8'); P(43, 100, '#c9f5d8');
  // hydrant
  R(194, 110, 6, 9, '#c8323c'); R(193, 108, 8, 2, '#a3242f'); R(195, 106, 4, 2, '#c8323c'); R(192, 112, 2, 2, '#a3242f'); R(200, 112, 2, 2, '#a3242f'); R(193, 119, 8, 1, '#7a1a22'); R(195, 110, 1, 8, '#e2565e');
  // streetlight cone + pool
  ALPHA = .32; F('#ffe0a0');
  for (let yy = 61; yy < 121; yy++) {
    const half = 2 + (yy - 61) * .45;
    for (let xx = Math.floor(132 - half); xx <= 132 + half; xx++) { const a = (1 - Math.abs(xx - 132) / half) * .75 * (1 - (yy - 61) / 90); if (bay(xx, yy) < a) g.rect(xx, yy, 1, 1); }
  }
  ALPHA = 1;
  g.tint(255, .55 * 255); g.image(glowE(34, 6, '#ffd98c', 1.5), 132 - 34, 118 - 6); g.noTint();
  R(150, 56, 2, 66, '#1f1a2e'); R(132, 56, 19, 2, '#1f1a2e'); R(128, 57, 9, 3, '#1f1a2e'); R(130, 60, 5, 1, '#fff1b8');
  BG.city = g;
}

let meadowBlades = [], meadowFlowers = [];
function genNature() {
  g = mk(); const r = rng(21);
  bands(['#6fbfef', '#8fd0f2', '#b6e2ef', '#d9f0e6'], 0, 92);
  disc(212, 26, 11, '#ffe98f'); disc(212, 26, 9, '#fff4bd');
  for (let xx = 0; xx < W; xx++) { const h1 = rd(72 + Math.sin(xx * .03) * 5 + Math.sin(xx * .071 + 1) * 3); R(xx, h1, 1, 40, '#a8d2bf'); }
  for (let xx = 0; xx < W; xx++) { const h2 = rd(86 + Math.sin(xx * .045 + 2) * 4 + Math.sin(xx * .11) * 2); R(xx, h2, 1, 30, '#86c09a'); }
  const tree = (tx) => { const ty = rd(86 + Math.sin(tx * .045 + 2) * 4 + Math.sin(tx * .11) * 2); R(tx, ty - 5, 2, 7, '#6a4a35'); disc(tx + 1, ty - 9, 5, '#5fa877'); disc(tx - 3, ty - 7, 4, '#5fa877'); disc(tx + 5, ty - 7, 4, '#5fa877'); disc(tx, ty - 11, 2, '#79bf88'); };
  [18, 30, 96, 176, 236, 248].forEach(tree);
  bands(['#8fd07a', '#7cc46a', '#68b55c', '#5aa652'], 96, H);
  for (let xx = 0; xx < W; xx++) { const t = rd(96 + Math.sin(xx * .09) * 1.2); R(xx, t, 1, 2, '#9ad883'); }
  // pond
  ell(52, 124, 22, 5, '#4e9c6a'); ell(52, 123, 21, 4.5, '#5fb9d6'); ell(52, 122, 18, 3, '#79cde4'); ell(44, 124, 3, 1, '#4f9a5a'); P(45, 123, '#f59ac0');
  for (let i = 0; i < 70; i++) { const fx = r() * W | 0, fy = 100 + (r() * 42 | 0); if (fx > 22 && fx < 82 && fy > 116 && fy < 131) continue; P(fx, fy, ['#ffffff', '#ffd84f', '#f59ac0', '#c79bf0'][i % 4]); if (i % 3 === 0) P(fx, fy + 1, '#4f9a50'); }
  meadowBlades = [];
  for (let i = 0; i < 190; i++) { const bx = r() * W, by = 98 + r() * 46; if (bx > 24 && bx < 80 && by > 117 && by < 130) continue; meadowBlades.push({ x: bx, y: by, h: 2 + r() * 5, c: ['#4f9a50', '#6cbb5e', '#3f8a46'][i % 3] }); }
  meadowBlades.sort((a, b) => a.y - b.y);
  meadowFlowers = []; for (let i = 0; i < 9; i++) meadowFlowers.push({ x: 90 + r() * 160, y: 128 + r() * 14, h: 8 + r() * 5, c: ['#ffd84f', '#f59ac0', '#ffffff', '#c79bf0'][i % 4] });
  BG.nature = g;
}

let screenLines = [];
function genOffice() {
  g = mk(); const r = rng(5);
  R(0, 0, W, 96, '#93a9a6'); for (let xx = 0; xx < W; xx += 8) R(xx, 0, 1, 69, '#8ba29f');
  R(0, 70, W, 26, '#7c918f'); R(0, 69, W, 2, '#e7e0d2'); for (let xx = 10; xx < W; xx += 40) R(xx, 74, 30, 18, '#73888a');
  R(0, 96, W, 48, '#7a5a42'); for (let yy = 100; yy < H; yy += 6) R(0, yy, W, 1, '#6b4d37'); R(0, 95, W, 2, '#e7e0d2');
  // window with skyline
  R(12, 12, 60, 52, '#ece6da');
  for (let yy = 15; yy < 61; yy++) { const f = (yy - 15) / 46; for (let xx = 15; xx < 69; xx++) P(xx, yy, bay(xx, yy) < f ? '#d4ecf3' : '#a9dcf2'); }
  let bx = 15; while (bx < 69) { const w = 4 + (r() * 6 | 0), h = 10 + (r() * 18 | 0); R(bx, 61 - h, Math.min(w, 69 - bx), h, '#a9bfd2'); bx += w; }
  bx = 15;
  while (bx < 69) {
    const w = 5 + (r() * 7 | 0), h = 6 + (r() * 12 | 0); R(bx, 61 - h, Math.min(w, 69 - bx), h, '#8ea8bf');
    for (let yy = 61 - h + 2; yy < 60; yy += 3) for (let xx = bx + 1; xx < Math.min(bx + w, 69) - 1; xx += 2) P(xx, yy, '#c4d6e4'); bx += w;
  }
  R(41, 15, 2, 46, '#ece6da'); R(15, 37, 54, 2, '#ece6da'); R(10, 63, 64, 3, '#ddd5c6');
  // fish poster, clock face, bookshelf
  R(176, 24, 26, 20, '#5b4636'); R(178, 26, 22, 16, '#d9ecf2'); ell(189, 34, 5, 2.5, '#f08a5a'); tri(182, 34, 178, 31, 178, 37, '#f08a5a'); P(192, 33, '#2a2233'); P(186, 32, '#f7b08a');
  disc(132, 30, 8, '#3b3f4a'); disc(132, 30, 7, '#f2efe8'); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; P(132 + Math.cos(a) * 5.6, 30 + Math.sin(a) * 5.6, '#9aa0ad'); }
  R(216, 40, 34, 56, '#6b4a33'); R(218, 42, 30, 52, '#4e3524'); R(216, 58, 34, 2, '#6b4a33'); R(216, 76, 34, 2, '#6b4a33');
  const bookC = ['#c8574a', '#e3a33f', '#4d7bb0', '#6aa36c', '#d9d2c3', '#8a5fa8'];
  for (const sy of [44, 60, 78]) { let bk = 219; while (bk < 246) { const w = 2 + (r() * 2 | 0), h = 10 + (r() * 5 | 0); R(bk, sy + 14 - h + (sy === 78 ? 2 : 0), w, h, bookC[(r() * 6) | 0]); bk += w + (r() < .15 ? 2 : 0); } }
  // chair back, desk, monitor, sticky note, keyboard, mug, plant pot, papers
  R(132, 72, 28, 34, '#3f4f73'); R(133, 71, 26, 1, '#3f4f73'); R(134, 74, 1, 28, '#51648f');
  R(64, 104, 152, 4, '#b8814e'); R(64, 104, 152, 1, '#cf9862'); R(64, 107, 152, 1, '#8e5e36'); R(68, 108, 144, 36, '#9b6b42');
  R(74, 114, 40, 22, '#8e5f39'); R(166, 114, 40, 22, '#8e5f39'); R(90, 124, 8, 2, '#d8b36a'); R(182, 124, 8, 2, '#d8b36a');
  R(84, 66, 40, 26, '#2c3140'); R(86, 68, 36, 21, '#1c2636'); R(102, 92, 4, 10, '#3a4050'); R(96, 102, 16, 2, '#3a4050'); P(104, 90, '#7fd1b9');
  R(118, 63, 6, 6, '#ffe066'); R(119, 65, 4, 1, '#c9a93a');
  R(133, 101, 27, 3, '#dfe2ea'); for (let kx = 134; kx < 159; kx += 2) { P(kx, 101, '#b9bdc9'); P(kx + 1, 102, '#b9bdc9'); }
  R(182, 95, 7, 9, '#e0675a'); R(189, 97, 2, 1, '#e0675a'); R(190, 98, 1, 3, '#e0675a'); R(189, 101, 2, 1, '#e0675a'); R(182, 95, 7, 1, '#f08a7e'); R(183, 95, 5, 1, '#5a3a2a'); R(183, 97, 1, 5, '#ee8a7d');
  R(68, 96, 10, 8, '#c9744f'); R(67, 95, 12, 2, '#b5633f');
  R(196, 101, 14, 3, '#f3efe6'); R(197, 100, 12, 1, '#e4dfd3');
  screenLines = []; for (let i = 0; i < 60; i++) screenLines.push({ w: 6 + (r() * 24 | 0), ind: (r() * 3 | 0) * 3, c: ['#7fd1b9', '#f2c76b', '#9db4ff', '#e08aa0', '#c9d2e2'][(r() * 5) | 0] });
  BG.office = g;
}

let friendStars = [];
function genFriends() {
  g = mk(); const r = rng(11);
  bands(['#0d1130', '#161c46', '#22265a', '#33306a', '#463a70'], 0, 96);
  friendStars = []; for (let i = 0; i < 60; i++) { const s = { x: r() * W | 0, y: r() * 70 | 0, p: r() * 6.28, v: .8 + r() * 2 }; friendStars.push(s); P(s.x, s.y, '#5d5f9a'); }
  disc(214, 22, 6, '#efe2c0'); P(212, 20, '#d8c9a2'); P(216, 24, '#d8c9a2'); P(215, 19, '#d8c9a2');
  for (let xx = 0; xx < W; xx++) { const h = rd(82 + Math.sin(xx * .08) * 3 + Math.sin(xx * .23) * 2); R(xx, h, 1, 20, '#1c2445'); }
  const pine = (px, py, s, col) => { R(px - 1, py - 2, 2, 4, '#140f12'); for (let k = 0; k < 4; k++) { const w = (6 - k * 1.3) * s, yb = py - 2 - k * 5 * s; tri(px - w, yb, px + w, yb, px, yb - 7 * s, col); } };
  [[6, 98, 1.4], [22, 96, 1.1], [38, 97, .9], [232, 98, 1.3], [248, 96, 1.1], [218, 97, .85], [60, 93, .7], [180, 93, .7]].forEach(([a, b, s]) => pine(a, b, s, '#121a2a'));
  bands(['#1f2c22', '#22311f', '#1a2619'], 96, H);
  for (let i = 0; i < 80; i++) P(r() * W, 98 + r() * 44, '#2d4229');
  // log bench
  R(72, 112, 100, 8, '#6e4627'); R(72, 112, 100, 1, '#9a6a3d'); for (let i = 0; i < 14; i++) R(78 + i * 7, 114 + (i % 3), 4, 1, '#57361d');
  ell(72, 116, 3, 4, '#b3814f'); ell(72, 116, 1.5, 2, '#8a5c34'); P(72, 116, '#b3814f');
  BG.friends = g;
}

/* ---------- scenes ---------- */
const scenes = [
  { // Midtown: taxis, honks, steam — Sesame puffs up when a car gets close
    s: { cars: [], spawn: .6, steam: [], steamT: 0, puff: .6, nearS: 0, honks: [] },
    update(dt, t) {
      const S = this.s, rn = Math.random;
      S.spawn -= dt;
      if (S.spawn <= 0) { const dir = rn() < .55 ? 1 : -1; S.cars.push({ x: dir > 0 ? -40 : W + 10, dir, y: dir > 0 ? 135 : 143, v: 120 + rn() * 70, honk: rn() < .65, honked: false }); S.spawn = 1.5 + rn() * 2.4; }
      let near = 0;
      for (const c of S.cars) {
        c.x += c.dir * c.v * dt; const cx = c.x + 15; near = Math.max(near, clamp(1 - Math.abs(cx - 128) / 64, 0, 1));
        if (c.honk && !c.honked && Math.abs(cx - 128) < 40) { c.honked = true; S.honks.push({ x: cx - 8, y: c.y - 22, life: 0 }); }
      }
      S.cars = S.cars.filter(c => c.x > -60 && c.x < W + 60);
      S.nearS += (near - S.nearS) * Math.min(1, dt * 7);
      S.puff += ((.55 + .45 * S.nearS) - S.puff) * Math.min(1, dt * 6);
      S.steamT -= dt; if (S.steamT <= 0) { S.steam.push({ x: 70 + rn() * 6 - 3, y: 139, r: .5, life: 0, ph: rn() * 6 }); S.steamT = .12; }
      for (const p of S.steam) { p.life += dt; p.y -= 11 * dt; p.r += 1.6 * dt; } S.steam = S.steam.filter(p => p.life < 2.6);
      for (const h of S.honks) h.life += dt; S.honks = S.honks.filter(h => h.life < .8);
    },
    draw(t) {
      const S = this.s; g.image(BG.city, 0, 0);
      for (let i = 0; i < cityWins.length; i += 5) { const w = cityWins[i]; if (hash(i * 13 + Math.floor(t * .45 + i * .37)) < .22) R(w[0], w[1], 2, 3, w[2] ? '#3b2f5a' : '#ffcf70'); }
      if (t % 1.6 < .8) P(196, 6, '#ff4a4a');
      // pigeon
      const peck = Math.sin(t * 5) > .6 ? 3 : 0;
      ell(88, 115, 3, 2, '#8a8ca0'); R(85, 114, 2, 1, '#6f7186'); disc(91, 112 + peck, 1.5, '#9a9cb0'); P(92, 112 + peck, '#1c1c26'); P(93, 113 + peck, '#d9a35a'); P(90, 114, '#6fb59a'); P(87, 117, '#d9707a'); P(89, 117, '#d9707a');
      const lift = rd(S.nearS * 2), trem = (S.puff > .78 && (Math.floor(t * 28) & 1)) ? 1 : 0, seed = Math.floor(t * 11);
      const jit = []; for (let i = 0; i < 12; i++) jit.push(hash(seed * 31 + i));
      const h = archCat(124 + trem, 118 - lift, { puff: S.puff, arch: .6 + .4 * S.puff, jit, tb: rd(Math.sin(t * 37) * S.puff * .9), rims: [[0, -1, '#7a68a0']] });
      if (S.nearS > .25) { const bx = h.hx + 6, by = h.hy - 22 - rd(Math.abs(Math.sin(t * 12))); R(bx - 2, by - 2, 8, 14, '#2a2040'); R(bx - 1, by - 1, 6, 12, '#fff8e8'); glyph('!', bx + 1, by, '#e0454f', 2); }
      for (const p of S.steam) { ALPHA = .42 * (1 - p.life / 2.6); disc(p.x + Math.sin(p.life * 2 + p.ph) * 2, p.y, p.r, '#ddd6ea'); } ALPHA = 1;
      for (const c of S.cars.slice().sort((a, b) => a.y - b.y)) taxi(c.x, c.y, c.dir);
      for (const hk of S.honks) { const yy = hk.y - rd(hk.life * 6); pixText('HONK', hk.x + 1, yy + 1, '#2a2040'); pixText('HONK', hk.x, yy, '#fff3a0'); }
    }
  },
  { // Meadow: lying in the grass, a butterfly drifts down onto an ear
    s: { hearts: [], heartT: 1.5 },
    update(dt) {
      const S = this.s; S.heartT -= dt;
      if (S.heartT <= 0) { S.hearts.push({ x: 150 + Math.random() * 6, y: 104, life: 0 }); S.heartT = 2.8; }
      for (const h of S.hearts) h.life += dt; S.hearts = S.hearts.filter(h => h.life < 2.4);
    },
    draw(t) {
      const S = this.s; g.image(BG.nature, 0, 0);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * .12, r2 = 15 + Math.sin(t * 2 + k) * 2; ln(212 + Math.cos(a) * 13, 26 + Math.sin(a) * 13, 212 + Math.cos(a) * r2, 26 + Math.sin(a) * r2, '#ffe98f'); }
      const cloud = (x, y) => { R(x - 4, y + 1, 22, 3, '#ffffff'); disc(x, y, 3, '#ffffff'); disc(x + 6, y - 2, 4, '#ffffff'); disc(x + 12, y, 3, '#ffffff'); R(x - 3, y + 4, 20, 1, '#dcedf6'); };
      [[0, 18, 2.2], [110, 36, 1.4], [190, 12, 1.8]].forEach(([x0, y, v]) => cloud(((x0 + t * v) % (W + 44)) - 22, y));
      for (let k = 0; k < 5; k++) P(36 + ((t * 6 + k * 7) % 32), 121 + (k % 2) * 2, '#d4f4fb');
      const wind = Math.sin(t * .6) * .8;
      const cyc = t % 13, w = ss(7, 8.6, cyc) - ss(11, 12.4, cyc);
      const breath = (Math.sin(t * 1.5) + 1) / 2;
      for (const b of meadowBlades) { if (b.y >= 124) break; const sw = rd(Math.sin(t * 1.7 + b.x * .08) * b.h * .25 + wind); ln(b.x, b.y, b.x + sw, b.y - b.h, b.c); }
      const look = ss(8.8, 9.3, cyc) - ss(10.2, 10.7, cyc) > .5;
      const h = lieCat(136, 124, { breath, tailWave: rd(Math.sin(t * .9) * 2), earTwitch: (w > .95 && Math.sin(t * 9) > .7) ? 1 : 0, eyes: look ? ['content', 'open'] : 'content', blush: true, mouth: '#7d72a0', rims: [[0, -1, '#6c6690'], [1, 0, '#4d4868']] });
      const px = 150 + Math.sin(t * .7) * 58 + Math.sin(t * 1.3) * 14, py = 78 + Math.sin(t * 1.1) * 12 + Math.cos(t * 2.3) * 4;
      const bx = lerp(px, h.hx + 4, w), by = lerp(py, h.hy - 12, w);
      butterfly(bx, by, w > .97 ? Math.sin(t * 3) > .3 : Math.sin(t * 22) > 0, '#f28fb4', '#f7c6d9');
      butterfly(90 + Math.sin(t * .9 + 2) * 40, 70 + Math.sin(t * 1.7) * 10, Math.sin(t * 20 + 1) > 0, '#ffd84f', '#fff0a8');
      for (const b of meadowBlades) { if (b.y < 124) continue; const sw = rd(Math.sin(t * 1.7 + b.x * .08) * b.h * .25 + wind); ln(b.x, b.y, b.x + sw, b.y - b.h, b.c); }
      for (const f of meadowFlowers) { const sw = rd(Math.sin(t * 1.5 + f.x * .1) * 1.5 + wind); ln(f.x, f.y, f.x + sw, f.y - f.h, '#4f9a50'); disc(f.x + sw, f.y - f.h, 1, f.c); P(f.x + sw, f.y - f.h, '#f7b733'); }
      for (const hr of S.hearts) { ALPHA = 1 - hr.life / 2.4; glyph('heart', hr.x + rd(Math.sin(hr.life * 3) * 2), hr.y - rd(hr.life * 10), '#f07a9a'); } ALPHA = 1;
    }
  },
  { // Office: glasses on, typing, then a slow blink
    s: {}, update() { },
    draw(t) {
      g.image(BG.office, 0, 0);
      // clouds drifting behind the upper window panes, clipped to x 15..69
      const Rc = (x, y, w, h, c) => { x = rd(x); const a = Math.max(x, 15), b = Math.min(x + w, 69); if (b > a) R(a, y, b - a, h, c); };
      for (let k = 0; k < 3; k++) { const x = ((t * 3 + k * 31) % 84) - 12 + 15; Rc(x, 19 + k * 5, 10, 2, '#ffffff'); Rc(x + 2, 18 + k * 5, 5, 1, '#ffffff'); }
      R(41, 15, 2, 22, '#ece6da');
      const ma = t * Math.PI * 2 / 60 - Math.PI / 2, ha = t * Math.PI * 2 / 720 - Math.PI / 2 + 1.2;
      ln(132, 30, 132 + Math.cos(ma) * 5, 30 + Math.sin(ma) * 5, '#3b3f4a'); ln(132, 30, 132 + Math.cos(ha) * 3.4, 30 + Math.sin(ha) * 3.4, '#c8574a'); P(132, 30, '#3b3f4a');
      const cyc = t % 7, typing = cyc < 4.2, round = Math.floor(t / 7);
      const typed = (round * 4.2 + Math.min(cyc, 4.2)) * 2.4, n = Math.floor(typed), frac = typed - n;
      for (let j = 0; j < 6; j++) {
        const idx = n - 5 + j; if (idx < 0) continue; const L = screenLines[idx % screenLines.length]; let w = L.w; if (j === 5) w = Math.max(1, rd(L.w * frac));
        R(88 + L.ind, 70 + j * 3, Math.min(w, 32 - L.ind), 1, L.c); if (j === 5 && (typing || t % 1 < .5)) R(88 + L.ind + Math.min(w, 32 - L.ind) + 1, 69 + j * 3, 1, 2, '#ffffff');
      }
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .45 + Math.sin(t * 1.2 + k) * .06, L = 7 + (k % 2) * 3; const ex = 73 + Math.cos(a) * L, ey = 95 + Math.sin(a) * L; ln(73, 95, ex, ey, '#4f9a62'); disc(ex, ey, 1, k % 2 ? '#6cb877' : '#58a86a'); }
      const k = Math.floor(t * 9) & 1;
      const look = typing ? -1 : 0, blink = (cyc > 4.95 && cyc < 5.35) || (cyc > 2.1 && cyc < 2.22);
      const gl = cyc > 5.7 && cyc < 6.1 ? (cyc - 5.7) / .4 : null;
      sitCat(146, 104, {
        headDX: typing ? -1 : 0, lookX: look, eyes: typing ? 'half' : 'open', blink, glasses: true, reflect: typing && k, glint: gl,
        paws: typing ? [k ? -1 : 0, k ? 0 : -1] : [0, 0], pawY: 101, tailWave: rd(Math.sin(t * .8) * 1.5), tailCurl: 1, rims: [[0, -1, '#5d5b78']]
      });
      for (let i = 0; i < 4; i++) { const ph = (t * .45 + i / 4) % 1; ALPHA = .6 * (1 - ph); P(185 + rd(Math.sin(ph * 7 + i) * 1.5), 93 - rd(ph * 14), '#ffffff'); } ALPHA = 1;
      if (cyc > 4.2 && cyc < 5.6) { const p = (cyc - 4.2) / 1.4; ALPHA = 1 - ss(.7, 1, p); glyph('check', 100, 56 - rd(ss(0, .4, p) * 5), '#4fbf7a', 2); ALPHA = 1; }
    }
  },
  { // Campfire: dog on ukulele, bunny toasting a marshmallow, bird keeping time
    s: { notes: [], noteT: 0, sparks: [], sparkT: 0, hearts: [] },
    update(dt) {
      const S = this.s, rn = Math.random;
      S.noteT -= dt; if (S.noteT <= 0) { S.notes.push({ x: 100 + rn() * 6, y: 96, life: 0, c: ['#f4d35e', '#f28fb4', '#9db4ff'][(rn() * 3) | 0] }); S.noteT = .75; }
      for (const n of S.notes) n.life += dt; S.notes = S.notes.filter(n => n.life < 2.6);
      S.sparkT -= dt; if (S.sparkT <= 0) { S.sparks.push({ x: 202 + rn() * 8 - 4, y: 110, vx: (rn() - .5) * 8, vy: -18 - rn() * 16, life: 0 }); S.sparkT = .09; }
      for (const p of S.sparks) { p.life += dt; p.x += p.vx * dt + Math.sin(p.life * 6) * .15; p.y += p.vy * dt; } S.sparks = S.sparks.filter(p => p.life < 1.6);
    },
    draw(t) {
      const S = this.s; g.image(BG.friends, 0, 0);
      for (const s of friendStars) if (Math.sin(t * s.v + s.p) > .55) P(s.x, s.y, '#fff6d8');
      const fl = .85 + .15 * Math.sin(t * 9) * Math.sin(t * 5.3);
      g.tint(255, .42 * fl * 255); g.image(fireGlow, 202 - 90, 124 - 40); g.noTint();
      for (let k = 0; k < 9; k++) {
        if (Math.sin(t * 2 + k * 1.3) < .2) continue;
        const fx = 24 + (k * 29) % 210 + Math.sin(t * .6 + k) * 10, fy = 60 + (k * 17) % 34 + Math.sin(t * .9 + k * 2) * 6;
        ALPHA = .35; R(fx - 1, fy - 1, 3, 3, '#eaff8a'); ALPHA = 1; P(fx, fy, '#f4ffc0');
      }
      const beat = t * Math.PI * 1.6, sway = rd(Math.sin(beat) * 1.4);
      const d = dog(96, 114, { wag: Math.sin(t * 14), strum: Math.floor(t * 3.2) & 1, bob: Math.abs(Math.sin(beat)) > .7 ? 1 : 0, happy: true });
      const ph = (t % 2.6) / 2.6, hop = ph < .16 ? -Math.sin(ph / .16 * Math.PI) * 5 : 0;
      bird(d.hx + 1, d.hy - 6 + rd(hop));
      if (ph < .16) glyph('note', d.hx + 5, d.hy - 14 - rd(ph * 30), '#9db4ff');
      sitCat(126, 114, { sway, eyes: 'happy', blush: true, tailWave: rd(Math.sin(t * 1.6) * 2), tailCurl: 2, mouth: '#c08070', rims: [[1, 0, '#b0603e'], [0, -1, '#4b4a7a']] });
      // marshmallow browns over a 12 s cycle, then the bunny is very pleased
      const m = (t % 12) / 12; let mal = null;
      if (m < .82) { const st = ['#fbf6ee', '#f1d08a', '#c98b3e', '#7a4520'], f = m / .82 * 3, i = Math.min(2, Math.floor(f)); mal = mixHex(st[i], st[i + 1], f - i); }
      else if (S.hearts.length === 0 || S.hearts[S.hearts.length - 1].cycle !== Math.floor(t / 12)) S.hearts.push({ cycle: Math.floor(t / 12), t0: t });
      bunny(156, 114, { earFlop: Math.sin(beat) > 0 ? 1 : 0, happy: m > .82, mallow: mal });
      S.hearts = S.hearts.filter(h => t - h.t0 < 2);
      for (const h of S.hearts) { const a = t - h.t0; ALPHA = 1 - a / 2; glyph('heart', 154, 92 - rd(a * 10), '#f07a9a'); } ALPHA = 1;
      fire(202, 124, t);
      for (const p of S.sparks) { ALPHA = 1 - p.life / 1.6; P(p.x, p.y, p.life < .5 ? '#fff0a0' : '#ff9a48'); } ALPHA = 1;
      for (const n of S.notes) { ALPHA = Math.min(1, (2.6 - n.life) * 1.5); glyph('note', n.x - n.life * 8 + rd(Math.sin(n.life * 3) * 3), n.y - rd(n.life * 14), n.c); } ALPHA = 1;
    }
  }
];

const INFO = [
  { name: 'Midtown', mood: 'On edge', line: 'Rush hour on a Manhattan sidewalk. Every taxi that passes gets taken personally.', ears: 'Pinned flat', tail: 'Bottle-brush, straight up', eyes: 'Wide, pinpoint pupils', fur: 'Standing on end (piloerection)' },
  { name: 'Meadow', mood: 'At ease', line: 'Belly to the sun in the tall grass. A butterfly may land on an ear. That is allowed.', ears: 'Soft, tipped forward', tail: 'Loose, a lazy flick', eyes: 'Closed, one peeks for butterflies', fur: 'Smooth and sun-warm' },
  { name: 'Office', mood: 'Composed', line: 'Glasses on, paws on the keys. Tasks get done, then a slow blink at you.', ears: 'Upright, attentive', tail: 'Still, tip curled', eyes: 'Half-lidded behind the lenses', fur: 'Sleek' },
  { name: 'Campfire', mood: 'Happy', line: 'Night out with the crew: a dog on ukulele, a bunny on marshmallow duty, a bird keeping time.', ears: 'Forward, relaxed', tail: 'Up, with a hook at the tip', eyes: 'Happy squint', fur: 'Smooth, lit by the fire' },
];

/* ---------- page UI (p5 DOM) ---------- */
const CSS = `
body{margin:0;background:#15111d;color:#f1eaf6;font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1072px;margin:0 auto;padding:24px 16px 40px;display:grid;gap:18px}
.head h1{font:700 44px/1 ui-monospace,Menlo,monospace;margin:0}.head h1 span{color:#f4d35e}
.head p{margin:6px 0 0;color:#a597bd}
.cabinet{background:#0b0910;padding:10px;box-shadow:0 0 0 4px #3a2f4f}
.screen{display:flex;justify-content:center;background:#000}
.screen canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.cap{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline;padding:12px 4px 2px}
.cap h2{font:500 22px ui-monospace,Menlo,monospace;margin:0;color:#f4d35e}.cap p{margin:0;flex:1 1 320px}
.below{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:760px){.below{grid-template-columns:minmax(0,1fr)}}
.tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.tab{appearance:none;border:0;cursor:pointer;text-align:left;color:#f1eaf6;background:#211a2d;padding:12px 14px;font:inherit;box-shadow:inset 0 0 0 2px #3a2f4f}
.tab b{display:block;font:500 17px ui-monospace,Menlo,monospace}.tab small{color:#a597bd}
.tab[aria-selected="true"]{box-shadow:inset 0 0 0 2px #f4d35e}
.tab:focus-visible,.tour button:focus-visible{outline:3px solid #f4d35e;outline-offset:3px}
.readout{background:#211a2d;box-shadow:inset 0 0 0 2px #3a2f4f;padding:14px 16px;display:grid;gap:10px}
.readout dl{margin:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 16px}
.readout dt{font:12px ui-monospace,Menlo,monospace;color:#a597bd;padding-top:2px}.readout dd{margin:0}
.tour{display:flex;align-items:center;gap:12px;border-top:2px solid #3a2f4f;padding-top:10px}
.tour button{appearance:none;border:0;cursor:pointer;font:12px ui-monospace,Menlo,monospace;color:#15111d;background:#f4d35e;padding:6px 10px}
.tour button[aria-pressed="false"]{background:#15111d;color:#f1eaf6;box-shadow:inset 0 0 0 2px #3a2f4f}
.segs{display:flex;gap:3px;flex:1}.segs i{flex:1;height:8px;background:#3a2f4f}.segs i.on{background:#e89aa8}
.hint{font-size:13px;color:#a597bd;margin:0}
`;
const SEGN = 9;
const ui = {};
let cnv;

function buildUI() {
  createElement('style', CSS);
  const wrap = createDiv().addClass('wrap');
  createDiv('<h1>Sesame<span>.</span></h1><p>A small black cat whose fur tells you exactly how it feels about where it is.</p>').addClass('head').parent(wrap);
  const cab = createDiv().addClass('cabinet').parent(wrap);
  ui.screen = createDiv().addClass('screen').parent(cab);
  cnv.parent(ui.screen);
  const cap = createDiv().addClass('cap').attribute('aria-live', 'polite').parent(cab);
  ui.name = createElement('h2').parent(cap);
  ui.line = createP().parent(cap);
  const below = createDiv().addClass('below').parent(wrap);
  const tabs = createDiv().addClass('tabs').attribute('role', 'tablist').parent(below);
  ui.tabs = INFO.map((s, i) => {
    const b = createButton(`<b>${i + 1} · ${s.name}</b><small>${s.mood}</small>`).addClass('tab').attribute('role', 'tab').parent(tabs);
    b.mousePressed(() => go(i));
    return b;
  });
  const ro = createDiv().addClass('readout').parent(below);
  const dl = createElement('dl').parent(ro);
  for (const k of ['ears', 'tail', 'eyes', 'fur']) {
    createElement('dt', k[0].toUpperCase() + k.slice(1)).parent(dl);
    ui[k] = createElement('dd').parent(dl);
  }
  const tourRow = createDiv().addClass('tour').parent(ro);
  ui.tourBtn = createButton('Tour on').parent(tourRow);
  ui.tourBtn.mousePressed(() => { tour = !tour; sceneStart = now; setUI(); });
  const segs = createDiv().addClass('segs').parent(tourRow);
  ui.segs = []; for (let i = 0; i < SEGN; i++) ui.segs.push(createElement('i').parent(segs));
  createP('Keys 1–4 or ←/→ switch scenes. Space pauses the tour.').addClass('hint').parent(ro);
}

let cur = 0, prev = -1, trans = 1, sceneStart = 0, tour = !RM, now = 0, segOn = -1;
function setUI() {
  const s = INFO[cur];
  ui.name.html(s.name); ui.line.html(s.line);
  ui.ears.html(s.ears); ui.tail.html(s.tail); ui.eyes.html(s.eyes); ui.fur.html(s.fur);
  ui.tabs.forEach((b, i) => b.attribute('aria-selected', i === cur ? 'true' : 'false'));
  ui.tourBtn.attribute('aria-pressed', tour ? 'true' : 'false'); ui.tourBtn.html(tour ? 'Tour on' : 'Tour off');
}
function go(i) {
  i = (i + INFO.length) % INFO.length; if (i === cur) return;
  prev = cur; cur = i; trans = RM ? 1 : 0; sceneStart = now; setUI();
}
// Integer upscale when there's room; otherwise fit the width
function fitCanvas() {
  if (!ui.screen) return; // resize can fire before setup() has built the page
  const avail = ui.screen.elt.clientWidth;
  const s = Math.min(Math.floor(avail / W), Math.max(1, Math.floor((windowHeight - 160) / H)));
  if (s >= 2) { cnv.style('width', W * s + 'px'); cnv.style('height', H * s + 'px'); }
  else { cnv.style('width', '100%'); cnv.style('height', 'auto'); }
}

/* ---------- p5 lifecycle ---------- */
function setup() {
  pixelDensity(1);
  cnv = createCanvas(W, H);
  noSmooth();
  frameRate(60);
  buildUI();
  genCity(); genNature(); genOffice(); genFriends();
  fireGlow = glowE(90, 40, '#ff9a48', 1.6);
  bufA = mk(); bufB = mk();
  THR = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) THR[y * W + x] = bay(x >> 2, y >> 2) * .55 + (x / W) * .45;
  setUI(); fitCanvas();
}

function draw() {
  now = millis() / 1000;
  const dt = Math.min(.05, deltaTime / 1000), t = now;
  scenes[cur].update(dt, t); if (trans < 1 && prev >= 0) scenes[prev].update(dt, t);
  if (tour && now - sceneStart > DWELL) go(cur + 1);

  if (trans < 1 && prev >= 0) {
    // pixel dissolve: Bayer threshold (4×4 blocks) plus a left-to-right sweep
    trans = Math.min(1, trans + dt / TRANS_DUR);
    g = bufA; scenes[prev].draw(t);
    g = bufB; scenes[cur].draw(t);
    const p = ss(0, 1, trans);
    bufA.loadPixels(); bufB.loadPixels();
    const a = bufA.pixels, b = bufB.pixels;
    for (let i = 0; i < W * H; i++) if (p > THR[i]) { const j = i * 4; a[j] = b[j]; a[j + 1] = b[j + 1]; a[j + 2] = b[j + 2]; }
    bufA.updatePixels();
    image(bufA, 0, 0);
  } else {
    g = bufB; scenes[cur].draw(t);
    image(bufB, 0, 0);
  }

  const fillN = tour ? Math.floor(clamp((now - sceneStart) / DWELL, 0, 1) * SEGN) : 0;
  if (fillN !== segOn) { segOn = fillN; ui.segs.forEach((el, i) => i < fillN ? el.addClass('on') : el.removeClass('on')); }
}

function keyPressed() {
  if (key >= '1' && key <= '4') { go(+key - 1); return false; }
  if (keyCode === RIGHT_ARROW) { go(cur + 1); return false; }
  if (keyCode === LEFT_ARROW) { go(cur - 1); return false; }
  if (key === ' ' && document.activeElement.tagName !== 'BUTTON') { tour = !tour; sceneStart = now; setUI(); return false; }
}

function windowResized() { fitCanvas(); }
