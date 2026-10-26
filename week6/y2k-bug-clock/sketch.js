// Y2K BUG CLOCK
//
// How to read the clock:
//   seconds → the progress bar. Every minute is a countdown to 12/31/1999 23:59:59
//   minutes → the number of error popups piled up on the desktop (minute 37 = 37 popups)
//   hours   → the LCD digits and the taskbar clock
//   every new minute: the year rolls from 99 to 00, gets read as 1900 → blue screen + glitch
//   every new hour: all errors are cleared, like a system restart
//
// Click Start to open the Start menu. Try "Shut Down...".
//
// Loop mode (LOOP_MODE below): skips straight to :50, shows 10 seconds, glitches, repeats.
// Each loop still counts as one minute, so the popups keep piling up.
//
// Keys (for demos):
//   F fast-forward   J jump to :59:55 of this hour   G trigger a glitch   R real time (turns loop mode off)

// ===================== EASY SETTINGS: try changing these! =====================

const DESKTOP_COLOR = '#3a6ea5'; // Windows Me desktop blue, shows around the wallpaper
const WALLPAPER_FIT = 'cover'; // 'cover' fills the screen, 'stretch' squashes to fit, 'center' leaves it at its own size
const FRAME_RATE = 12; // low on purpose: a 2000-era PC was not smooth

const LOOP_MODE = true; // true: every minute only shows its last 10 seconds, then glitches
const LOOP_START_SECOND = 50; // where each loop starts (50 → shows :50 to :59)

const LCD_ON = '#3dff6e'; // lit LCD segments
const LCD_OFF = '#0f2b17'; // unlit "ghost" segments

const WINDOW_TITLE = 'Y2K_CLOCK.EXE';
const FAST_SPEED = 20; // how fast the F key runs time

const MESSAGES = [
  'Year "00" is not valid.\nAssuming 1900.',
  'Date overflow in\nCLOCK.DLL',
  'Your files are now\n100 years old.',
  'MILLENNIUM.SYS\nnot found.',
  'Cannot divide time\nby zero.',
  'The future has performed\nan illegal operation.',
  'Calendar.exe stopped\nresponding at 23:59:59.',
  'Please insert\nYear 2000 disk.',
];

// ==============================================================================

const TASKBAR_H = 28;
const POPUP_W = 220;
const POPUP_H = 96;
const FACE = [212, 208, 200]; // the warm grey of Windows Me / 2000

// which of the 7 LCD segments light up for each digit 0–9
const SEGMENTS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

// desktop icons, in two columns like the real Windows Me desktop
const ICONS = [
  { name: 'My Documents', col: 0, row: 0 },
  { name: 'My Computer', col: 0, row: 1 },
  { name: 'My Network Places', col: 0, row: 2 },
  { name: 'Recycle Bin', col: 0, row: 3 },
  { name: 'Internet Explorer', col: 0, row: 4 },
  { name: 'Setup MSN Internet Access', col: 0, row: 5 },
  { name: 'Online Services', col: 1, row: 0 },
  { name: 'Outlook Express', col: 1, row: 1 },
  { name: 'Windows Media Player', col: 1, row: 2 },
  { name: 'Y2K_FIX.EXE', col: 1, row: 3 },
];

const START_ITEMS = [
  { label: 'Windows Update', icon: 'Internet Explorer' },
  null, // separator
  { label: 'Programs', icon: 'Online Services', arrow: true },
  { label: 'Documents', icon: 'My Documents', arrow: true },
  { label: 'Settings', icon: 'My Computer', arrow: true },
  { label: 'Search', icon: 'My Network Places', arrow: true },
  { label: 'Help', icon: 'Help' },
  { label: 'Run...', icon: 'Run' },
  null,
  { label: 'Log Off User...', icon: 'Log Off' },
  { label: 'Shut Down...', icon: 'Shut Down' },
];

let wallpaperImg;
let popups = [];
let startOpen = false;

let lastMinute = -1;
let glitchStart = -99999;
let glitchDur = 0;
let bigGlitch = false;
let bsodReason = '';
let waitCursor = false;

