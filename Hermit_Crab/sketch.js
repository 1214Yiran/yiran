// =====================================================
//  Hermit Crab's Dinner —— One Button Game（鼠标点击）
//  点击画面任意位置：寄居蟹伸出钳子去那里抓
//  小虾 +9 能量，小鱼 +20 能量
//  鲨鱼会追着钳子咬：-25 能量，钳子被弹回
//  能量会一直减少，耗尽就结束
// =====================================================

const W = 960, H = 640;          // 逻辑画布尺寸（会自动缩放到窗口）
let S = 1;                        // 缩放比例
let mx = W / 2, my = H / 2;       // 换算后的鼠标位置

// 预先画好的图层（只画一次，让游戏更流畅）
let bgLayer, shellImg, fishImg, shrimpImg, sharkImg, sharkOpenImg;
let crabBodyImg, crabLegImg, eyeImg, lidImg, pincerImg;
let eelSegImg, eelHeadImg, eelOpenImg, fgImg;
let rays = [], snow = [], fgBlades = [];
let eel = null;
let hidden = false, hideT = 0, emergeT = 0;   // 被咬后躲进壳里
const FONT = 'Fraunces';
// 文字颜色：淡蓝色
const TEXT_BLUE = [196, 230, 255];   // 标题、主要文字
const TEXT_SOFT = [160, 205, 245];   // 副标题、说明
const TEXT_DIM = [125, 170, 220];    // 小字

// 海鳗躲在沙子里：只在顶层用普通数字，p5 的 PI 等常量要等 setup 之后才能用
const EEL_MIN_GAP = 110;   // 海鳗不会躲在寄居蟹肩膀正下方附近
const CRAB_PURPLE = [168, 112, 214];

let state = 'start';              // 'start' | 'play' | 'over'
let T = 0;                        // 全局时间（秒）
let energy, catches, elapsed, overT = 0, best = 0;
let sharks = [], prey = [], fx = [], ambient = [], glowLines = [], fronds = [];
let spawnTimer = 0, shake = 0, stun = 0, happyT = 0;
let armPts = [];

const CRAB = { x: W / 2 + 10, y: H - 92 };
const SHOULDER = { x: CRAB.x - 76, y: CRAB.y + 6 };
const REST = 30;                  // 钳子收起时的长度
const MAX_REACH = 640;            // 钳子最远能伸多长

const ENERGY_SHRIMP = 9;
const ENERGY_FISH = 20;
const BITE_DAMAGE = 25;

let claw;

// ---------------- 初始化 ----------------
function setup() {
  S = calcScale();
  createCanvas(W * S, H * S);
  frameRate(60);
  noCursor();
  textFont(FONT);
  if (!document.querySelector('link[href*="Fraunces"]')) {      // 自动加载字体（p5 编辑器里不需要改 index.html）
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap';
    document.head.appendChild(l);
  }
  if (document.fonts) {
    for (const f of ['300 20px Fraunces', 'italic 300 20px Fraunces']) document.fonts.load(f);
  }

  bgLayer = makeBackground();
  fgImg = makeForeground();
  shellImg = makeShell();
  fishImg = makeFish();
  shrimpImg = makeShrimp();
  sharkImg = makeShark(false);
  sharkOpenImg = makeShark(true);
  crabBodyImg = makeCrabBody();
  crabLegImg = makeCrabLeg();
  eyeImg = makeEye([255, 255, 255]);
  lidImg = makeEye(CRAB_PURPLE);
  pincerImg = makePincer();
  eelSegImg = makeEelSeg();
  eelHeadImg = makeEelHead(false);
  eelOpenImg = makeEelHead(true);

  // 水流的细线
  const lineCols = [[90, 230, 170], [70, 200, 235], [150, 220, 255]];
  for (let i = 0; i < 5; i++) {
    glowLines.push({
      y: random(80, H - 260), amp: random(10, 26), freq: random(0.004, 0.009),
      sp: random(0.3, 0.7) * (random() < 0.5 ? 1 : -1), ph: random(TWO_PI),
      col: random(lineCols)
    });
  }
  // 从水面照下来的光
  for (let i = 0; i < 5; i++) {
    rays.push({ x: random(60, W - 60), w: random(50, 120), skew: random(60, 170), a: random(0.035, 0.075), ph: random(TWO_PI) });
  }
  // 海雪（慢慢往下飘的小颗粒）
  for (let i = 0; i < 70; i++) snow.push({ x: random(W), y: random(H), v: random(5, 13), r: random(1, 2.3), a: random(50, 120), ph: random(TWO_PI) });
  for (let i = 0; i < 30; i++) ambient.push(newAmbient(random(H)));
  for (let i = 0; i < 10; i++) {
    const left = i < 5;
    fronds.push({
      x: left ? random(150, 260) : random(W - 330, W - 160),
      h: random(130, 250), ph: random(TWO_PI),
      col: random([[50, 170, 120], [40, 140, 190], [70, 200, 170], [60, 110, 210]])
    });
  }
  // 前景的深色海草剪影
  for (const x of [18, 46, 92, W - 30, W - 64]) fgBlades.push({ x, h: random(110, 190), ph: random(TWO_PI), w: random(9, 14) });

  resetWorld();
}

function calcScale() { return min(windowWidth / W, windowHeight / H); }
function windowResized() { S = calcScale(); resizeCanvas(W * S, H * S); }

function resetWorld() {
  energy = 100; catches = 0; elapsed = 0; stun = 0;
  hidden = false; hideT = 0; emergeT = 0;
  eel = newEel(8);
  sharks = [newShark(state === 'play' ? 2.0 : 0.3)];
  prey = [];
  for (let i = 0; i < 3; i++) { const p = newPrey(); p.x = random(150, W - 150); prey.push(p); }
  spawnTimer = 1.5;
  claw = { state: 'idle', len: REST, tlen: REST, dir: -2.3, carry: null, open: 0.35 };
}

function startGame() {
  state = 'play';
  resetWorld();
}

function endGame() {
  state = 'over';
  overT = 0;
  best = max(best, catches);
  sfxOver();
  if (claw.carry) { claw.carry.caught = false; claw.carry = null; }
  claw.state = 'back';
}

// ---------------- 鼠标：唯一的按键 ----------------
function mousePressed() {
  initAudio();
  updateMouse();
  if (state === 'start') { startGame(); return false; }
  if (state === 'over') { if (overT > 0.8) startGame(); return false; }
  if (claw.state !== 'idle') return false;
  if (hidden) {                       // 躲在壳里：点击就鼓起勇气出来
    if (hideT < 0.45) return false;
    hidden = false;
    emergeT = 0.3;
    sfxEmerge();
  }
  shootClaw();
  return false;
}

function shootClaw() {
  const tx = mx, ty = min(my, SHOULDER.y - 10);
  claw.dir = atan2(ty - SHOULDER.y, tx - SHOULDER.x);
  claw.tlen = constrain(dist(SHOULDER.x, SHOULDER.y, tx, ty), REST + 10, MAX_REACH);
  claw.state = 'out';
  sfxShoot(tx);
}

function updateMouse() {
  mx = constrain(mouseX / S, 0, W);
  my = constrain(mouseY / S, 0, H);
}

// ---------------- 主循环 ----------------
function draw() {
  const dt = min(deltaTime / 1000, 0.05);
  T += dt;
  happyT = max(0, happyT - dt);
  if (AC) {
    bubbleTimer -= dt;
    if (bubbleTimer <= 0) { ambientBubbles(); bubbleTimer = random(0.8, 2.6); }
  }
  updateMouse();

  if (state === 'play') updateGame(dt);
  else {
    if (state === 'over') overT += dt;
    updateWorld(dt);
  }

  push();
  scale(S);
  if (shake > 0) {
    translate(random(-shake, shake), random(-shake, shake));
    shake = max(0, shake - 45 * dt);
  }
  image(bgLayer, 0, 0, W, H);
  drawRays();
  drawGlowLines();
  drawFronds();
  drawSnow(dt);
  drawAmbient(dt);
  for (const p of prey) if (!p.caught) drawPrey(p);
  drawEel();
  drawCrabBody();
  for (const s of sharks) drawShark(s);
  drawArm();
  if (claw.carry) drawPrey(claw.carry);
  drawFx(dt);
  drawForeground();
  drawWarnings();
  drawUI();
  if (state === 'play') drawCursor();
  pop();
}

function updateGame(dt) {
  elapsed += dt;
  stun = max(0, stun - dt);
  if (hidden) hideT += dt;
  emergeT = max(0, emergeT - dt);

  const drain = min(3.4, 2.0 + elapsed * 0.012);   // 越往后饿得越快
  energy -= drain * dt;
  if (energy <= 0) { energy = 0; endGame(); return; }

  const want = elapsed < 15 ? 1 : elapsed < 45 ? 2 : 3;  // 鲨鱼数量逐渐增加
  while (sharks.length < want) sharks.push(newShark(random(1.5, 3)));

  updateWorld(dt);
}

function updateWorld(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    if (prey.length < 5) prey.push(newPrey());
    spawnTimer = random(1.8, 3.2);
  }
  updateClaw(dt);
  armPts = claw.state === 'idle' ? [] : computeArm();
  updatePrey(dt);
  updateSharks(dt);
  if (eel) updateEel(dt);
}

// ---------------- 钳子 ----------------
function tipPos() {
  return { x: SHOULDER.x + cos(claw.dir) * claw.len, y: SHOULDER.y + sin(claw.dir) * claw.len };
}