// demo mode: use our own simulated time instead of the real clock
let simMode = false;
let simMs = 0;
let speed = 1;
let loopMode = LOOP_MODE;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(FRAME_RATE);
  // the wallpaper is an <img> in index.html, so it also works when you just double-click the file
  wallpaperImg = document.getElementById('wallpaper');
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  if (simMode) simMs += deltaTime * speed;

  // loop mode: once the glitch is over, skip ahead to :50 again
  // (but not on the frame the minute rolls over, so the glitch still gets to fire at :00)
  if (loopMode && !glitchActive()) {
    enterSim();
    let d = new Date(simMs);
    let rollingOver = lastMinute !== -1 && d.getMinutes() !== lastMinute;
    if (!rollingOver && d.getSeconds() < LOOP_START_SECOND) jumpToSecond(LOOP_START_SECOND);
  }
  let t = getTime();

  // a new minute = another "new year's eve"
  if (lastMinute !== -1 && t.m !== lastMinute) {
    let fast = speed > 1;
    if (t.m === 0) {
      triggerGlitch(fast ? 1500 : 3500, true, '*  ALL ERRORS CLEARED. SYSTEM WILL RESTART.');
    } else {
      triggerGlitch(fast ? 500 : 1400, false, '*  1 ERROR LOGGED TO DESKTOP.');
    }
  }
  lastMinute = t.m;
  syncPopups(t.m);

  drawWallpaper();
  drawDesktopIcons();
  for (let p of popups) {
    p.display();
  }
  drawMainWindow(t);
  if (startOpen) drawStartMenu();
  drawTaskbar(t);

  if (glitchActive()) drawGlitch();

  // hourglass cursor while the system is "busy"
  if (glitchActive() !== waitCursor) {
    waitCursor = glitchActive();
    cursor(waitCursor ? WAIT : ARROW);
  }
}

// ---------- time ----------

function getTime() {
  if (!simMode) {
    let s = second();
    return { h: hour(), m: minute(), s: s, frac: (s + (Date.now() % 1000) / 1000) / 60 };
  }
  let d = new Date(simMs);
  let s = d.getSeconds();
  return { h: d.getHours(), m: d.getMinutes(), s: s, frac: (s + d.getMilliseconds() / 1000) / 60 };
}

function keyPressed() {
  let k = key.toLowerCase();
  if (k === 'f') {
    enterSim();
    speed = speed === 1 ? FAST_SPEED : 1;
  } else if (k === 'j') {
    enterSim();
    let d = new Date(simMs);
    d.setMinutes(59);
    d.setSeconds(55);
    simMs = d.getTime();
    lastMinute = 59;
  } else if (k === 'g') {
    triggerGlitch(1400, false, '*  1 ERROR LOGGED TO DESKTOP.');
  } else if (k === 'r') {
    simMode = false;
    loopMode = false;
    speed = 1;
    lastMinute = minute();
  }
}

function enterSim() {
  if (!simMode) {
    simMode = true;
    simMs = Date.now();
  }
}

function jumpToSecond(s) {
  let d = new Date(simMs);
  d.setSeconds(s);
  d.setMilliseconds(0);
  simMs = d.getTime();
}

// ---------- mouse: Start button + Start menu ----------

function mousePressed() {
  let ty = height - TASKBAR_H;
  if (mouseX >= 2 && mouseX <= 56 && mouseY >= ty + 3 && mouseY <= height - 2) {
    startOpen = !startOpen;
    return;
  }
  if (startOpen) {
    let item = startMenuItemAt(mouseX, mouseY);
    startOpen = false;
    if (item && item.label === 'Shut Down...') {
      triggerGlitch(3000, false, '*  CANNOT SHUT DOWN: IT IS STILL 1999.');
    }
  }
}

// ---------- wallpaper ----------

function drawWallpaper() {
  background(DESKTOP_COLOR);
  let img = wallpaperImg;
  if (!img || !img.complete || img.naturalWidth === 0) return;

  let iw = img.naturalWidth;
  let ih = img.naturalHeight;
  let areaH = height - TASKBAR_H;
  let dw = width;
  let dh = areaH;
  if (WALLPAPER_FIT === 'cover') {
    let s = max(width / iw, areaH / ih);
    dw = iw * s;
    dh = ih * s;
  } else if (WALLPAPER_FIT === 'center') {
    dw = iw;
    dh = ih;
  }
  drawingContext.drawImage(img, (width - dw) / 2, (areaH - dh) / 2, dw, dh);
}

// ---------- desktop icons ----------

function drawDesktopIcons() {
  for (let ic of ICONS) {
    let x = 38 + ic.col * 72;
    let y = 26 + ic.row * 70;
    drawIcon(ic.name, x, y);

    textFont('Tahoma');
    textSize(11);
    textAlign(CENTER, TOP);
    noStroke();
    fill(0, 0, 0, 170);
    text(ic.name, x - 34, y + 21, 70);
    fill(255);
    text(ic.name, x - 35, y + 20, 70);
  }
}

// draws a 32px icon centred on (x, y)
function drawIcon(name, x, y) {
  stroke(0);
  strokeWeight(1);
  if (name === 'My Computer') {
    fill(FACE);
    rect(x - 13, y - 15, 26, 20);
    fill(0, 128, 128);
    rect(x - 10, y - 12, 20, 13);
    fill(FACE);
    rect(x - 15, y + 6, 30, 7);
  } else if (name === 'My Documents' || name === 'Online Services') {
    fill(225, 185, 55);
    rect(x - 14, y - 11, 12, 5, 2, 2, 0, 0);
    if (name === 'My Documents') {
      fill(255);
      rect(x - 10, y - 14, 20, 15);
    }
    fill(250, 215, 90);
    rect(x - 14, y - 7, 28, 19);
  } else if (name === 'My Network Places') {
    fill(70, 140, 220);
    circle(x - 4, y - 4, 22);
    noStroke();
    fill(90, 180, 70);
    ellipse(x - 8, y - 7, 9, 6);
    ellipse(x, y + 1, 8, 5);
    stroke(0);
    fill(FACE);
    rect(x + 2, y + 2, 13, 10);
    fill(0, 128, 128);
    rect(x + 4, y + 4, 9, 5);
  } else if (name === 'Outlook Express') {
    fill(255);
    rect(x - 13, y - 9, 26, 18);
    line(x - 13, y - 9, x, y + 2);
    line(x + 13, y - 9, x, y + 2);
    noStroke();
    fill(40, 100, 210);
    triangle(x + 4, y - 16, x + 15, y - 11, x + 4, y - 6);
  } else if (name === 'Windows Media Player') {
    fill(20, 40, 120);
    rect(x - 13, y - 13, 26, 26, 3);
    noStroke();
    fill(255, 170, 20);
    triangle(x - 6, y - 8, x + 9, y, x - 6, y + 8);
  } else if (name === 'Recycle Bin') {
    fill(225);
    rect(x - 11, y - 12, 22, 26, 0, 0, 4, 4);
    line(x - 5, y - 8, x - 5, y + 10);
    line(x, y - 8, x, y + 10);
    line(x + 5, y - 8, x + 5, y + 10);
    fill(200);
    rect(x - 13, y - 16, 26, 5);
  } else if (name === 'Internet Explorer') {
    noFill();
    stroke(230, 170, 30);
    strokeWeight(3);
    push();
    translate(x, y - 1);
    rotate(-0.5);
    ellipse(0, 0, 32, 12);
    pop();
    strokeWeight(1);
    noStroke();
    fill(30, 90, 200);
    textFont('Times New Roman');
    textStyle(BOLD);
    textSize(26);
    textAlign(CENTER, CENTER);
    text('e', x, y - 4);
    textStyle(NORMAL);
  } else if (name === 'Setup MSN Internet Access') {
    // the MSN butterfly
    noStroke();
    fill(240, 60, 40);
    ellipse(x - 7, y - 6, 13, 13);
    fill(255, 190, 0);
    ellipse(x + 7, y - 6, 13, 13);
    fill(40, 110, 220);
    ellipse(x - 6, y + 7, 11, 11);
    fill(60, 170, 60);
    ellipse(x + 6, y + 7, 11, 11);
  } else if (name === 'Y2K_FIX.EXE') {
    // a 3.5" floppy disk
    fill(30, 40, 90);
    rect(x - 13, y - 15, 26, 28, 0, 3, 0, 0);
    fill(180);
    rect(x - 7, y - 15, 14, 9);
    fill(255);
    rect(x - 10, y - 2, 20, 13);
    noStroke();
    fill(200, 0, 0);
    textFont('Tahoma');
    textStyle(BOLD);
    textSize(8);
    textAlign(CENTER, CENTER);
    text('Y2K', x, y + 5);
    textStyle(NORMAL);
  } else if (name === 'Help') {
    fill(130, 60, 170);
    rect(x - 10, y - 12, 20, 24, 2);
    noStroke();
    fill(255);
    textFont('Tahoma');
    textStyle(BOLD);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('?', x, y);
    textStyle(NORMAL);
  } else if (name === 'Run') {
    fill(255);
    rect(x - 13, y - 9, 26, 18);
    fill(0, 0, 128);
    noStroke();
    rect(x - 12, y - 8, 25, 4);
  } else if (name === 'Log Off') {
    fill(240, 200, 60);
    rect(x - 4, y - 12, 8, 14, 4);
    circle(x, y + 8, 12);
  } else if (name === 'Shut Down') {
    fill(FACE);
    rect(x - 13, y - 13, 26, 20);
    fill(30, 60, 140);
    rect(x - 10, y - 10, 20, 14);
    fill(FACE);
    rect(x - 15, y + 8, 30, 6);
  }
  noStroke();
}