function updateClaw(dt) {
  const c = claw;
  if (c.state === 'idle') {
    if (state === 'play') {
      const a = atan2(min(my, SHOULDER.y - 10) - SHOULDER.y, mx - SHOULDER.x);
      c.dir = lerpAngle(c.dir, a, 1 - pow(0.002, dt));
    }
    c.open = lerp(c.open, 0.35, 0.15);
  } else if (c.state === 'out') {
    c.len += 1150 * dt;
    c.open = lerp(c.open, 0.8, 0.3);
    const tp = tipPos();
    for (const p of prey) {
      if (!p.caught && dist(tp.x, tp.y, p.x, p.y) < p.r + 16) {
        p.caught = true; c.carry = p; c.state = 'back'; c.open = 0.05;
        sparkle(tp.x, tp.y, p.kind === 'fish' ? 18 : 12);
        sfxCatch(tp.x);
        break;
      }
    }
    if (c.state === 'out' && c.len >= c.tlen) { c.len = c.tlen; c.state = 'back'; }
  } else if (c.state === 'back') {
    const sp = stun > 0 ? 1500 : c.carry ? 720 : 950;
    c.len -= sp * dt;
    if (c.carry) {
      c.open = lerp(c.open, 0.05, 0.4);
      const tp = tipPos();
      c.carry.x = tp.x; c.carry.y = tp.y;
    }
    if (c.len <= REST) {
      c.len = REST; c.state = 'idle';
      if (c.carry) { eat(c.carry); c.carry = null; }
    }
  }
}

function eat(p) {
  const val = p.kind === 'fish' ? ENERGY_FISH : ENERGY_SHRIMP;
  energy = min(100, energy + val);
  catches++;
  happyT = 0.7;
  sfxEat(p.kind);
  prey.splice(prey.indexOf(p), 1);
  if (p.kind === 'fish') hearts(CRAB.x - 30, CRAB.y - 110, 6);   // 吃到小鱼冒小红心
  else sparkle(SHOULDER.x + 12, SHOULDER.y - 18, 7);
}

function hearts(x, y, n) {
  for (let i = 0; i < n; i++) {
    fx.push({ type: 'heart', x: x + random(-22, 22), y: y + random(-8, 8), vx: random(-22, 22), vy: -random(45, 85),
              life: random(1.2, 1.7), max: 1.7, size: random(12, 19), ph: random(TWO_PI) });
  }
}

function computeArm() {
  const tp = tipPos();
  const len = claw.len;
  const n = max(3, floor(len / 13));
  const midx = (SHOULDER.x + tp.x) / 2, midy = (SHOULDER.y + tp.y) / 2;
  const px = -sin(claw.dir), py = cos(claw.dir);
  const bend = min(28, len * 0.08) + sin(T * 3) * min(10, len * 0.03);
  const cx = midx + px * bend, cy = midy + py * bend;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push({
      x: u * u * SHOULDER.x + 2 * u * t * cx + t * t * tp.x,
      y: u * u * SHOULDER.y + 2 * u * t * cy + t * t * tp.y
    });
  }
  return pts;
}

// ---------------- 鲨鱼 ----------------
function newShark(wait) {
  const dir = random() < 0.5 ? 1 : -1;
  const sp = min(240, 135 + elapsed * 0.9) * random(0.9, 1.15);
  const by = random(110, H - 260);
  return { x: dir > 0 ? -170 : W + 170, y: by, baseY: by, dir, speed: sp,
           phase: random(TWO_PI), wait, mouth: 0, cool: 0, dash: 1, turned: false, warned: false };
}

function respawnShark(s) {
  Object.assign(s, newShark(random(0.7, 1.8)));
}

function updateSharks(dt) {
  for (const s of sharks) {
    if (s.wait > 0) {
      s.wait -= dt;
      if (state === 'play' && !s.warned && s.wait < 1.3) { s.warned = true; sfxSonar(s.dir > 0 ? 0 : W); }
      continue;
    }
    s.cool = max(0, s.cool - dt);
    s.mouth = max(0, s.mouth - dt);

    // 发现伸出来的钳子：很快游过去，靠近时猛冲；钳子在身后还会掉头追
    let target = 1;
    if (armPts.length && state !== 'over') {
      let bestP = null, bd = 1e9, behind = null, bb = 1e9;
      for (const p of armPts) {
        const dx = (p.x - s.x) * s.dir;
        const dy = abs(p.y - s.y);
        if (dx > -40 && dx < 450) {
          const d = dy + dx * 0.25;
          if (d < bd) { bd = d; bestP = p; }
        } else if (dx <= -40 && dx > -260 && dy < 140) {
          const d = dy - dx;
          if (d < bb) { bb = d; behind = p; }
        }
      }
      if (bestP) {
        s.baseY += constrain(bestP.y - s.baseY, -1, 1) * 150 * dt;
        if (bd < 170) target = 2.4;
      } else if (behind && !s.turned && s.x > 40 && s.x < W - 40) {
        s.dir *= -1;            // 掉头！
        s.turned = true;
        s.mouth = 0.25;
      }
    }
    s.dash = lerp(s.dash, target, 1 - pow(0.02, dt));
    s.baseY = constrain(s.baseY, 90, H - 250);
    s.x += s.dir * s.speed * s.dash * dt;
    s.y = s.baseY + sin(T * 1.6 + s.phase) * 18;

    if ((s.dir > 0 && s.x > W + 230) || (s.dir < 0 && s.x < -230)) { respawnShark(s); continue; }

    // 咬到钳子？
    if (state === 'play' && armPts.length && s.cool <= 0) {
      for (const p of armPts) {
        const dx = (p.x - s.x) * s.dir - 8, dy = p.y - s.y;
        if ((dx * dx) / (98 * 98) + (dy * dy) / (30 * 30) < 1) { bite(s, p); break; }
      }
    }
  }
}

function bite(s, p) {
  s.mouth = 0.45; s.cool = 1.2;
  if (s.state === 'out' || s.state === 'hold') s.state = 'in';   // 海鳗咬完就缩回沙子里
  sfxBite(p.x);
  energy -= BITE_DAMAGE;
  shake = 10; stun = 0.6;
  burst(p.x, p.y);
  if (claw.carry) {
    const c = claw.carry;
    c.caught = false; c.baseY = c.y; c.dir *= -1; c.speed *= 1.5;
    claw.carry = null;
  }
  claw.state = 'back'; claw.open = 0.9;
  hidden = true; hideT = 0; happyT = 0;      // 吓得躲进壳里
  if (energy <= 0) { energy = 0; endGame(); }
}

// ---------------- 海鳗：躲在沙子里，钳子从它头顶经过就钻出来咬 ----------------
function groundY(x) { return H - 60 + noise(x * 0.01, 5) * 18; }

function newEel(wait) {
  return { state: 'hidden', t: wait, x: 0, y: 0, ang: -HALF_PI, len: 0, reach: 0, cool: 0, mouth: 0, pts: [], lurkLeft: 0, look: 0 };
}

function pickEelSpot() {
  for (let i = 0; i < 40; i++) {
    const x = random(70, W - 70);
    if (abs(x - SHOULDER.x) > EEL_MIN_GAP && abs(x - CRAB.x) > EEL_MIN_GAP) return x;
  }
  return 120;
}

function updateEel(dt) {
  const e = eel;
  e.cool = max(0, e.cool - dt);
  e.mouth = max(0, e.mouth - dt);
  if (e.state === 'hidden') {                  // 完全藏在沙子下面
    if (state !== 'play') return;
    e.t -= dt;
    if (e.t <= 0) {
      e.x = pickEelSpot(); e.y = groundY(e.x) + 4;
      e.state = 'lurk'; e.lurkLeft = random(6, 9);
      sandPuff(e.x, e.y, 8);
      sfxSonar(e.x);
    }
  } else if (e.state === 'lurk') {             // 眼睛从沙子里露出来，盯着上面
    e.lurkLeft -= dt;
    e.look = sin(T * 1.3) * 3;
    if (state === 'play' && armPts.length && e.cool <= 0) {
      let target = null;
      for (const p of armPts) {
        if (abs(p.x - e.x) < 55 && p.y < e.y - 25 && e.y - p.y < 470) {
          if (!target || p.y > target.y) target = p;
        }
      }
      if (target) {                            // 钳子经过头顶：冲出来！
        e.ang = atan2(target.y - 10 - e.y, target.x - e.x);
        e.reach = dist(e.x, e.y, target.x, target.y) + 30;
        e.state = 'out'; e.len = 0; e.mouth = 0.5;
        sandPuff(e.x, e.y, 14);
        sfxLunge(e.x);
      }
    }
    if (e.state === 'lurk' && e.lurkLeft <= 0) {   // 待久了换个地方
      sandPuff(e.x, e.y, 8);
      e.state = 'hidden'; e.t = random(1.2, 2.5);
    }
  } else if (e.state === 'out') {
    e.len += 1300 * dt;
    if (e.len >= e.reach) { e.len = e.reach; e.state = 'hold'; e.t = 0.4; }
  } else if (e.state === 'hold') {
    e.t -= dt;
    if (e.t <= 0) e.state = 'in';
  } else if (e.state === 'in') {
    e.len -= 520 * dt;
    if (e.len <= 0) {
      e.len = 0; e.cool = 1.2;
      if (e.lurkLeft > 0) e.state = 'lurk';
      else { e.state = 'hidden'; e.t = random(1.2, 2.5); }
    }
  }
  e.pts = (e.state === 'out' || e.state === 'hold' || e.state === 'in') ? eelPoints(e) : [];

  // 咬到钳子？
  if (state === 'play' && e.pts.length > 3 && armPts.length && e.mouth >= 0 && e.state !== 'in') {
    for (let i = 2; i < e.pts.length; i += 2) {
      const q = e.pts[i];
      for (const p of armPts) {
        if (abs(p.x - q.x) < 20 && abs(p.y - q.y) < 20) { bite(e, p); return; }
      }
    }
  }
}