// draw any icon at a smaller size (used in the taskbar and Start menu)
function drawSmallIcon(name, x, y, s) {
  push();
  translate(x, y);
  scale(s);
  drawIcon(name, 0, 0);
  pop();
}

// ---------- popups: count = current minute ----------

function syncPopups(m) {
  // on the hour the minute goes back to 0, so clear every popup
  if (popups.length > m) popups = [];
  let k = 0;
  while (popups.length < m) {
    popups.push(new ErrorPopup(popups.length, k * 45));
    k++;
  }
}

class ErrorPopup {
  constructor(index, delay) {
    this.index = index;
    this.msg = MESSAGES[index % MESSAGES.length];
    this.born = millis() + delay;
  }

  position() {
    // stack diagonally, like the trail a dragged window leaves behind on a slow PC
    let left = 180;
    let perCol = max(1, floor((height - TASKBAR_H - POPUP_H - 20) / 24));
    let col = floor(this.index / perCol);
    let row = this.index % perCol;
    let x = col * 170 + row * 12;
    x = left + (x % max(1, width - POPUP_W - left - 10));
    let y = 14 + row * 24;
    return { x, y };
  }

  display() {
    // no animation: old Windows dialogs just appeared
    if (millis() < this.born) return;
    let pos = this.position();

    push();
    translate(pos.x, pos.y);
    bevel(0, 0, POPUP_W, POPUP_H, true);
    // the clock window has focus, so every error dialog gets a grey "inactive" title bar
    titleBar(3, 3, POPUP_W - 6, 18, 'Y2K Error', false);

    // red X icon
    stroke(0);
    fill(220, 0, 0);
    circle(26, 52, 26);
    stroke(255);
    strokeWeight(3);
    line(21, 47, 31, 57);
    line(31, 47, 21, 57);
    strokeWeight(1);

    noStroke();
    fill(0);
    textFont('Tahoma');
    textSize(11);
    textAlign(LEFT, TOP);
    text(this.msg, 48, 34);

    bevel(POPUP_W / 2 - 37, POPUP_H - 28, 75, 23, true);
    fill(0);
    textAlign(CENTER, CENTER);
    text('OK', POPUP_W / 2, POPUP_H - 16);
    pop();
  }
}

// ---------- main window ----------