function eelPoints(e) {
  const pts = [];
  const ca = cos(e.ang), sa = sin(e.ang);
  const n = max(2, floor(e.len / 6));
  for (let i = 0; i <= n; i++) {
    const d = i / n * e.len;
    const wave = sin(d * 0.045 - T * 9) * min(14, d * 0.12) * (1 - (d / max(1, e.len)) * 0.6);
    pts.push({ x: e.x + ca * d - sa * wave, y: e.y + sa * d + ca * wave });
  }
  return pts;
}

function sandPuff(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = -HALF_PI + random(-1.2, 1.2), sp = random(30, 110);
    fx.push({ type: 'sand', x: x + random(-10, 10), y, vx: cos(a) * sp, vy: sin(a) * sp, life: random(0.5, 0.9), max: 0.9,
              size: random(2, 5), col: random([[200, 186, 150], [170, 160, 140], [140, 150, 170]]) });
  }
}

function drawEel() {
  const e = eel;
  if (!e || e.state === 'hidden') return;
  // 沙子里的洞
  noStroke();
  fill(10, 14, 34);
  ellipse(e.x, e.y + 2, 40, 13);
  if (e.state === 'lurk') {
    // 露出一点点头顶和一对发光的眼睛
    const bob = sin(T * 2) * 1.5;
    fill(255, 240, 200, 40 + sin(T * 3) * 20);       // 淡淡的光晕，好让人注意到
    ellipse(e.x, e.y - 6, 70, 40);
    image(eelSegImg, e.x - 22, e.y - 20 + bob, 44, 44);  // 露出来的头顶
    const blink = (T % 2.8) < 0.1;
    for (const dx of [-9, 9]) {
      fill(255);
      if (blink) rect(e.x + dx - 6, e.y - 8 + bob, 12, 2);
      else {
        circle(e.x + dx, e.y - 8 + bob, 15);
        fill(30, 25, 45);
        circle(e.x + dx + e.look * 0.6, e.y - 10 + bob, 7);
      }
    }
    stroke(60, 34, 90); strokeWeight(2.5); strokeCap(ROUND);   // 凶凶的眉毛
    line(e.x - 16, e.y - 19 + bob, e.x - 4, e.y - 15 + bob);
    line(e.x + 16, e.y - 19 + bob, e.x + 4, e.y - 15 + bob);
    noStroke();
    // 旁边的沙子
    fill(32, 56, 122);
    ellipse(e.x, e.y + 9, 58, 16);                    // 前面的沙子盖住下半截
    return;
  }
  const pts = e.pts;
  if (pts.length < 3) return;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = lerp(22, 30, min(1, i / 6));
    image(eelSegImg, pts[i].x - d / 2, pts[i].y - d / 2, d, d);
  }
  stroke(96, 58, 140); strokeWeight(2); strokeCap(ROUND);
  for (let i = 3; i < pts.length - 4; i += 3) {
    const a = pts[i], b = pts[i + 1];
    let nx = b.y - a.y, ny = -(b.x - a.x);
    const l = max(0.001, sqrt(nx * nx + ny * ny)); nx /= l; ny /= l;
    if (nx < 0) { nx = -nx; ny = -ny; }
    line(a.x + nx * 10, a.y + ny * 10, a.x + nx * 14, a.y + ny * 14);
  }
  noStroke();
  fill(110, 66, 150, 200);
  for (let i = 7; i < pts.length - 6; i += 9) circle(pts[i].x, pts[i].y, 9);
  const a = pts[pts.length - 1], b = pts[pts.length - 3];
  const ang = atan2(a.y - b.y, a.x - b.x);
  push();
  translate(a.x, a.y);
  rotate(ang);
  if (cos(ang) < 0) scale(1, -1);
  const img = e.mouth > 0 ? eelOpenImg : eelHeadImg;
  image(img, -18, -img.height / 2, img.width, img.height);
  pop();
  // 洞口前面的沙子盖住身体根部
  fill(44, 64, 124);
  ellipse(e.x, e.y + 8, 46, 14);
}

function newPrey() {
  const fish = random() < 0.35;
  const dir = random() < 0.5 ? 1 : -1;
  const by = random(90, H - 220);
  return {
    kind: fish ? 'fish' : 'shrimp',
    x: dir > 0 ? -50 : W + 50, y: by, baseY: by, dir,
    speed: fish ? random(85, 125) : random(45, 70),
    phase: random(TWO_PI), caught: false, r: fish ? 30 : 22,
    hop: 0, hopT: random(1, 3)
  };
}

function updatePrey(dt) {
  for (let i = prey.length - 1; i >= 0; i--) {
    const p = prey[i];
    if (p.caught) continue;
    let mul = 1;
    if (p.kind === 'shrimp') {           // 小虾偶尔弹一下，突然加速
      p.hopT -= dt;
      if (p.hopT <= 0) { p.hop = 0.28; p.hopT = random(1.5, 3); }
      if (p.hop > 0) { p.hop -= dt; mul = 3.2; }
    }
    for (const s of sharks) {            // 躲着鲨鱼游
      if (s.wait > 0) continue;
      if (abs(s.x - p.x) < 180 && abs(s.y - p.baseY) < 90) {
        p.baseY += (p.baseY >= s.y ? 1 : -1) * 55 * dt;
      }
    }
    p.baseY = constrain(p.baseY, 80, H - 210);
    p.x += p.dir * p.speed * mul * dt;
    const wob = p.kind === 'fish' ? 14 : 6;
    p.y = p.baseY + sin(T * 2 + p.phase) * wob;
    if ((p.dir > 0 && p.x > W + 70) || (p.dir < 0 && p.x < -70)) prey.splice(i, 1);
  }
}

// ---------------- 绘制：生物 ----------------
function drawPrey(p) {
  push();
  translate(p.x, p.y);
  const img = p.kind === 'fish' ? fishImg : shrimpImg;
  if (p.caught) rotate(sin(T * 25) * 0.25);
  else rotate(sin(T * 6 + p.phase) * 0.06);
  scale(p.dir, 1);
  if (p.kind === 'shrimp' && p.hop > 0) scale(1.12, 0.88);
  image(img, -img.width / 2, -img.height / 2, img.width, img.height);
  pop();
}

function drawShark(s) {
  if (s.wait > 0) return;
  push();
  translate(s.x, s.y);
  scale(s.dir, 1);
  rotate(cos(T * 1.6 + s.phase) * 0.06);
  const img = s.mouth > 0 ? sharkOpenImg : sharkImg;
  image(img, -125, -65, img.width, img.height);
  pop();
}

function drawWarnings() {
  if (state !== 'play') return;
  for (const s of sharks) {
    if (s.wait > 0 && s.wait < 1.3) {
      const a = 120 + sin(T * 14) * 100;
      const x = s.dir > 0 ? 22 : W - 22;
      push();
      translate(x, s.baseY);
      scale(s.dir, 1);
      noFill();
      stroke(240, 180, 160, a);
      strokeWeight(2.5);
      line(-8, -12, 4, 0); line(4, 0, -8, 12);
      line(4, -12, 16, 0); line(16, 0, 4, 12);
      pop();
    }
  }
}

function drawCrabBody() {
  const bx = CRAB.x, by = CRAB.y;
  if (hidden) { drawHiddenCrab(bx, by); return; }
  // 吃到东西时开心地跳一跳，平时轻轻呼吸；刚出壳时从下面钻出来
  const bounce = happyT > 0 ? -abs(sin(happyT * 18)) * 6 : sin(T * 2.5) * 1.2;
  const rise = emergeT > 0 ? (emergeT / 0.3) * 18 : 0;
  push();
  translate(0, bounce);

  push();
  translate(0, rise);
  const legs = [[-74, 18, 0.55], [-56, 24, 0.2], [-6, 24, -0.2], [12, 18, -0.55]];
  for (let i = 0; i < legs.length; i++) {
    const L = legs[i];
    push();
    translate(bx + L[0], by + L[1]);
    rotate(L[2] + sin(T * 4 + i * 1.3) * 0.08);
    image(crabLegImg, -13, -8, 26, 40);
    pop();
  }
  image(crabBodyImg, bx - 30 - 55, by + 6 - 40, 110, 76);
  pop();

  // 粉色的壳
  image(shellImg, bx - 30 - 70, by - 26 - 84, 140, 120);

  // 大眼睛：跟着鼠标看、会眨眼；开心时 ^ ^
  push();
  translate(0, rise);
  const blink = (T % 3.4) < 0.13;
  const eyes = [[bx - 52, by - 4, 36], [bx - 14, by - 6, 40]];
  for (const e of eyes) {
    const [ex, ey, d] = e;
    if (happyT > 0 || blink) {
      image(lidImg, ex - d / 2, ey - d / 2, d, d);
      noFill(); stroke(45, 30, 60); strokeWeight(3); strokeCap(ROUND);
      if (happyT > 0) arc(ex, ey + 4, d * 0.5, d * 0.45, PI, TWO_PI);
      else line(ex - d * 0.28, ey + 2, ex + d * 0.28, ey + 2);
      noStroke();
      continue;
    }
    image(eyeImg, ex - d / 2, ey - d / 2, d, d);
    const a = atan2(my - ey, mx - ex);
    fill(35, 25, 45);
    circle(ex + cos(a) * d * 0.15, ey + sin(a) * d * 0.15, d * 0.36);
  }
  if (happyT > 0) {
    fill(110, 50, 120);
    arc(bx - 34, by + 18, 12, 10, 0, PI, CHORD);
  }
  pop();
  pop();
}

// 被咬之后：整只缩进壳里，只露出伤心的小眼睛
function drawHiddenCrab(bx, by) {
  const tremble = hideT < 0.9 ? sin(T * 45) * 1.8 * (1 - hideT / 0.9) : 0;
  push();
  translate(bx - 30 + tremble, by + 10);
  rotate(sin(T * 1.4) * 0.02);
  noStroke();
  fill(28, 16, 40);
  ellipse(0, 6, 96, 22);                 // 壳口的阴影
  image(shellImg, -70, -26 - 84, 140, 120);
  // 偷偷往外看的小眼睛（往下看）
  for (const ex of [-14, 12]) {
    fill(255);
    ellipse(ex, 10, 16, 13);
    fill(35, 25, 45);
    circle(ex + 1, 12.5, 7);
  }
  // 耷拉下来的眼皮：外侧低、内侧高，看起来很难过
  fill(128, 80, 182);
  quad(-23, 2, -5, 2, -5, 8, -23, 12);
  quad(3, 2, 21, 2, 21, 12, 3, 8);
  stroke(60, 30, 80); strokeWeight(2); strokeCap(ROUND);
  line(-22, 12, -6, 8);
  line(4, 8, 20, 12);
  noStroke();
  // 掉眼泪
  const t = (T % 1.6) / 1.6;
  if (t < 0.85) {
    const ty = 15 + t * 16, ta = 220 * (1 - t / 0.85);
    fill(160, 205, 240, ta);
    circle(-18, ty, 5);
    triangle(-20.3, ty - 1, -15.7, ty - 1, -18, ty - 6);
  }
  if (state === 'play' && hideT > 0.8) {
    textFont(FONT);
    textStyle(ITALIC);
    textSize(15);
    textAlign(CENTER, CENTER);
    drawingContext.shadowColor = 'rgba(0,10,40,0.9)';
    drawingContext.shadowBlur = 10;
    textSize(18);
    fill(TEXT_BLUE[0], TEXT_BLUE[1], TEXT_BLUE[2], 190 + sin(T * 3) * 60);
    text('click to come out', 0, -118);
    drawingContext.shadowBlur = 0;
    textStyle(NORMAL);
  }
  pop();
}

function drawArm() {
  if (hidden && claw.state === 'idle') return;
  const pts = (claw.state === 'idle' || armPts.length < 2) ? computeArm() : armPts;
  const hurt = stun > 0 && floor(T * 20) % 2 === 0;
  noFill();
  strokeCap(ROUND);
  stroke(hurt ? color(255) : color(150, 98, 205)); strokeWeight(11);
  beginShape(); for (const p of pts) vertex(p.x, p.y); endShape();
  stroke(hurt ? color(255) : color(192, 150, 238)); strokeWeight(3);
  beginShape(); for (const p of pts) vertex(p.x - 1, p.y - 2.5); endShape();
  noStroke();
  fill(hurt ? 255 : color(110, 66, 160));
  for (let i = 2; i < pts.length - 1; i += 2) circle(pts[i].x, pts[i].y + 2, 3.5);
  const a = pts[pts.length - 1], b = pts[pts.length - 2];
  drawPincer(a.x, a.y, atan2(a.y - b.y, a.x - b.x), claw.open, 34, hurt);
}

function drawPincer(x, y, ang, open, sz, hurt) {
  push();
  translate(x, y);
  rotate(ang);
  const w = sz * 1.3, h = sz * 0.72;
  for (const s of [-1, 1]) {
    push();
    rotate(s * open);
    scale(1, s);
    if (hurt) tint(255, 200, 200);
    image(pincerImg, -2, -h * 0.85, w, h);
    pop();
  }
  noTint();
  fill(150, 98, 205);
  circle(0, 0, sz * 0.55);
  pop();
}

function drawRays() {
  const ctx = drawingContext;
  noStroke();
  for (const r of rays) {
    const x = r.x + sin(T * 0.15 + r.ph) * 40;
    const a = r.a * (0.75 + 0.25 * sin(T * 0.4 + r.ph));
    const grd = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    grd.addColorStop(0, 'rgba(200,235,255,' + a + ')');
    grd.addColorStop(1, 'rgba(200,235,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(x - r.w * 0.3, 0);
    ctx.lineTo(x + r.w * 0.3, 0);
    ctx.lineTo(x + r.w + r.skew, H * 0.85);
    ctx.lineTo(x - r.w * 0.2 + r.skew, H * 0.85);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGlowLines() {
  noFill();
  for (const g of glowLines) {
    for (const pass of [[6, 16], [1.4, 100]]) {
      stroke(g.col[0], g.col[1], g.col[2], pass[1]);
      strokeWeight(pass[0]);
      beginShape();
      for (let x = -20; x <= W + 20; x += 24) {
        const y = g.y + sin(x * g.freq + T * g.sp + g.ph) * g.amp + sin(x * 0.013 + T * 0.7 + g.ph) * 8;
        vertex(x, y);
      }
      endShape();
    }
  }
}

function drawSnow(dt) {
  noStroke();
  for (const p of snow) {
    p.y += p.v * dt;
    p.x += sin(T * 0.5 + p.ph) * 4 * dt;
    if (p.y > H) { p.y = -5; p.x = random(W); }
    fill(235, 238, 220, p.a);
    circle(p.x, p.y, p.r);
  }
}

function drawForeground() {
  image(fgImg.L, 0, H - 120, 240, 120);
  image(fgImg.R, W - 280, H - 110, 280, 110);
  stroke(6, 16, 44, 245);
  strokeCap(ROUND);
  for (const b of fgBlades) {
    let px = b.x, py = H + 5;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const x = b.x + sin(T * 0.9 + b.ph + t * 2) * t * 22;
      const y = H + 5 - t * b.h;
      strokeWeight(lerp(b.w, 2, t));
      line(px, py, x, y);
      px = x; py = y;
    }
  }
  noStroke();
}

function drawFronds() {
  strokeCap(ROUND);
  for (const f of fronds) {
    let px = f.x, py = H - 40;
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const x = f.x + sin(T * 1.1 + f.ph + t * 2.4) * t * 30;
      const y = H - 40 - t * f.h;
      stroke(f.col[0], f.col[1], f.col[2], 225);
      strokeWeight(lerp(10, 2, t));
      line(px, py, x, y);
      if (i % 2 === 0) {
        noStroke();
        fill(170, 240, 220, 130);
        circle(x + 6, y, 4);
      }
      px = x; py = y;
    }
  }
}

function newAmbient(y) {
  return { x: random(W), y, r: random(2, 9), v: random(8, 30),
           ring: random() < 0.45, ph: random(TWO_PI) };
}

function drawAmbient(dt) {
  for (let i = 0; i < ambient.length; i++) {
    const a = ambient[i];
    a.y -= a.v * dt;
    a.x += sin(T * 0.8 + a.ph) * 6 * dt;
    if (a.y < -10) ambient[i] = newAmbient(H - 50);
    const tw = 0.6 + 0.4 * sin(T * 2 + a.ph);
    if (a.ring) {
      noFill(); stroke(200, 228, 240, 80 * tw); strokeWeight(1.2);
      circle(a.x, a.y, a.r * 2);
    } else {
      noStroke();
      fill(200, 228, 240, 22 * tw); circle(a.x, a.y, a.r * 2.2);
      fill(235, 245, 240, 150 * tw); circle(a.x, a.y, a.r * 0.5);
    }
  }
}

// ---------------- 特效 ----------------
function drawHeart(x, y, s, col) {
  pathShape(drawingContext, col, [
    ['M', x, y + s * 0.55],
    ['C', x - s * 1.0, y - s * 0.1, x - s * 0.5, y - s * 0.85, x, y - s * 0.35],
    ['C', x + s * 0.5, y - s * 0.85, x + s * 1.0, y - s * 0.1, x, y + s * 0.55],
  ]);
}

function sparkle(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI), sp = random(40, 160);
    fx.push({ type: 'spark', x, y, vx: cos(a) * sp, vy: sin(a) * sp, life: random(0.4, 0.8), max: 0.8,
              size: random(2.5, 5), col: random([[255, 240, 215], [255, 214, 196], [214, 232, 245]]) });
  }
}

function burst(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = random(TWO_PI), sp = random(30, 140);
    fx.push({ type: 'bubble', x, y, vx: cos(a) * sp, vy: sin(a) * sp - 40, life: random(0.6, 1.1), max: 1.1,
              size: random(4, 12), col: [200, 235, 255] });
  }
}

function floater(x, y, txt, col) {
  fx.push({ type: 'text', x, y, vx: 0, vy: -40, life: 1.1, max: 1.1, txt, col });
}

function drawFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    f.life -= dt;
    if (f.life <= 0) { fx.splice(i, 1); continue; }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.type === 'rise' || f.type === 'heart') f.x += sin(T * 3 + f.ph) * 12 * dt;
    else if (f.type === 'sand') { f.vx *= 0.94; f.vy += 160 * dt; }
    else { f.vx *= 0.94; f.vy *= 0.94; }
    const a = 255 * f.life / f.max;
    if (f.type === 'spark') {
      noStroke();
      fill(f.col[0], f.col[1], f.col[2], a * 0.3); circle(f.x, f.y, f.size * 3);
      fill(f.col[0], f.col[1], f.col[2], a); circle(f.x, f.y, f.size);
    } else if (f.type === 'sand') {
      noStroke();
      fill(f.col[0], f.col[1], f.col[2], a);
      circle(f.x, f.y, f.size);
    } else if (f.type === 'heart') {
      const k = min(1, (f.max - f.life) / 0.15) * f.size;
      noStroke();
      drawHeart(f.x, f.y, k, [242, 92, 112, a]);
      fill(255, 196, 204, a * 0.8);
      circle(f.x - k * 0.38, f.y - k * 0.38, k * 0.22);
    } else if (f.type === 'rise') {
      noFill(); stroke(f.col[0], f.col[1], f.col[2], min(200, a * 1.5)); strokeWeight(1.4);
      circle(f.x, f.y, f.size);
      noStroke(); fill(255, 255, 255, min(200, a * 1.5));
      circle(f.x - f.size * 0.18, f.y - f.size * 0.18, f.size * 0.25);
    } else if (f.type === 'bubble') {
      noFill(); stroke(f.col[0], f.col[1], f.col[2], a); strokeWeight(1.5);
      circle(f.x, f.y, f.size);
    } else {
      noStroke(); fill(f.col[0], f.col[1], f.col[2], a);
      textAlign(CENTER, CENTER); textSize(22); textStyle(BOLD);
      text(f.txt, f.x, f.y);
      textStyle(NORMAL);
    }
  }
}

// ---------------- 界面 ----------------
function fmtTime(sec) {
  const t = floor(sec);
  return floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
}

function drawUI() {
  const ctx = drawingContext;
  noStroke();
  textFont(FONT);
  if (state === 'play') {
    ctx.shadowColor = 'rgba(0,8,20,0.5)';
    ctx.shadowBlur = 8;
    fill(TEXT_BLUE[0], TEXT_BLUE[1], TEXT_BLUE[2]);
    textStyle(ITALIC); textSize(17); textAlign(LEFT, CENTER);
    text('Energy', 28, 30);
    ctx.shadowBlur = 0;
    fill(255, 255, 255, 30);
    rect(96, 27, 200, 7, 4);
    const low = energy < 30;
    const w = 200 * energy / 100;
    if (low) fill(236, 120, 104, 170 + sin(T * 8) * 80);
    else fill(TEXT_SOFT[0], TEXT_SOFT[1], TEXT_SOFT[2]);
    if (w > 1) rect(96, 27, w, 7, 4);
    ctx.shadowBlur = 8;
    textStyle(NORMAL); textAlign(RIGHT, CENTER); textSize(17);
    fill(TEXT_BLUE[0], TEXT_BLUE[1], TEXT_BLUE[2]);
    text(catches + ' caught   ·   ' + fmtTime(elapsed), W - 28, 30);
    if (muted) { textSize(12); textStyle(ITALIC); fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2], 200); text('sound off · M', W - 28, 52); }
    ctx.shadowBlur = 0;
    textStyle(NORMAL);
  }

  if (state === 'start' || state === 'over') {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(4,14,44,0.45)');
    grd.addColorStop(0.5, 'rgba(4,14,44,0.72)');
    grd.addColorStop(1, 'rgba(4,14,44,0.45)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    textAlign(CENTER, CENTER);
    const cx = W / 2;
    if (state === 'start') {
      fill(TEXT_SOFT[0], TEXT_SOFT[1], TEXT_SOFT[2]); textSize(13);
      ctx.letterSpacing = '4px';
      text('A ONE-BUTTON GAME', cx, 148);
      ctx.letterSpacing = '0px';
      fill(TEXT_BLUE[0], TEXT_BLUE[1], TEXT_BLUE[2]); textStyle(NORMAL); textSize(60);
      text("Hermit Crab's Dinner", cx, 205);
      textStyle(ITALIC); textSize(20); fill(TEXT_SOFT[0], TEXT_SOFT[1], TEXT_SOFT[2]);
      text('a small story from the bottom of the sea', cx, 256);
      stroke(TEXT_SOFT[0], TEXT_SOFT[1], TEXT_SOFT[2], 140); strokeWeight(1);
      line(cx - 40, 292, cx + 40, 292);
      noStroke();
      textStyle(NORMAL); textSize(17); fill(TEXT_SOFT[0], TEXT_SOFT[1], TEXT_SOFT[2]);
      text('Click anywhere to reach out your claw and catch dinner.', cx, 330);
      text('A fish is a feast, a shrimp is a snack.', cx, 358);
      text('Sharks hunt your claw, and an eel hides in the sand: don’t reach over its eyes.', cx, 386);
      text('If you get bitten you’ll hide in your shell. Click when you’re brave enough to come out.', cx, 412);
      fill(TEXT_BLUE[0], TEXT_BLUE[1], TEXT_BLUE[2], 150 + sin(T * 3) * 100);
      textStyle(ITALIC); textSize(22);
      text('Click to begin', cx, 482);
      textStyle(NORMAL); textSize(11); fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2]);
      ctx.letterSpacing = '2px';
      text('SOUND ON  ·  PRESS M TO MUTE', cx, 522);
      ctx.letterSpacing = '0px';
    } else {
      fill(TEXT_SOFT[0], TEXT_SOFT[1], TEXT_SOFT[2]); textSize(13);
      ctx.letterSpacing = '4px';
      text('THE TIDE GOES QUIET', cx, 200);
      ctx.letterSpacing = '0px';
      fill(TEXT_BLUE[0], TEXT_BLUE[1], TEXT_BLUE[2]); textStyle(NORMAL); textSize(52);
      text('Out of energy', cx, 252);
      textStyle(ITALIC); textSize(20); fill(TEXT_SOFT[0], TEXT_SOFT[1], TEXT_SOFT[2]);
      text('You lasted ' + fmtTime(elapsed) + ' and caught ' + catches + (catches === 1 ? ' snack.' : ' snacks.'), cx, 306);
      textStyle(NORMAL); textSize(15); fill(TEXT_DIM[0], TEXT_DIM[1], TEXT_DIM[2]);
      text('Best  ' + best, cx, 340);
      if (overT > 0.8) {
        fill(TEXT_BLUE[0], TEXT_BLUE[1], TEXT_BLUE[2], 150 + sin(T * 3) * 100);
        textStyle(ITALIC); textSize(22);
        text('Click to try again', cx, 412);
      }
    }
    textStyle(NORMAL);
  }
}

function drawCursor() {
  const busy = claw.state !== 'idle';
  const a = busy ? 80 : 210;
  push();
  translate(mx, my);
  noFill();
  stroke(246, 234, 212, a);
  strokeWeight(1.4);
  circle(0, 0, 24);
  stroke(246, 234, 212, a * 0.6);
  for (let i = 0; i < 4; i++) {
    const ang = i * HALF_PI + T * 0.6;
    line(cos(ang) * 15, sin(ang) * 15, cos(ang) * 19, sin(ang) * 19);
  }
  noStroke();
  fill(246, 234, 212, a);
  circle(0, 0, 3.5);
  pop();
}

function lerpAngle(a, b, t) {
  const d = ((b - a + PI * 3) % TWO_PI) - PI;
  return a + d * t;
}


// =====================================================
//  声音：全部用 Web Audio 实时合成，不需要音频文件
//  只有温柔的泡泡声；第一次点击后开始播放（浏览器规定要有用户操作）
//  按 M 键静音 / 打开声音
// =====================================================
let AC = null, master = null, fxIn = null, noiseBuf = null, muted = false;
let bubbleTimer = 1;

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }

  // 总输出：柔和的低通，让所有声音都圆润不刺耳
  master = AC.createGain();
  master.gain.value = 0.9;
  const soft = AC.createBiquadFilter();
  soft.type = 'lowpass'; soft.frequency.value = 2600;
  master.connect(soft); soft.connect(AC.destination);

  // 所有声音先进入 fxIn：一部分直接输出，一部分进回声，听起来空灵一点
  fxIn = AC.createGain();
  fxIn.connect(master);
  const delay = AC.createDelay(1.0);
  delay.delayTime.value = 0.3;
  const fb = AC.createGain(); fb.gain.value = 0.32;
  const wetLp = AC.createBiquadFilter();
  wetLp.type = 'lowpass'; wetLp.frequency.value = 1400;
  const wet = AC.createGain(); wet.gain.value = 0.3;
  fxIn.connect(delay); delay.connect(wetLp); wetLp.connect(fb); fb.connect(delay);
  wetLp.connect(wet); wet.connect(master);

  noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.2, AC.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
}

function audioOk() { return AC && !muted && AC.state === 'running'; }

function toggleMute() {
  muted = !muted;
  if (AC) master.gain.setTargetAtTime(muted ? 0 : 0.9, AC.currentTime, 0.05);
}

function outNode(pan) {
  if (!AC.createStereoPanner) return fxIn;
  const p = AC.createStereoPanner();
  p.pan.value = constrain(pan, -1, 1);
  p.connect(fxIn);
  return p;
}

function panOf(x) { return (x / W) * 2 - 1; }

// 柔和的冒泡声：圆圆的正弦波，音高轻轻往上滑
function bubble(delay, vol, freq, pan) {
  if (!audioOk()) return;
  const t = AC.currentTime + delay;
  const f = freq || random(220, 560);
  const o = AC.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * random(1.6, 2.0), t + 0.12);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g); g.connect(outNode(pan || 0));
  o.start(t); o.stop(t + 0.22);
}