function drawMainWindow(t) {
  let w = min(540, width - 32);
  let h = 280;
  let x = floor((width - w) / 2);
  let y = floor((height - TASKBAR_H - h) / 2);

  bevel(x, y, w, h, true);
  let title = WINDOW_TITLE + (speed > 1 ? ' - [Demo x' + speed + ']' : '');
  titleBar(x + 3, y + 3, w - 6, 20, title, true, true);

  // menu bar, with the first letter underlined like a real Windows menu
  noStroke();
  textFont('Tahoma');
  textSize(11);
  textAlign(LEFT, CENTER);
  let mx = x + 10;
  for (let item of ['File', 'Edit', 'View', 'Help']) {
    fill(0);
    text(item, mx, y + 35);
    stroke(0);
    line(mx, y + 41, mx + textWidth(item[0]), y + 41);
    noStroke();
    mx += textWidth(item) + 14;
  }

  // black LCD screen
  let lx = x + 10;
  let ly = y + 50;
  let lw = w - 20;
  let lh = 128;
  sunken(lx, ly, lw, lh, color(5, 12, 8));

  let dw = min(48, lw * 0.085);
  drawLcdTime(t, lx + lw / 2, ly + 14, dw);

  textFont('VT323');
  textSize(min(22, lw * 0.045));
  textAlign(CENTER, CENTER);
  if (glitchActive()) {
    if (frameCount % 4 < 2) {
      fill(255, 60, 60);
      text('SYS DATE  01/01/1900  00:00:00  ??', lx + lw / 2, ly + 108);
    }
  } else {
    fill(LCD_ON);
    text('SYS DATE  12/31/1999  23:59:' + nf(t.s, 2), lx + lw / 2, ly + 108);
  }

  // progress bar = seconds
  let pct = floor(t.frac * 100);
  fill(0);
  textFont('Tahoma');
  textSize(11);
  textAlign(LEFT, CENTER);
  text('Preparing for the year 2000...  ' + pct + '%', x + 12, y + 194);

  let px = x + 10;
  let py = y + 206;
  let pw = w - 20;
  let ph = 20;
  sunken(px, py, pw, ph, color(255));
  let blocks = floor((pw - 4) / 10);
  let filled = floor(blocks * t.frac);
  fill(10, 36, 106);
  for (let i = 0; i < filled; i++) {
    rect(px + 3 + i * 10, py + 3, 8, ph - 5);
  }

  // status bar
  let sy = y + 240;
  let half = (w - 24) / 2;
  sunken(x + 10, sy, half, 22, color(FACE));
  sunken(x + 14 + half, sy, half, 22, color(FACE));
  fill(0);
  textAlign(LEFT, CENTER);
  text('T-MINUS ' + (60 - t.s) + 's TO Y2K', x + 16, sy + 11);
  text('ERRORS LOGGED: ' + popups.length, x + 20 + half, sy + 11);
}

// ---------- 7-segment LCD digits ----------

function drawLcdTime(t, cx, top, dw) {
  let str = nf(t.h, 2) + ':' + nf(t.m, 2) + ':' + nf(t.s, 2);
  let dh = dw * 1.75;
  let gap = dw * 0.3;
  let colonW = dw * 0.35;
  let total = 6 * dw + 2 * colonW + 7 * gap;
  let x = cx - total / 2;
  let colonOn = (t.frac * 60) % 1 < 0.5;

  for (let ch of str) {
    if (ch === ':') {
      let sz = dw * 0.17;
      noStroke();
      fill(colonOn ? LCD_ON : LCD_OFF);
      rect(x + colonW / 2 - sz / 2, top + dh * 0.3, sz, sz);
      rect(x + colonW / 2 - sz / 2, top + dh * 0.68, sz, sz);
      x += colonW + gap;
    } else {
      drawDigit(x, top, dw, dh, int(ch));
      x += dw + gap;
    }
  }
}

function drawDigit(x, y, w, h, d) {
  let th = w * 0.17; // segment thickness
  let half = (h - th) / 2;
  let g = th * 0.2; // small gap between segments
  let rects = {
    a: [x + th + g, y, w - 2 * th - 2 * g, th],
    g: [x + th + g, y + half, w - 2 * th - 2 * g, th],
    d: [x + th + g, y + 2 * half, w - 2 * th - 2 * g, th],
    f: [x, y + th + g, th, half - th - 2 * g],
    b: [x + w - th, y + th + g, th, half - th - 2 * g],
    e: [x, y + half + th + g, th, half - th - 2 * g],
    c: [x + w - th, y + half + th + g, th, half - th - 2 * g],
  };
  let lit = SEGMENTS[d];
  noStroke();
  for (let name in rects) {
    fill(lit.includes(name) ? LCD_ON : LCD_OFF);
    let r = rects[name];
    rect(r[0], r[1], r[2], r[3], th * 0.3);
  }
}