// 泡泡破掉的“啵”：很快的音高上冲 + 一点点轻的水花声
function bubblePop(delay, vol, freq, pan) {
  if (!audioOk()) return;
  const t = AC.currentTime + delay;
  const o = AC.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 3.5, t + 0.035);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g); g.connect(outNode(pan || 0));
  o.start(t); o.stop(t + 0.09);

  const n = AC.createBufferSource(); n.buffer = noiseBuf;
  const bp = AC.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 2;
  const g2 = AC.createGain();
  g2.gain.setValueAtTime(vol * 0.35, t);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  n.connect(bp); bp.connect(g2); g2.connect(outNode(pan || 0));
  n.start(t); n.stop(t + 0.04);
}

// 环境：海底随机冒出一串慢慢的泡泡（声音 + 画面一起）
function ambientBubbles() {
  const x = random(60, W - 60);
  const n = floor(random(2, 5));
  for (let i = 0; i < n; i++) {
    bubble(i * random(0.12, 0.28), random(0.025, 0.055), random(200, 480), panOf(x) * 0.7);
    fx.push({ type: 'rise', x: x + random(-8, 8), y: H - 50 + i * 14, vx: 0, vy: -random(40, 70),
              life: 4, max: 4, size: random(5, 12), col: [190, 235, 255], ph: random(TWO_PI) });
  }
}

// 伸钳子：两个轻轻的泡泡
function sfxShoot(x) {
  bubble(0, 0.06, 300, panOf(SHOULDER.x));
  bubble(0.07, 0.045, 420, panOf(x) * 0.5);
}

// 夹到：一个小泡泡
function sfxCatch(x) {
  bubble(0, 0.07, 520, panOf(x));
}

// 吃掉：泡泡破了。小鱼的“啵”更大更圆，小虾小小一声
function sfxEat(kind) {
  const pan = panOf(SHOULDER.x);
  if (kind === 'fish') {
    bubblePop(0, 0.22, 380, pan);
    bubblePop(0.09, 0.1, 620, pan + 0.15);
    bubble(0.16, 0.035, 700, pan - 0.1);
  } else {
    bubblePop(0, 0.13, 560, pan);
    bubble(0.08, 0.03, 760, pan);
  }
}

// 被咬：一串低低的大泡泡往上翻
function sfxBite(x) {
  for (let i = 0; i < 6; i++) bubble(i * 0.06, 0.09 - i * 0.008, 140 + i * 25, panOf(x));
}

// 鲨鱼快来了：一个低沉的大泡泡“咕噜”
function sfxSonar(x) {
  bubble(0, 0.1, 110, panOf(x));
  bubble(0.18, 0.06, 150, panOf(x));
}

// 结束：泡泡一个个慢慢沉下去
function sfxOver() {
  for (let i = 0; i < 6; i++) bubble(i * 0.16, 0.06, 520 - i * 60, random(-0.4, 0.4));
}

// 出壳：三个往上的小泡泡
function sfxEmerge() {
  bubble(0, 0.05, 260, panOf(CRAB.x));
  bubble(0.08, 0.05, 340, panOf(CRAB.x));
  bubble(0.16, 0.05, 440, panOf(CRAB.x));
}

// 海鳗钻出来：一下子冒出一团泡泡
function sfxLunge(x) {
  for (let i = 0; i < 4; i++) bubble(i * 0.035, 0.07, random(160, 300), panOf(x));
}

function keyPressed() {
  if (key === 'm' || key === 'M') toggleMute();
}

// =====================================================
//  预先绘制的图层：背景、贝壳、鱼、虾、鲨鱼
// =====================================================
function lerpCol(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function makeBackground() {
  const g = createGraphics(W, H);
  g.pixelDensity(2);
  const ctx = g.drawingContext;
  // 蓝色的海：上浅下深
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const c = lerpCol([22, 64, 150], [6, 18, 52], t);
    g.stroke(c[0], c[1], c[2]);
    g.line(0, y, W, y);
  }
  // 油画一样的蓝色笔触
  g.strokeCap(ROUND);
  const cols = [[40, 100, 210], [70, 150, 240], [30, 160, 190], [25, 60, 150], [20, 40, 110], [60, 120, 200]];
  for (let i = 0; i < 2000; i++) {
    const x = random(W), y = random(H - 60);
    const ang = noise(x * 0.004, y * 0.004) * TWO_PI * 2;
    const len = random(10, 44);
    const c = random(cols);
    g.stroke(c[0], c[1], c[2], random(12, 36));
    g.strokeWeight(random(2, 7));
    g.line(x, y, x + cos(ang) * len, y + sin(ang) * len);
  }
  // 水面透下来的柔光
  let grd = ctx.createRadialGradient(W * 0.45, -60, 10, W * 0.45, -60, H * 0.9);
  grd.addColorStop(0, 'rgba(200,235,255,0.22)');
  grd.addColorStop(1, 'rgba(200,235,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // 远处的礁石轮廓 + 珊瑚
  ridge(g, H - 215, 55, [22, 58, 140], 0.004, 11);
  for (let i = 0; i < 8; i++) {
    branch(g, random(W), H - random(175, 205), random(24, 38), -HALF_PI + random(-0.35, 0.35), 6, 5, [40, 90, 175, 200]);
  }
  ridge(g, H - 150, 45, [16, 44, 112], 0.006, 23);
  for (let i = 0; i < 5; i++) {
    branch(g, random(200, W - 200), H - random(110, 140), random(20, 30), -HALF_PI + random(-0.3, 0.3), 5, 5, [50, 110, 200, 210]);
  }
  // 两侧浅蓝珊瑚
  for (let i = 0; i < 3; i++) {
    branch(g, random(0, 150), H - 60, random(45, 62), -HALF_PI + random(-0.4, 0.4), 8, 6, [80, 160, 235, 220]);
    branch(g, random(W - 150, W), H - 60, random(45, 62), -HALF_PI + random(-0.4, 0.4), 8, 6, [80, 160, 235, 220]);
  }
  // 海扇（暖色点缀）
  seaFan(g, 150, H - 250, 72, [214, 166, 104]);
  seaFan(g, W - 150, H - 300, 82, [214, 128, 150]);
  seaFan(g, W - 300, H - 150, 50, [200, 160, 110]);
  // 礁石
  rock(g, 40, H - 170, 110, 140, 31);
  rock(g, W - 36, H - 200, 110, 160, 37);

  // 海底的沙
  g.noStroke();
  g.fill(32, 56, 122);
  g.beginShape();
  g.vertex(0, H);
  for (let x = 0; x <= W; x += 8) g.vertex(x, groundY(x));
  g.vertex(W, H);
  g.endShape(CLOSE);
  g.noFill();
  g.stroke(70, 110, 180, 170);
  g.strokeWeight(3);
  g.beginShape();
  for (let x = 0; x <= W; x += 8) g.vertex(x, groundY(x) + 1);
  g.endShape();
  g.noStroke();
  for (let i = 0; i < 90; i++) {
    const x = random(W), y = random(H - 45, H - 5);
    const c = random([[50, 80, 150], [70, 100, 170], [24, 44, 100], [90, 120, 180]]);
    g.fill(c[0], c[1], c[2]);
    blob(g, x, y, random(3, 9), random(2, 5), 0.3, random(100));
  }
  for (const a of [[190, H - 56, 14], [250, H - 50, 10], [W - 380, H - 54, 13], [W - 120, H - 66, 11]]) anemone(g, a[0], a[1], a[2]);

  grain(g, 0.2);
  grd = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 0.95);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,6,24,0.45)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  return g;
}

function ridge(g, baseY, amp, col, freq, seed) {
  g.noStroke();
  g.fill(col[0], col[1], col[2]);
  g.beginShape();
  g.vertex(0, H);
  for (let x = 0; x <= W; x += 6) g.vertex(x, baseY - noise(x * freq, seed) * amp - noise(x * freq * 4, seed + 3) * amp * 0.3);
  g.vertex(W, H);
  g.endShape(CLOSE);
}

function rock(g, cx, cy, rx, ry, seed) {
  g.noStroke();
  g.fill(30, 60, 140);
  blob(g, cx, cy, rx, ry, 0.35, seed);
  g.fill(50, 92, 175);
  blob(g, cx - rx * 0.15, cy - ry * 0.35, rx * 0.65, ry * 0.4, 0.4, seed + 2);
  g.fill(20, 42, 110);
  blob(g, cx + rx * 0.2, cy + ry * 0.45, rx * 0.7, ry * 0.35, 0.4, seed + 4);
  for (let i = 0; i < 26; i++) {
    const a = random(TWO_PI), r = sqrt(random()) * 0.8;
    const c = random([[80, 130, 210], [20, 40, 100], [110, 160, 225]]);
    g.fill(c[0], c[1], c[2]);
    g.circle(cx + cos(a) * rx * r, cy + sin(a) * ry * r, random(2, 5));
  }
}

function seaFan(g, x, y, r, col) {
  for (let i = 0; i < 3; i++) {
    branch(g, x + (i - 1) * 6, y + r, r * 0.42, -HALF_PI + (i - 1) * 0.35, 4, 6, [col[0], col[1], col[2], 200]);
  }
}

function makeForeground() {
  const L = createGraphics(240, 120), R = createGraphics(280, 110);
  for (const g of [L, R]) { g.pixelDensity(2); g.noStroke(); g.fill(6, 16, 44, 245); }
  blob(L, -10, 130, 150, 95, 0.3, 71);
  blob(L, 112, 142, 70, 48, 0.3, 73);
  blob(R, 300, 120, 170, 85, 0.3, 75);
  blob(R, 130, 136, 62, 44, 0.3, 77);
  grain(L, 0.4); grain(R, 0.4);
  return { L, R };
}

function branch(g, x, y, len, ang, w, depth, col) {
  if (depth === 0 || len < 4) {
    g.noStroke(); g.fill(col[0] + 60, col[1] + 60, col[2] + 20, col[3]);
    g.circle(x, y, w * 2 + 3);
    return;
  }
  const x2 = x + cos(ang) * len, y2 = y + sin(ang) * len;
  g.stroke(col[0], col[1], col[2], col[3]);
  g.strokeWeight(w);
  g.line(x, y, x2, y2);
  const n = random() < 0.7 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    branch(g, x2, y2, len * random(0.62, 0.8), ang + random(-0.7, 0.7), w * 0.72, depth - 1, col);
  }
}

function anemone(g, x, y, r) {
  g.strokeCap(ROUND);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * TWO_PI;
    if (a > PI * 1.05 && a < PI * 1.95) continue;   // 只画上半部分的触手
    g.stroke(206, 112, 104, 230); g.strokeWeight(2.5);
    g.line(x, y, x + cos(a + PI) * r, y + sin(a + PI) * r);
    g.noStroke(); g.fill(226, 150, 132);
    g.circle(x + cos(a + PI) * r, y + sin(a + PI) * r, 5);
  }
  g.fill(190, 92, 96); g.ellipse(x, y, r * 0.9, r * 0.5);
}

function mound(g, x, y, r) {
  const cols = [[20, 60, 150], [30, 110, 200], [40, 165, 180], [55, 185, 120], [90, 160, 240], [15, 40, 110], [110, 200, 230]];
  let k = floor(random(cols.length));
  for (let rr = r; rr > 8; rr -= random(9, 16)) {
    const c = cols[k++ % cols.length];
    g.noStroke();
    g.fill(c[0], c[1], c[2]);
    g.arc(x, y, rr * 2, rr * 2, PI, TWO_PI);
    if (random() < 0.55) {
      g.fill(200, 235, 255, 170);
      const n = max(4, floor(rr * 0.22));
      for (let j = 0; j <= n; j++) {
        const a = PI + j / n * PI;
        g.circle(x + cos(a) * (rr - 5), y + sin(a) * (rr - 5), random(2, 4));
      }
    }
  }
}

// ---------- 曲线形状：直接用 canvas 画，p5 1.x 和 2.x 都能正常显示 ----------
// cmds: ['M', x, y] 起点, ['L', x, y] 直线, ['C', cx1, cy1, cx2, cy2, x, y] 贝塞尔曲线
function pathShape(ctx, col, cmds) {
  const a = col.length > 3 ? col[3] / 255 : 1;
  ctx.save();
  ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a + ')';
  ctx.beginPath();
  for (const k of cmds) {
    if (k[0] === 'M') ctx.moveTo(k[1], k[2]);
    else if (k[0] === 'L') ctx.lineTo(k[1], k[2]);
    else ctx.bezierCurveTo(k[1], k[2], k[3], k[4], k[5], k[6]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 把一串经过的点变成平滑的曲线（代替 curveVertex）
function catmull(v) {
  const cmds = [['M', v[1][0], v[1][1]]];
  for (let i = 1; i < v.length - 2; i++) {
    const p0 = v[i - 1], p1 = v[i], p2 = v[i + 1], p3 = v[i + 2];
    cmds.push(['C', p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
                    p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]]);
  }
  return cmds;
}

// ---------- 手绘蜡笔 / 水彩质感的小工具 ----------
// 边缘有一点点不规则的圆形
function blob(g, cx, cy, rx, ry, amt, seed) {
  g.beginShape();
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * TWO_PI;
    const k = 1 + (noise(seed + cos(a) * 0.9, seed * 1.7 + sin(a) * 0.9) - 0.5) * amt;
    g.vertex(cx + cos(a) * rx * k, cy + sin(a) * ry * k);
  }
  g.endShape(CLOSE);
}

// 在已经画好的颜色上撒细小的颗粒，做出蜡笔 / 水彩纸的质感
function grain(g, amount) {
  const w = g.width, h = g.height;
  const ctx = g.drawingContext;
  g.push();
  g.resetMatrix();
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const n = floor(w * h * 0.5 * (amount || 1));
  for (let i = 0; i < n; i++) {
    const s = 0.7 + Math.random() * 1.3;
    ctx.fillStyle = Math.random() < 0.55
      ? 'rgba(40,20,60,' + (0.03 + Math.random() * 0.07) + ')'
      : 'rgba(255,255,255,' + (0.05 + Math.random() * 0.11) + ')';
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  const m = w * h / 500;
  for (let i = 0; i < m; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.02 + Math.random() * 0.035) + ')';
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 7, 0, 6.2832);
    ctx.fill();
  }
  ctx.restore();
  g.pop();
}

function clipped(g, fn) {
  const ctx = g.drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  fn();
  ctx.restore();
}

function makeCrabBody() {
  const g = createGraphics(110, 76);
  g.pixelDensity(2);
  g.noStroke();
  g.fill(CRAB_PURPLE[0], CRAB_PURPLE[1], CRAB_PURPLE[2]);
  blob(g, 55, 40, 50, 32, 0.12, 3);
  g.fill(192, 148, 232);
  blob(g, 50, 52, 30, 13, 0.25, 5);
  grain(g, 1.2);
  return g;
}

function makeCrabLeg() {
  const g = createGraphics(26, 40);
  g.pixelDensity(2);
  g.noStroke();
  g.fill(118, 70, 168);
  blob(g, 13, 20, 10, 18, 0.18, 9);
  g.fill(148, 98, 200);
  blob(g, 10, 14, 3.5, 9, 0.3, 11);
  grain(g, 1.3);
  return g;
}

function makeEye(col) {
  const g = createGraphics(40, 40);
  g.pixelDensity(2);
  g.noStroke();
  g.fill(col[0], col[1], col[2]);
  blob(g, 20, 20, 18, 18, 0.08, random(100));
  grain(g, 0.7);
  return g;
}

function makePincer() {
  const g = createGraphics(48, 28);
  g.pixelDensity(2);
  g.noStroke();
  g.fill(128, 78, 184);
  blob(g, 24, 16, 22, 11, 0.15, 31);
  g.fill(170, 125, 225);
  blob(g, 30, 12, 10, 4, 0.3, 33);
  grain(g, 1.2);
  return g;
}

function makeShell() {
  const g = createGraphics(140, 120);
  g.pixelDensity(2);
  g.translate(70, 84);
  g.noStroke();
  // 顶上的尖尖
  g.fill(238, 118, 150);
  pathShape(g.drawingContext, [238, 118, 150], [
    ['M', -26, -36],
    ['C', -22, -70, 10, -80, 22, -72],
    ['C', 18, -60, 26, -48, 30, -34],
  ]);
  // 中间一层
  g.fill(246, 168, 160);
  blob(g, 0, -28, 46, 22, 0.1, 21);
  // 最下面最宽的一层
  g.fill(240, 128, 150);
  blob(g, 0, 4, 64, 24, 0.08, 23);
  g.fill(250, 162, 176);
  blob(g, 0, -4, 54, 11, 0.15, 25);
  // 黄色波浪线
  g.noFill();
  g.stroke(250, 210, 90);
  g.strokeWeight(3.5);
  g.strokeCap(ROUND);
  for (const yy of [-2, 9]) {
    g.beginShape();
    for (let x = -54; x <= 54; x += 3) g.vertex(x, yy + sin(x * 0.16) * 3);
    g.endShape();
  }
  g.noStroke();
  // 绿色圆点
  g.fill(130, 196, 160);
  for (const d of [[-30, -30, 8], [-16, -38, 6], [-4, -26, 7], [10, -40, 5], [22, -28, 8], [34, -34, 5], [-38, -20, 5], [6, -16, 5]]) {
    g.circle(d[0], d[1], d[2]);
  }
  // 顶上的紫色小笔触
  g.stroke(160, 110, 225);
  g.strokeWeight(3);
  g.line(-6, -60, 4, -66);
  g.line(-12, -52, -4, -57);
  g.line(8, -54, 14, -61);
  g.noStroke();
  grain(g, 1.1);
  return g;
}