// ---------- Start menu ----------

function startMenuLayout() {
  let w = 186;
  let h = 6;
  for (let it of START_ITEMS) h += it ? (it.label === 'Windows Update' ? 34 : 30) : 8;
  return { x: 2, y: height - TASKBAR_H - h + 1, w: w, h: h };
}

function startMenuItemAt(mx, my) {
  let m = startMenuLayout();
  if (mx < m.x + 24 || mx > m.x + m.w - 3) return null;
  let iy = m.y + 3;
  for (let it of START_ITEMS) {
    let ih = it ? (it.label === 'Windows Update' ? 34 : 30) : 8;
    if (it && my >= iy && my < iy + ih) return it;
    iy += ih;
  }
  return null;
}

function drawStartMenu() {
  let m = startMenuLayout();
  bevel(m.x, m.y, m.w, m.h, true);

  // the vertical "Windows Me Millennium Edition" banner
  let ctx = drawingContext;
  let g = ctx.createLinearGradient(0, m.y + m.h, 0, m.y);
  g.addColorStop(0, '#000000');
  g.addColorStop(1, '#0a246a');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(m.x + 3, m.y + 3, 21, m.h - 6);
  ctx.restore();

  push();
  translate(m.x + 14, m.y + m.h - 8);
  rotate(-HALF_PI);
  noStroke();
  textFont('Tahoma');
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(15);
  fill(255);
  text('Windows', 0, 0);
  let ww = textWidth('Windows ');
  textStyle(BOLDITALIC);
  fill(200, 220, 255);
  text('Me', ww, 0);
  textStyle(NORMAL);
  textSize(11);
  fill(255);
  text('Millennium Edition', ww + textWidth('Me') + 10, 1);
  pop();

  let hovered = startMenuItemAt(mouseX, mouseY);
  let iy = m.y + 3;
  let ix = m.x + 25;
  let iw = m.w - 28;
  for (let it of START_ITEMS) {
    if (!it) {
      stroke(128);
      line(ix + 2, iy + 3, ix + iw - 2, iy + 3);
      stroke(255);
      line(ix + 2, iy + 4, ix + iw - 2, iy + 4);
      noStroke();
      iy += 8;
      continue;
    }
    let ih = it.label === 'Windows Update' ? 34 : 30;
    let on = it === hovered;
    if (on) {
      fill(10, 36, 106);
      rect(ix, iy, iw, ih);
    }
    drawSmallIcon(it.icon, ix + 18, iy + ih / 2, 0.68);
    noStroke();
    fill(on ? 255 : 0);
    textFont('Tahoma');
    textSize(11);
    textAlign(LEFT, CENTER);
    text(it.label, ix + 40, iy + ih / 2);
    stroke(on ? 255 : 0);
    line(ix + 40, iy + ih / 2 + 6, ix + 40 + textWidth(it.label[0]), iy + ih / 2 + 6);
    noStroke();
    if (it.arrow) {
      fill(on ? 255 : 0);
      triangle(ix + iw - 10, iy + ih / 2 - 4, ix + iw - 6, iy + ih / 2, ix + iw - 10, iy + ih / 2 + 4);
    }
    iy += ih;
  }
}

// ---------- taskbar ----------

function drawTaskbar(t) {
  let y = height - TASKBAR_H;
  noStroke();
  fill(FACE);
  rect(0, y, width, TASKBAR_H);
  stroke(255);
  line(0, y + 1, width, y + 1);
  noStroke();

  // Start button (pressed in while the menu is open)
  if (startOpen) sunken(2, y + 4, 54, TASKBAR_H - 7, color(FACE));
  else bevel(2, y + 4, 54, TASKBAR_H - 7, true);
  drawFlag(7, y + 8);
  fill(0);
  textFont('Tahoma');
  textStyle(BOLD);
  textSize(11);
  textAlign(LEFT, CENTER);
  text('Start', 25, y + TASKBAR_H / 2 + 1);
  textStyle(NORMAL);

  // Quick Launch: Show Desktop, Internet Explorer, Outlook Express, Media Player
  let qx = 62;
  divider(qx, y);
  stroke(0);
  fill(0, 128, 128);
  rect(qx + 6, y + 8, 14, 11);
  noStroke();
  drawSmallIcon('Internet Explorer', qx + 33, y + TASKBAR_H / 2, 0.5);
  drawSmallIcon('Outlook Express', qx + 52, y + TASKBAR_H / 2, 0.5);
  drawSmallIcon('Windows Media Player', qx + 71, y + TASKBAR_H / 2, 0.5);
  divider(qx + 84, y);

  // the clock's taskbar button, pressed in because it is the active window
  let bx = qx + 90;
  let bw = min(160, width - bx - 100);
  if (bw > 60) {
    sunken(bx, y + 4, bw, TASKBAR_H - 7, color(232, 230, 226));
    drawClockIcon(bx + 5, y + 7, 14);
    fill(0);
    textFont('Tahoma');
    textStyle(BOLD);
    textSize(11);
    textAlign(LEFT, CENTER);
    text(WINDOW_TITLE, bx + 24, y + TASKBAR_H / 2 + 1);
    textStyle(NORMAL);
  }

  // system tray: speaker + clock
  let tw = 86;
  let tx = width - tw - 3;
  sunken(tx, y + 4, tw, TASKBAR_H - 7, color(FACE));
  fill(60);
  rect(tx + 7, y + 11, 4, 6);
  triangle(tx + 10, y + 14, tx + 16, y + 8, tx + 16, y + 20);

  let h12 = t.h % 12 === 0 ? 12 : t.h % 12;
  let ampm = t.h < 12 ? 'AM' : 'PM';
  fill(0);
  textFont('Tahoma');
  textSize(11);
  textAlign(CENTER, CENTER);
  text(h12 + ':' + nf(t.m, 2) + ' ' + ampm, tx + tw / 2 + 9, y + TASKBAR_H / 2 + 1);
}

function divider(x, y) {
  stroke(128);
  line(x, y + 5, x, y + TASKBAR_H - 4);
  stroke(255);
  line(x + 1, y + 5, x + 1, y + TASKBAR_H - 4);
  noStroke();
}

function drawFlag(x, y) {
  // the four-colour Windows flag, slightly wavy
  noStroke();
  fill(240, 60, 30);
  quad(x, y + 1, x + 6, y, x + 6, y + 6, x, y + 7);
  fill(60, 170, 40);
  quad(x + 7, y, x + 13, y + 1, x + 13, y + 7, x + 7, y + 6);
  fill(30, 90, 220);
  quad(x, y + 8, x + 6, y + 7, x + 6, y + 13, x, y + 14);
  fill(255, 200, 0);
  quad(x + 7, y + 7, x + 13, y + 8, x + 13, y + 14, x + 7, y + 13);
}

function drawClockIcon(x, y, s) {
  stroke(0);
  fill(255);
  circle(x + s / 2, y + s / 2, s);
  line(x + s / 2, y + s / 2, x + s / 2, y + 3);
  line(x + s / 2, y + s / 2, x + s - 4, y + s / 2);
  noStroke();
}

// ---------- glitch ----------

function triggerGlitch(dur, big, reason) {
  glitchStart = millis();
  glitchDur = dur;
  bigGlitch = big;
  bsodReason = reason;
  startOpen = false;
}

function glitchActive() {
  return millis() - glitchStart < glitchDur;
}

function drawGlitch() {
  let p = (millis() - glitchStart) / glitchDur;
  let bsodEnd = bigGlitch ? 0.6 : 0.45;
  if (speed > 1 && !bigGlitch) bsodEnd = 0;

  if (p < bsodEnd) {
    drawBSOD();
    return;
  }

  // cut the screen into horizontal strips and shift them left/right
  let ctx = drawingContext;
  for (let i = 0; i < 10; i++) {
    let sy = floor(random(height));
    let sh = min(floor(random(4, 40)), height - sy);
    if (sh <= 0) continue;
    let dx = random(-60, 60);
    ctx.drawImage(ctx.canvas, 0, sy, width, sh, dx, sy, width, sh);
  }

  // magenta / cyan signal noise bars
  noStroke();
  for (let i = 0; i < 4; i++) {
    if (random() < 0.5) fill(255, 0, 255, 90);
    else fill(0, 255, 255, 90);
    rect(0, random(height), width, random(2, 8));
  }
}