// 蓝色剪刀鱼（朝右）
function makeFish() {
  const g = createGraphics(110, 104);
  g.pixelDensity(2);
  g.translate(56, 52);
  g.noStroke();
  g.fill(146, 204, 244);
  // 往后上方扫的长鳍
  pathShape(g.drawingContext, [146, 204, 244], [
    ['M', -2, -18],
    ['C', -20, -30, -36, -42, -46, -50],
    ['C', -36, -30, -24, -14, -14, -4],
  ]);
  // 下面的鳍
  pathShape(g.drawingContext, [146, 204, 244], [
    ['M', -2, 18],
    ['C', -16, 30, -26, 40, -34, 50],
    ['C', -30, 34, -22, 18, -14, 6],
  ]);
  // 尾巴
  pathShape(g.drawingContext, [146, 204, 244], [
    ['M', -20, 0],
    ['L', -44, -14],
    ['C', -39, -4, -39, 4, -44, 14],
  ]);
  // 鳍上的深蓝小刺
  g.stroke(70, 95, 205);
  g.strokeWeight(1.8);
  g.strokeCap(ROUND);
  for (let i = 0; i < 6; i++) {
    const t = i / 6, x = lerp(-12, -42, t), y = lerp(-22, -46, t);
    g.line(x, y, x + 6, y + 6);
  }
  for (let i = 0; i < 5; i++) {
    const t = i / 5, x = lerp(-12, -31, t), y = lerp(20, 44, t);
    g.line(x, y, x + 6, y - 5);
  }
  g.noStroke();
  // 身体
  g.fill(118, 186, 236);
  blob(g, 8, 0, 32, 25, 0.1, 41);
  // 白色小点 & 头顶的紫色小点
  clipped(g, () => {
    g.fill(255, 255, 255, 220);
    for (let i = 0; i < 28; i++) g.circle(random(-20, 36), random(-22, 22), random(2, 3.8));
    g.fill(130, 90, 200);
    for (let i = 0; i < 9; i++) g.circle(random(0, 20), random(-22, -13), random(2, 3.5));
  });
  // 大眼睛
  g.fill(255);
  blob(g, 22, -6, 10, 10, 0.08, 43);
  g.fill(30, 25, 45);
  g.circle(24, -4, 7);
  // 微笑
  g.noFill();
  g.stroke(60, 90, 170);
  g.strokeWeight(1.8);
  g.arc(25, 9, 14, 8, 0.2, PI - 0.6);
  g.noStroke();
  grain(g, 1);
  return g;
}

// 黄色小虾（朝右）
function makeShrimp() {
  const g = createGraphics(104, 72);
  g.pixelDensity(2);
  g.translate(54, 34);
  g.noStroke();
  // 爱心形的尾巴
  g.fill(240, 140, 70);
  g.push();
  g.translate(-40, 15);
  g.rotate(-1.9);
  g.circle(-4.5, -2, 11);
  g.circle(4.5, -2, 11);
  g.triangle(-9.5, 0, 9.5, 0, 0, 11);
  g.pop();
  // 弯弯的身体
  g.fill(250, 214, 92);
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = lerp(14, -34, t);
    const y = -4 - sin(t * PI) * 5 + t * t * 18;
    g.circle(x, y, lerp(26, 11, t));
  }
  // 橙色条纹 + 背上的高光
  clipped(g, () => {
    g.stroke(240, 140, 60);
    g.strokeWeight(4);
    g.strokeCap(ROUND);
    for (const x of [6, -5, -16, -26]) g.line(x + 4, -24, x - 4, 24);
    g.stroke(255, 245, 210, 170);
    g.strokeWeight(2);
    g.noFill();
    g.bezier(10, -12, -4, -16, -20, -10, -30, 2);
    g.noStroke();
  });
  // 橙色的头
  g.fill(246, 152, 72);
  pathShape(g.drawingContext, [246, 152, 72], [
    ['M', 6, -15],
    ['C', 22, -20, 34, -12, 36, -2],
    ['C', 30, 8, 18, 11, 6, 9],
  ]);
  // 腿和小钳
  g.stroke(240, 140, 60);
  g.strokeWeight(2.4);
  g.strokeCap(ROUND);
  for (let i = 0; i < 4; i++) g.line(-8 + i * 7, 8, -11 + i * 7, 17);
  g.line(22, 7, 31, 13);
  // 触须
  g.noFill();
  g.stroke(240, 150, 70);
  g.strokeWeight(1.6);
  g.bezier(26, -12, 32, -28, 42, -32, 48, -28);
  g.bezier(22, -14, 24, -30, 32, -34, 40, -33);
  g.noStroke();
  // 眼睛
  g.fill(255);
  blob(g, 19, -5, 8, 8, 0.1, 51);
  g.fill(30, 25, 45);
  g.circle(21, -4, 5.5);
  grain(g, 1);
  return g;
}

// 鲨鱼：同样的手绘质感，但颜色深、表情凶
function makeShark(open) {
  const g = createGraphics(250, 130);
  g.pixelDensity(2);
  randomSeed(7);            // 张嘴/闭嘴两张图的质感一样
  g.translate(125, 65);
  g.noStroke();
  const dark = [62, 70, 140], mid = [92, 106, 178], belly = [176, 188, 228];
  g.fill(dark[0], dark[1], dark[2]);
  // 尾巴
  pathShape(g.drawingContext, [dark[0], dark[1], dark[2]], [
    ['M', -88, -2],
    ['C', -104, -20, -114, -38, -120, -50],
    ['C', -114, -22, -110, -8, -102, 0],
    ['C', -110, 10, -114, 24, -118, 38],
    ['C', -106, 26, -98, 12, -88, 6],
  ]);
  // 背鳍
  pathShape(g.drawingContext, [dark[0], dark[1], dark[2]], [
    ['M', -14, -24],
    ['C', -4, -42, 6, -56, 14, -60],
    ['C', 16, -46, 24, -34, 36, -24],
  ]);
  // 胸鳍
  pathShape(g.drawingContext, [dark[0], dark[1], dark[2]], [
    ['M', 4, 18],
    ['C', -6, 30, -14, 40, -18, 48],
    ['C', 4, 40, 22, 30, 32, 20],
  ]);
  // 身体
  g.fill(mid[0], mid[1], mid[2]);
  pathShape(g.drawingContext, [mid[0], mid[1], mid[2]], catmull([[-100, 0], [-100, 0], [-60, -22], [10, -30], [70, -22], [106, -4], [100, 12], [60, 24], [-10, 26], [-70, 14], [-100, 0], [-100, 0]]));
  // 浅色肚子 + 背上的深色斑点
  clipped(g, () => {
    g.fill(belly[0], belly[1], belly[2]);
    g.ellipse(18, 24, 200, 30);
    g.fill(dark[0], dark[1], dark[2]);
    for (const d of [[-40, -10, 12], [-20, -16, 9], [10, -18, 14], [36, -12, 8], [-62, -4, 8]]) g.circle(d[0], d[1], d[2]);
    g.stroke(dark[0], dark[1], dark[2]);
    g.strokeWeight(2.2);
    for (let i = 0; i < 3; i++) g.line(40 + i * 7, -2, 37 + i * 7, 10);   // 鳃
    g.noStroke();
  });
  // 嘴巴
  if (open) {
    g.fill(130, 40, 70);
    g.triangle(66, 4, 112, -12, 112, 24);
    g.fill(255);
    for (let i = 0; i < 5; i++) {
      g.triangle(72 + i * 8, 2 - i * 2.6, 79 + i * 8, 0 - i * 2.6, 75 + i * 8, 10 - i * 2.6);
      g.triangle(72 + i * 8, 11 + i * 2.2, 79 + i * 8, 13 + i * 2.2, 75 + i * 8, 3 + i * 2.2);
    }
  } else {
    g.fill(255);
    for (let i = 0; i < 5; i++) g.triangle(72 + i * 6, 6 - i, 78 + i * 6, 5 - i, 75 + i * 6, 12 - i);
    g.stroke(35, 30, 60);
    g.strokeWeight(2);
    g.line(70, 6, 104, 1);
    g.noStroke();
  }
  // 凶凶的眼睛
  g.fill(255);
  blob(g, 62, -10, 9, 9, 0.1, 61);
  g.fill(30, 25, 45);
  g.circle(65, -9, 6.5);
  g.stroke(35, 30, 60);
  g.strokeWeight(4);
  g.strokeCap(ROUND);
  g.line(50, -23, 74, -15);
  g.noStroke();
  grain(g, 0.9);
  randomSeed(millis());
  return g;
}


// 海鳗：身体用一块块带颗粒的圆片拼出来，头单独画
function makeEelSeg() {
  const g = createGraphics(32, 32);
  g.pixelDensity(2);
  g.noStroke();
  g.fill(176, 112, 200);
  blob(g, 16, 16, 15, 15, 0.06, 81);
  grain(g, 1.2);
  return g;
}

function makeEelHead(open) {
  const g = createGraphics(74, 56);
  g.pixelDensity(2);
  randomSeed(13);
  g.noStroke();
  // 头
  g.fill(176, 112, 200);
  blob(g, 32, 29, 26, 19, 0.08, 83);
  // 深紫色的嘴唇
  g.fill(122, 82, 178);
  if (open) {
    blob(g, 58, 21, 12, 8, 0.15, 85);
    blob(g, 56, 39, 11, 7, 0.15, 87);
    g.fill(110, 36, 70);
    g.triangle(44, 30, 72, 20, 72, 40);
    g.fill(255);
    for (let i = 0; i < 3; i++) {
      g.triangle(50 + i * 7, 27 - i * 2, 55 + i * 7, 26 - i * 2, 52 + i * 7, 32 - i * 2);
      g.triangle(50 + i * 7, 34 + i * 2, 55 + i * 7, 35 + i * 2, 52 + i * 7, 29 + i * 2);
    }
  } else {
    blob(g, 58, 30, 13, 11, 0.12, 85);
    g.stroke(80, 50, 120);
    g.strokeWeight(2);
    g.line(52, 31, 70, 29);
    g.noStroke();
  }
  // 大眼睛 + 凶凶的眉毛
  g.fill(255);
  blob(g, 30, 20, 11, 11, 0.08, 89);
  g.fill(30, 25, 45);
  g.circle(33, 21, 9);
  g.stroke(60, 34, 90);
  g.strokeWeight(3);
  g.strokeCap(ROUND);
  g.line(20, 8, 41, 13);
  g.noStroke();
  // 腮上的小斑点
  g.fill(110, 66, 150, 200);
  g.circle(18, 36, 8);
  grain(g, 1);
  randomSeed(millis());
  return g;
}