function drawBSOD() {
  background(0, 0, 170);
  let ts = constrain(width / 34, 14, 26);
  textFont('VT323');
  textSize(ts);

  let lines = [
    'A fatal exception 0E has occurred at 0028:C0011E36 in VXD Y2K(01).',
    '',
    '*  SYSTEM DATE ROLLED OVER:  12/31/99  ->  01/01/00',
    '*  YEAR "00" INTERPRETED AS 1900.',
    '*  TIME HAS MOVED BACKWARD 100 YEARS.',
    '',
    bsodReason,
    '',
    'Press any key to continue ' + (frameCount % 8 < 4 ? '_' : ' '),
  ];

  let lh = ts * 1.15;
  let y0 = height / 2 - (lines.length * lh) / 2;

  let header = ' WINDOWS ';
  let hw = textWidth(header) + 8;
  noStroke();
  fill(170);
  rect(width / 2 - hw / 2, y0 - lh * 1.6, hw, lh);
  fill(0, 0, 170);
  textAlign(CENTER, CENTER);
  text(header, width / 2, y0 - lh * 1.1);

  let maxW = 0;
  for (let l of lines) maxW = max(maxW, textWidth(l));
  let x0 = width / 2 - maxW / 2;
  fill(255);
  textAlign(LEFT, CENTER);
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], x0, y0 + i * lh);
  }
}

// ---------- Windows Me UI parts ----------

function bevel(x, y, w, h, raised) {
  noStroke();
  fill(FACE);
  rect(x, y, w, h);
  strokeWeight(1);
  stroke(raised ? 255 : 128);
  line(x, y, x + w - 1, y);
  line(x, y, x, y + h - 1);
  stroke(raised ? 64 : 255);
  line(x, y + h - 1, x + w - 1, y + h - 1);
  line(x + w - 1, y, x + w - 1, y + h - 1);
  if (raised) {
    stroke(128);
    line(x + 1, y + h - 2, x + w - 2, y + h - 2);
    line(x + w - 2, y + 1, x + w - 2, y + h - 2);
  }
  noStroke();
}

function sunken(x, y, w, h, col) {
  noStroke();
  fill(col);
  rect(x, y, w, h);
  stroke(128);
  line(x, y, x + w, y);
  line(x, y, x, y + h);
  stroke(255);
  line(x, y + h, x + w, y + h);
  line(x + w, y, x + w, y + h);
  noStroke();
}

// active windows get a blue title bar, inactive ones a grey one (Windows Me / 2000 colours)
function titleBar(x, y, w, h, label, active, withIcon) {
  let ctx = drawingContext;
  let g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, active ? '#0a246a' : '#808080');
  g.addColorStop(1, active ? '#a6caf0' : '#c0c0c0');
  // save/restore so p5's own fill colour isn't left pointing at this gradient
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  let tx = x + 5;
  if (withIcon) {
    drawClockIcon(x + 3, y + 3, h - 6);
    tx = x + h + 2;
  }

  noStroke();
  fill(active ? 255 : FACE);
  textFont('Tahoma');
  textStyle(BOLD);
  textSize(11);
  textAlign(LEFT, CENTER);
  text(label, tx, y + h / 2 + 1);
  textStyle(NORMAL);

  // the three buttons in the top-right corner: _ □ ×
  let bs = h - 4;
  let glyphs = ['×', '□', '_'];
  let bx = x + w - bs - 2;
  for (let i = 0; i < 3; i++) {
    bevel(bx, y + 2, bs + 2, bs, true);
    fill(0);
    textSize(bs * 0.8);
    textAlign(CENTER, CENTER);
    text(glyphs[i], bx + bs / 2 + 1, y + 2 + bs / 2);
    bx -= bs + 2 + (i === 0 ? 2 : 0);
  }
}
