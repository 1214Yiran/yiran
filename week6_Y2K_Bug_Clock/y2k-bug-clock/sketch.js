// Y2K BUG CLOCK
//
// The clock tells the real time, and every single minute replays the last minute of 1999.
//
// How to read the clock:
//   LCD digits + taskbar → the real time
//   progress bar         → seconds: every minute is a countdown to 12/31/1999 23:59:59
//   T-MINUS              → seconds left in this minute, i.e. until the next "Y2K"
//   ERRORS LOGGED        → the minute of the hour
//   every new minute     → the year rolls from 99 to 00, gets read as 1900 → the screen freezes and glitches
//   every new hour       → a bigger crash that ends on the blue screen, like a system restart
//
// Click Start to open the Start menu. Try "Shut Down...".
// Drag the clock window around by its blue title bar.
//
// Play the programmer: double-click My Documents, read MISSION.txt,
// then open My Computer → 3½ Floppy (A:) and fix the bug in the wizard (scan → patch → test).
//
// Keys (for demos):
//   J jump to :59:55 to see the big crash on the hour   F fast-forward   G trigger a glitch   R back to real time

// ===================== EASY SETTINGS: try changing these! =====================

const DESKTOP_COLOR = '#3a6ea5'; // Windows Me desktop blue, shows around the wallpaper
const WALLPAPER_FIT = 'cover'; // 'cover' fills the screen, 'stretch' squashes to fit, 'center' leaves it at its own size
const FRAME_RATE = 12; // low on purpose: a 2000-era PC was not smooth

const LCD_ON = '#3dff6e'; // lit LCD segments
const LCD_OFF = '#0f2b17'; // unlit "ghost" segments

const WINDOW_TITLE = 'Y2K_CLOCK.EXE';
const FAST_SPEED = 20; // how fast the F key runs time

const WIKI_URL = 'https://en.wikipedia.org/wiki/Year_2000_problem';
const VIDEO_URL = 'https://www.youtube.com/watch?v=kyZDa09U7gc';

// the files inside My Documents. Click one to read its description, double-click to open it
const DOCUMENTS = [
  {
    name: 'Y2K_Crisis.htm',
    icon: 'Internet Explorer',
    open: 'wiki',
    desc:
      'THE YEAR 2000 PROBLEM\n\n' +
      'To save expensive memory, programmers from the 1960s to the 1980s stored years with only two digits: 1999 was just "99". ' +
      'When the date rolled over to 2000, "00" could be read as 1900.\n\n' +
      'Banks, airlines, power grids and governments spent hundreds of billions of dollars checking and fixing their code before midnight on December 31, 1999.\n\n' +
      'Double-click to read the full article on Wikipedia.',
  },
  {
    name: 'Y2K_Video',
    icon: 'Windows Media Player',
    open: 'video',
    desc: 'A video about the Y2K bug.\n\nDouble-click to watch it on YouTube.',
  },
  {
    name: 'MISSION.txt',
    icon: 'Text File',
    open: 'mission',
    desc: 'Your mission: fix the Y2K bug before midnight.\n\nDouble-click to read the instructions.',
  },
];

// the drives inside My Computer. The fix lives on the floppy disk
const COMPUTER_ITEMS = [
  {
    name: '3½ Floppy (A:)',
    icon: 'Y2K_FIX.EXE',
    open: 'fix',
    desc: 'Disk label: Y2K_FIX\n\nThis floppy holds Y2K_FIX.EXE, the Y2K Remediation Wizard.\n\nDouble-click to run it.',
  },
  {
    name: 'Local Disk (C:)',
    icon: 'Local Disk',
    open: '',
    desc: 'Capacity: 8.4 GB\nUsed: 2.1 GB\nFree: 6.3 GB\n\nWindows Me is installed here. CLOCK.DLL, the program with the Y2K bug, is in C:\\WINDOWS\\SYSTEM.',
  },
  {
    name: 'CD Drive (D:)',
    icon: 'CD Drive',
    open: '',
    desc: 'No disc in drive.',
  },
  {
    name: 'Control Panel',
    icon: 'Control Panel',
    open: '',
    desc: 'Use the settings in Control Panel to personalize your computer.',
  },
];

const MISSION_TEXT = [
  'MISSION: FIX THE Y2K BUG',
  '========================',
  '',
  'It is December 31, 1999.',
  'You are the programmer on call.',
  '',
  'CLOCK.DLL stores the year with only',
  '2 digits. At midnight "99" + 1 becomes',
  '"00", and the computer thinks it is',
  '1900. Every minute this desktop',
  'replays that crash.',
  '',
  'Fix it before midnight:',
  '',
  '1. Read Y2K_Crisis.htm to learn',
  '   what the bug is.',
  '2. Double-click My Computer, then',
  '   the floppy disk, 3½ Floppy (A:).',
  '3. In the wizard, click Next to',
  '   scan CLOCK.DLL for the bug.',
  '4. Type the full year, 1999, and',
  '   click Next to patch it.',
  '5. Click Next to run the test and',
  '   watch the clock reach midnight.',
  '',
  'If the date turns into 01/01/2000',
  'instead of 1900, you saved the',
  'millennium.',
];

// ==============================================================================

const TASKBAR_H = 28;
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
let startOpen = false;
let selectedIcon = null;

// windows opened from the desktop (My Documents, My Computer, Notepad, the wizard); the last one is on top
let openWindows = [];
let dragWin = null; // the app window being dragged, and where it was grabbed

// the fix: once patched, the rollover no longer crashes, and after the test it is the year 2000
let patched = false;
let in2000 = false;
let testRunning = false; // the wizard's midnight test is running on skipped-ahead time

// where the clock window is: null = centred, until you drag it by its title bar
let winPos = null;
let dragOffset = null;

let lastMinute = -1;
let glitchStart = -99999;
let glitchDur = 0;
let glitchType = ''; // 'minute' (stutter), 'hour' (stutter, then blue screen) or 'shutdown' (blue screen)
let bsodReason = '';
let waitCursor = false;
let holdFrames = 0; // how many more frames the frozen glitch picture hangs on screen
let clearTrails = false;

// after the first crash the system never recovers: dragging the clock leaves copies of it behind
let hasCrashed = false;
let trailLayer; // where those copies pile up
let fx = {}; // off-screen canvases for the glitch effect

// demo mode: use our own simulated time instead of the real clock
let simMode = false;
let simMs = 0;
let speed = 1;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(FRAME_RATE);
  // the wallpaper is an <img> in index.html, so it also works when you just double-click the file
  wallpaperImg = document.getElementById('wallpaper');
  makeLayers();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeLayers();
}

function makeLayers() {
  trailLayer = createGraphics(width, height);
  trailLayer.pixelDensity(1);
  fx.out = makeCanvas(); // the finished glitch picture
  fx.red = makeCanvas(); // red channel, for the colour split
  fx.cyan = makeCanvas(); // green + blue channels
  fx.small = document.createElement('canvas'); // for the blocky "compression damage"
}

function makeCanvas() {
  let c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function draw() {
  if (simMode) simMs += deltaTime * speed;
  let t = getTime();

  // every new minute is another 12/31/1999 → 01/01/00 rollover, and "00" gets read as 1900
  if (lastMinute !== -1 && t.m !== lastMinute) {
    let fast = speed > 1;
    if (patched) {
      // the patch works: "1999" + 1 = "2000"
      in2000 = true;
      if (testRunning) {
        // the test passed: move the wizard to its last page
        testRunning = false;
        let wizard = openWindows.find((w) => w instanceof FixWindow);
        if (wizard) wizard.step = 4;
        // the test skipped ahead in time, so go back to the real clock
        simMode = false;
        speed = 1;
        t = getTime();
      }
    } else if (t.m === 0) {
      triggerGlitch(fast ? 2000 : 4500, 'hour', '*  ALL ERRORS CLEARED. SYSTEM WILL RESTART.');
    } else {
      triggerGlitch(fast ? 700 : 2200, 'minute', '');
    }
    clearTrails = true;
  }
  lastMinute = t.m;

  // when each minute's crash is over, the window trails disappear
  if (clearTrails && !glitchActive()) {
    trailLayer.clear();
    clearTrails = false;
  }

  drawWallpaper();
  drawDesktopIcons();
  image(trailLayer, 0, 0);
  drawMainWindow(t);
  // a hung system doesn't repaint behind a moving window, so every frame of the drag stays behind
  // (once you've fixed the bug, the system is healthy again and stops leaving trails)
  if (dragOffset && hasCrashed && !in2000) stampMainWindow();
  for (let i = 0; i < openWindows.length; i++) {
    openWindows[i].display(i === openWindows.length - 1);
  }
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
  let h, m, s, ms;
  if (!simMode) {
    h = hour();
    m = minute();
    s = second();
    ms = Date.now() % 1000;
  } else {
    let d = new Date(simMs);
    h = d.getHours();
    m = d.getMinutes();
    s = d.getSeconds();
    ms = d.getMilliseconds();
  }
  // frac = how far through this minute (0–1)
  return { h: h, m: m, s: s, frac: (s + ms / 1000) / 60 };
}

function keyPressed() {
  // typing into Y2K_FIX.EXE takes priority over the demo keys
  let top = openWindows[openWindows.length - 1];
  if (top && top.typeKey(key, keyCode)) return false;

  let k = key.toLowerCase();
  if (k === 'f') {
    enterSim();
    speed = speed === 1 ? FAST_SPEED : 1;
  } else if (k === 'j') {
    enterSim();
    let d = new Date(simMs);
    d.setMinutes(59, 55, 0);
    simMs = d.getTime();
    lastMinute = 59;
  } else if (k === 'g') {
    triggerGlitch(2200, 'minute', '');
  } else if (k === 'r') {
    simMode = false;
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
      triggerGlitch(3000, 'shutdown', '*  CANNOT SHUT DOWN: IT IS STILL 1999.');
    }
    return;
  }

  // app windows come first, because they sit on top of everything else
  let w = topWindowAt(mouseX, mouseY);
  if (w) {
    bringToFront(w);
    if (w.onCloseButton(mouseX, mouseY)) openWindows.splice(openWindows.indexOf(w), 1);
    else if (w.onTitleBar(mouseX, mouseY)) dragWin = { win: w, dx: mouseX - w.x, dy: mouseY - w.y };
    else w.click(mouseX - w.x, mouseY - w.y);
    return;
  }

  // grab the clock window by its title bar (but not by the _ □ × buttons)
  let r = mainWindowRect();
  if (mouseX >= r.x + 3 && mouseX <= r.x + r.w - 62 && mouseY >= r.y + 3 && mouseY <= r.y + 23) {
    dragOffset = { x: mouseX - r.x, y: mouseY - r.y };
  }
  if (inRect(mouseX, mouseY, r)) return;

  // clicking a desktop icon selects it
  let ic = iconAt(mouseX, mouseY);
  selectedIcon = ic ? ic.name : null;
}

function doubleClicked() {
  let w = topWindowAt(mouseX, mouseY);
  if (w) {
    w.doubleClick(mouseX - w.x, mouseY - w.y);
    return;
  }
  if (inRect(mouseX, mouseY, mainWindowRect())) return;
  let ic = iconAt(mouseX, mouseY);
  if (ic) openIcon(ic.name);
}

function mouseDragged() {
  if (dragOffset) {
    winPos = { x: mouseX - dragOffset.x, y: mouseY - dragOffset.y };
  }
  if (dragWin) {
    let w = dragWin.win;
    w.x = constrain(mouseX - dragWin.dx, 80 - w.w, width - 80);
    w.y = constrain(mouseY - dragWin.dy, 0, height - TASKBAR_H - 24);
  }
}

function mouseReleased() {
  dragOffset = null;
  dragWin = null;
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

function iconPos(ic) {
  return { x: 38 + ic.col * 72, y: 26 + ic.row * 70 };
}

function iconAt(mx, my) {
  for (let ic of ICONS) {
    let p = iconPos(ic);
    if (mx >= p.x - 34 && mx <= p.x + 34 && my >= p.y - 18 && my <= p.y + 48) return ic;
  }
  return null;
}

function drawDesktopIcons() {
  for (let ic of ICONS) {
    let p = iconPos(ic);
    drawIcon(ic.name, p.x, p.y);

    textFont('Tahoma');
    textSize(11);
    textAlign(CENTER, TOP);
    noStroke();
    if (ic.name === selectedIcon) {
      // selected icons get a navy label, like Windows
      fill(10, 36, 106);
      let lw = min(textWidth(ic.name), 70) + 6;
      rect(p.x - lw / 2, p.y + 19, lw, ic.name.length > 12 ? 30 : 16);
    } else {
      fill(0, 0, 0, 170);
      text(ic.name, p.x - 34, p.y + 21, 70);
    }
    fill(255);
    text(ic.name, p.x - 35, p.y + 20, 70);
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
  } else if (name === 'Local Disk') {
    // a grey hard drive with a green activity light
    fill(FACE);
    rect(x - 15, y - 8, 30, 16, 2);
    fill(150);
    rect(x - 12, y + 1, 18, 3);
    noStroke();
    fill(0, 200, 0);
    rect(x + 9, y + 1, 3, 3);
  } else if (name === 'CD Drive') {
    // a drive with a shiny disc sticking out
    fill(FACE);
    rect(x - 15, y, 30, 12, 2);
    fill(230, 230, 245);
    circle(x, y - 4, 22);
    fill(FACE);
    circle(x, y - 4, 6);
    noStroke();
    fill(200, 170, 255, 120);
    arc(x, y - 4, 20, 20, PI, PI + HALF_PI);
  } else if (name === 'Control Panel') {
    // a folder with a little monitor and slider in front
    fill(225, 185, 55);
    rect(x - 14, y - 11, 12, 5, 2, 2, 0, 0);
    fill(250, 215, 90);
    rect(x - 14, y - 7, 28, 19);
    fill(FACE);
    rect(x - 8, y - 4, 14, 10);
    fill(0, 128, 128);
    rect(x - 6, y - 2, 10, 6);
    fill(200, 0, 0);
    rect(x + 6, y + 2, 5, 8);
  } else if (name === 'Text File') {
    // a sheet of paper with lines of text
    fill(255);
    rect(x - 10, y - 14, 20, 28);
    stroke(70, 70, 160);
    for (let ly = y - 8; ly <= y + 8; ly += 4) line(x - 6, ly, x + 6, ly);
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

// ---------- windows you can open: My Documents, Notepad, Y2K_FIX.EXE ----------

// every app window shares this frame: bevelled border, title bar, close button, dragging
class AppWindow {
  constructor(title, icon, w, h) {
    this.title = title;
    this.icon = icon;
    this.w = w;
    this.h = h;
    // open a little further down and right than the last window, like Windows does
    let n = openWindows.length;
    this.x = constrain(round(width / 2 - w / 2 - 60 + n * 26), 10, max(10, width - w - 10));
    this.y = constrain(50 + n * 26, 10, max(10, height - TASKBAR_H - h - 10));
  }

  contains(mx, my) {
    return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
  }

  onTitleBar(mx, my) {
    return mx >= this.x + 3 && mx <= this.x + this.w - 62 && my >= this.y + 3 && my <= this.y + 23;
  }

  onCloseButton(mx, my) {
    return mx >= this.x + this.w - 21 && mx <= this.x + this.w - 3 && my >= this.y + 5 && my <= this.y + 21;
  }

  display(active) {
    push();
    translate(this.x, this.y);
    bevel(0, 0, this.w, this.h, true);
    titleBar(3, 3, this.w - 6, 20, this.title, active, this.icon);
    this.drawContent();
    pop();
  }

  // each kind of window fills these in; (mx, my) is measured from the window's top-left corner
  drawContent() {}
  click(mx, my) {}
  doubleClick(mx, my) {}
  typeKey() {
    return false;
  }
}

// a folder (My Documents or My Computer), with the "web view" panel on the left that Windows Me folders had
class FolderWindow extends AppWindow {
  constructor(title, address, items) {
    super(title, title, 520, 400);
    this.address = address;
    this.items = items;
    this.selected = -1;
  }

  fileRect(i) {
    return { x: 196 + (i % 3) * 104, y: 84 + floor(i / 3) * 90, w: 96, h: 80 };
  }

  fileAt(mx, my) {
    for (let i = 0; i < this.items.length; i++) {
      if (inRect(mx, my, this.fileRect(i))) return i;
    }
    return -1;
  }

  drawContent() {
    let w = this.w;
    let h = this.h;
    drawMenuBar(['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'], 10, 35);

    // address bar
    fill(0);
    textAlign(LEFT, CENTER);
    text('Address', 8, 57);
    sunken(56, 48, w - 64, 18, color(255));
    drawSmallIcon(this.icon, 67, 57, 0.4);
    fill(0);
    textFont('Tahoma');
    textSize(11);
    textAlign(LEFT, CENTER);
    text(this.address, 80, 57);

    sunken(6, 72, w - 12, h - 100, color(255));

    // left panel: folder name, a blue rule, and the description of the selected file
    let doc = this.items[this.selected];
    noStroke();
    fill(0, 51, 153);
    textStyle(BOLD);
    textSize(doc ? 13 : 17);
    textAlign(LEFT, TOP);
    text(doc ? doc.name : this.title, 14, 82, 170);
    textStyle(NORMAL);
    let ctx = drawingContext;
    let g = ctx.createLinearGradient(14, 0, 184, 0);
    g.addColorStop(0, '#0a246a');
    g.addColorStop(1, '#ffffff');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(14, 106, 170, 2);
    ctx.restore();
    fill(0);
    textSize(11);
    text(doc ? doc.desc : 'Select an item to view its description.', 14, 116, 170, h - 150);

    // the files
    for (let i = 0; i < this.items.length; i++) {
      let r = this.fileRect(i);
      drawIcon(this.items[i].icon, r.x + r.w / 2, r.y + 20);
      textFont('Tahoma');
      textSize(11);
      textAlign(CENTER, TOP);
      noStroke();
      if (i === this.selected) {
        fill(10, 36, 106);
        rect(r.x + 4, r.y + 40, r.w - 8, 16);
        fill(255);
      } else {
        fill(0);
      }
      text(this.items[i].name, r.x + r.w / 2, r.y + 42);
    }

    // status bar
    sunken(6, h - 24, w - 12, 18, color(FACE));
    fill(0);
    textAlign(LEFT, CENTER);
    let status = this.items.length + ' object(s)';
    if (doc) status = doc.open ? 'Double-click to open ' + doc.name : doc.name;
    text(status, 12, h - 15);
  }

  click(mx, my) {
    this.selected = this.fileAt(mx, my);
  }

  doubleClick(mx, my) {
    let i = this.fileAt(mx, my);
    if (i >= 0) openItem(this.items[i]);
  }
}

// a plain Notepad window for .txt files
class NotepadWindow extends AppWindow {
  constructor(name, lines) {
    super(name + ' - Notepad', 'Text File', 340, 62 + lines.length * 15);
    this.lines = lines;
  }

  drawContent() {
    drawMenuBar(['File', 'Edit', 'Search', 'Help'], 10, 35);
    sunken(6, 46, this.w - 12, this.h - 52, color(255));
    noStroke();
    fill(0);
    textFont('Courier New');
    textSize(12);
    textAlign(LEFT, TOP);
    for (let i = 0; i < this.lines.length; i++) {
      text(this.lines[i], 12, 52 + i * 15);
    }
  }
}

// Y2K_FIX.EXE on the floppy disk: a classic Windows "wizard" (< Back, Next >, Cancel)
// that walks the player through fixing the bug: welcome → scan → patch → test → finish
class FixWindow extends AppWindow {
  constructor() {
    super('Y2K Remediation Wizard', 'Y2K_FIX.EXE', 500, 360);
    this.step = in2000 ? 4 : patched ? 3 : 0;
    this.typed = '';
    this.error = '';
    this.scanStart = 0;
  }

  // the three buttons along the bottom
  backRect() {
    return { x: this.w - 256, y: this.h - 34, w: 75, h: 23 };
  }
  nextRect() {
    return { x: this.w - 180, y: this.h - 34, w: 75, h: 23 };
  }
  cancelRect() {
    return { x: this.w - 88, y: this.h - 34, w: 75, h: 23 };
  }

  scanProgress() {
    return constrain((millis() - this.scanStart) / 2500, 0, 1);
  }

  canGoBack() {
    return this.step === 1 || this.step === 2;
  }

  canGoNext() {
    if (this.step === 1) return this.scanProgress() >= 1;
    if (this.step === 3) return !testRunning;
    return true;
  }

  drawContent() {
    let w = this.w;
    let h = this.h;

    // the blue banner down the left side
    let ctx = drawingContext;
    let g = ctx.createLinearGradient(0, 26, 0, h - 50);
    g.addColorStop(0, '#0a246a');
    g.addColorStop(0.6, '#3a6ea5');
    g.addColorStop(1, '#a6caf0');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(4, 26, 140, h - 76);
    ctx.restore();
    drawSmallIcon('Y2K_FIX.EXE', 74, 100, 1.7);
    drawSmallIcon('My Computer', 104, 140, 1);
    noStroke();
    fill(255);
    textFont('Tahoma');
    textStyle(BOLD);
    textSize(15);
    textAlign(LEFT, TOP);
    text('Y2K\nRemediation\nWizard', 16, 180);
    textStyle(NORMAL);
    textSize(10);
    fill(220, 230, 255);
    text('Version 1.0  ·  1999', 16, h - 70);

    // white page on the right, like the real wizards
    noStroke();
    fill(255);
    rect(144, 26, w - 148, h - 76);
    let x = 160;
    let tw = w - 176;

    let titles = ['Welcome to the Y2K Remediation Wizard', 'Step 1 of 3: Scan', 'Step 2 of 3: Patch', 'Step 3 of 3: Test', 'Completing the Y2K Remediation Wizard'];
    fill(0);
    textStyle(BOLD);
    textSize(14);
    textAlign(LEFT, TOP);
    text(titles[this.step], x, 38, tw);
    textStyle(NORMAL);
    textSize(11);

    if (this.step === 0) {
      text(
        'It is December 31, 1999. CLOCK.DLL still stores the year with only two digits, so at midnight the computer will think it is 1900.\n\n' +
          'This wizard will help you find the bug, fix it and test it before midnight.\n\n' +
          'To continue, click Next.',
        x, 76, tw, 200
      );
    } else if (this.step === 1) {
      let p = this.scanProgress();
      if (p < 1) {
        text('Scanning C:\\WINDOWS\\SYSTEM\\CLOCK.DLL...', x, 76, tw);
        drawProgressBar(x, 100, tw, 20, p);
        text(floor(p * 100) + '% complete', x, 128);
      } else {
        text('Bug found on line 10! The year only has room for 2 digits, so "99" + 1 becomes "00", and the computer reads it as 1900.', x, 76, tw, 60);
        drawCode(x, 132, tw, ['10  DIM YEAR AS STRING * 2', '20  YEAR = "99"', '30  NEXTYEAR = YEAR + 1', '40  PRINT "19" + NEXTYEAR'], 0, false);
        fill(0);
        textFont('Tahoma');
        textSize(11);
        textAlign(LEFT, TOP);
        text('To fix it, click Next.', x, 246, tw);
      }
    } else if (this.step === 2) {
      text('Make room for all 4 digits of the year. Type the current year in full, then click Next.', x, 76, tw, 40);
      let caret = frameCount % 12 < 6 ? '_' : ' ';
      drawCode(x, 118, tw, ['10  DIM YEAR AS STRING * 4', '20  YEAR = "' + this.typed + caret + '"'], -1, false);
      fill(0);
      textFont('Tahoma');
      textSize(11);
      textAlign(LEFT, CENTER);
      text('Year:', x, 196);
      sunken(x + 40, 185, 90, 22, color(255));
      fill(0);
      textFont('Courier New');
      textSize(15);
      text(this.typed + caret, x + 46, 196);
      if (this.error) {
        fill(200, 0, 0);
        textFont('Tahoma');
        textSize(11);
        textAlign(LEFT, TOP);
        text(this.error, x, 220, tw, 40);
      }
    } else if (this.step === 3) {
      text(testRunning ? 'Testing... 5 seconds to midnight. Watch Y2K_CLOCK.EXE!' : 'Patch applied! CLOCK.DLL now stores the year with 4 digits.\n\nTo run the clock up to midnight and see which year comes next, click Next.', x, 76, tw, 70);
      drawCode(x, 150, tw, ['10  DIM YEAR AS STRING * 4', '20  YEAR = "1999"', '30  NEXTYEAR = YEAR + 1', '40  PRINT NEXTYEAR'], 0, true);
    } else {
      text('The clock rolled over to 01/01/2000, not 1900.\n\nYou saved the millennium! Happy New Year.\n\nTo close this wizard, click Finish.', x, 76, tw, 120);
      fill(0, 128, 0);
      textStyle(BOLD);
      textSize(14);
      text('✓  SYSTEM IS Y2K COMPLIANT', x, 200, tw);
      textStyle(NORMAL);
    }

    // an etched line above the buttons, then < Back, Next >, Cancel
    stroke(128);
    line(4, h - 46, w - 4, h - 46);
    stroke(255);
    line(4, h - 45, w - 4, h - 45);
    noStroke();
    drawButton(this.backRect(), '< Back', this.canGoBack());
    let nextLabel = this.step === 4 ? 'Finish' : this.step === 3 && testRunning ? 'Testing...' : 'Next >';
    drawButton(this.nextRect(), nextLabel, this.canGoNext());
    drawButton(this.cancelRect(), 'Cancel', true);
  }

  click(mx, my) {
    if (inRect(mx, my, this.cancelRect())) {
      closeWindow(this);
    } else if (inRect(mx, my, this.backRect()) && this.canGoBack()) {
      this.step--;
      this.error = '';
    } else if (inRect(mx, my, this.nextRect()) && this.canGoNext()) {
      this.next();
    }
  }

  next() {
    if (this.step === 0) {
      this.step = 1;
      this.scanStart = millis();
    } else if (this.step === 1) {
      this.step = 2;
    } else if (this.step === 2) {
      this.applyPatch();
    } else if (this.step === 3) {
      runMidnightTest();
    } else {
      closeWindow(this);
    }
  }

  applyPatch() {
    if (this.typed === '1999') {
      patched = true;
      this.step = 3;
      this.error = '';
    } else {
      this.error = 'That is not right. It is December 31, 1999: type all 4 digits of the year.';
      this.typed = '';
    }
  }

  typeKey(k, code) {
    if (this.step !== 2) return false;
    if (code === BACKSPACE) this.typed = this.typed.slice(0, -1);
    else if (code === ENTER || code === RETURN) this.applyPatch();
    else if (k >= '0' && k <= '9' && k.length === 1 && this.typed.length < 4) this.typed += k;
    return true;
  }
}

// skip ahead to 5 seconds before the next rollover, to see whether the patch works
function runMidnightTest() {
  enterSim();
  let d = new Date(simMs);
  d.setSeconds(55, 0);
  simMs = d.getTime();
  lastMinute = d.getMinutes();
  testRunning = true;
}

// a black code listing; one line can be marked red (the bug) or green (fixed)
function drawCode(x, y, w, lines, mark, fixed) {
  sunken(x, y, w, lines.length * 22 + 10, color(0));
  textFont('VT323');
  textSize(18);
  textAlign(LEFT, CENTER);
  for (let i = 0; i < lines.length; i++) {
    let ly = y + 16 + i * 22;
    noStroke();
    if (i === mark && (fixed || frameCount % 12 < 8)) {
      fill(fixed ? color(0, 90, 30) : color(170, 0, 0));
      rect(x + 3, ly - 10, w - 6, 20);
    }
    fill(i === mark && !fixed ? 255 : LCD_ON);
    text(lines[i], x + 8, ly);
  }
}

// a Windows Me progress bar made of navy blocks
function drawProgressBar(x, y, w, h, p) {
  sunken(x, y, w, h, color(255));
  let blocks = floor((w - 4) / 10);
  noStroke();
  fill(10, 36, 106);
  for (let i = 0; i < floor(blocks * p); i++) {
    rect(x + 3 + i * 10, y + 3, 8, h - 5);
  }
}

function openItem(item) {
  if (item.open === 'wiki') window.open(WIKI_URL, '_blank');
  else if (item.open === 'video') window.open(VIDEO_URL, '_blank');
  else if (item.open === 'mission') openOrFocus('MISSION.txt - Notepad', () => new NotepadWindow('MISSION.txt', MISSION_TEXT));
  else if (item.open === 'fix') openOrFocus('Y2K Remediation Wizard', () => new FixWindow());
}

function openIcon(name) {
  if (name === 'My Documents') openOrFocus('My Documents', () => new FolderWindow('My Documents', 'C:\\My Documents', DOCUMENTS));
  else if (name === 'My Computer') openOrFocus('My Computer', () => new FolderWindow('My Computer', 'My Computer', COMPUTER_ITEMS));
}

// bring a window forward if it's already open (matched by its title), otherwise open it
function openOrFocus(title, make) {
  let w = openWindows.find((win) => win.title === title);
  if (w) bringToFront(w);
  else openWindows.push(make());
}

function closeWindow(w) {
  openWindows.splice(openWindows.indexOf(w), 1);
}

function bringToFront(w) {
  openWindows.splice(openWindows.indexOf(w), 1);
  openWindows.push(w);
}

function topWindowAt(mx, my) {
  for (let i = openWindows.length - 1; i >= 0; i--) {
    if (openWindows[i].contains(mx, my)) return openWindows[i];
  }
  return null;
}

function inRect(mx, my, r) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

function drawButton(r, label, enabled) {
  bevel(r.x, r.y, r.w, r.h, true);
  noStroke();
  fill(enabled ? 0 : 128);
  textFont('Tahoma');
  textSize(11);
  textAlign(CENTER, CENTER);
  text(label, r.x + r.w / 2, r.y + r.h / 2);
}

// menu bar, with the first letter underlined like a real Windows menu
function drawMenuBar(items, x, y) {
  noStroke();
  textFont('Tahoma');
  textSize(11);
  textAlign(LEFT, CENTER);
  for (let item of items) {
    fill(0);
    text(item, x, y);
    stroke(0);
    line(x, y + 6, x + textWidth(item[0]), y + 6);
    noStroke();
    x += textWidth(item) + 14;
  }
}

// ---------- main window ----------

function mainWindowRect() {
  let w = min(540, width - 32);
  let h = 280;
  let x = floor((width - w) / 2);
  let y = floor((height - TASKBAR_H - h) / 2);
  if (winPos) {
    // keep enough of the title bar on screen that you can always grab it again
    x = constrain(round(winPos.x), 80 - w, width - 80);
    y = constrain(round(winPos.y), 0, height - TASKBAR_H - 24);
  }
  return { x, y, w, h };
}

function drawMainWindow(t) {
  let r = mainWindowRect();
  let x = r.x;
  let y = r.y;
  let w = r.w;
  let h = r.h;

  bevel(x, y, w, h, true);
  let title = WINDOW_TITLE + (speed > 1 ? ' - [Demo x' + speed + ']' : '');
  // the clock only has the blue "active" title bar when no other window is open on top of it
  titleBar(x + 3, y + 3, w - 6, 20, title, openWindows.length === 0, 'clock');
  drawMenuBar(['File', 'Edit', 'View', 'Help'], x + 10, y + 35);

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
  } else if (in2000) {
    // fixed! the computer finally reaches the year 2000
    fill(LCD_ON);
    text('SYS DATE  01/01/2000  ' + nf(t.h, 2) + ':' + nf(t.m, 2) + ':' + nf(t.s, 2) + '  OK', lx + lw / 2, ly + 108);
  } else {
    fill(LCD_ON);
    text('SYS DATE  12/31/1999  23:59:' + nf(t.s, 2), lx + lw / 2, ly + 108);
  }

  // progress bar = seconds: fills up once a minute, then the year 2000 "arrives"
  let frac = in2000 ? 1 : t.frac;
  let pct = floor(frac * 100);
  fill(0);
  textFont('Tahoma');
  textSize(11);
  textAlign(LEFT, CENTER);
  text(in2000 ? 'Welcome to the year 2000.  100%' : 'Preparing for the year 2000...  ' + pct + '%', x + 12, y + 194);

  let px = x + 10;
  let py = y + 206;
  let pw = w - 20;
  let ph = 20;
  sunken(px, py, pw, ph, color(255));
  let blocks = floor((pw - 4) / 10);
  let filled = floor(blocks * frac);
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
  text(in2000 ? 'Y2K COMPLIANT  ✓' : 'T-MINUS ' + (60 - t.s) + 's TO Y2K', x + 16, sy + 11);
  text('ERRORS LOGGED: ' + (in2000 ? 0 : t.m), x + 20 + half, sy + 11);
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

function triggerGlitch(dur, type, reason) {
  glitchStart = millis();
  glitchDur = dur;
  glitchType = type;
  bsodReason = reason;
  startOpen = false;
  holdFrames = 0;
  hasCrashed = true;
}

function glitchActive() {
  return millis() - glitchStart < glitchDur;
}

function drawGlitch() {
  let elapsed = millis() - glitchStart;
  // the hourly crash stutters first, then ends on the blue screen; Shut Down goes straight to it
  let stutterEnd = glitchDur;
  if (glitchType === 'hour') stutterEnd = glitchDur * 0.55;
  if (glitchType === 'shutdown') stutterEnd = 0;

  if (elapsed >= stutterEnd) {
    drawBSOD();
    return;
  }

  // real stutter: most frames the screen just hangs on the last picture, then it jumps ahead
  if (holdFrames > 0) {
    holdFrames--;
  } else {
    composeGlitchFrame(elapsed / stutterEnd);
    holdFrames = random([0, 1, 1, 2, 3, 5]);
  }
  drawingContext.drawImage(fx.out, 0, 0);
}

// builds one corrupted frame from what is on screen right now, into fx.out
function composeGlitchFrame(p) {
  let src = drawingContext.canvas;
  let o = fx.out.getContext('2d');
  o.globalCompositeOperation = 'source-over';
  o.drawImage(src, 0, 0);

  // 1. the clock window "smears" into a cascade of copies that grows as the crash goes on
  let r = mainWindowRect();
  let copies = 2 + floor(p * 10);
  for (let k = copies; k >= 0; k--) {
    copyRegion(o, src, r.x, r.y, r.w, r.h, r.x - k * 16, r.y - k * 24);
  }

  // 2. colour split: pull the red channel apart from green + blue and slide it sideways
  tintCopy(fx.red, fx.out, 'rgb(255, 0, 0)');
  tintCopy(fx.cyan, fx.out, 'rgb(0, 255, 255)');
  o.fillStyle = '#000';
  o.fillRect(0, 0, width, height);
  o.globalCompositeOperation = 'lighter';
  o.drawImage(fx.cyan, 0, 0);
  o.drawImage(fx.red, random(5, 16), random(-2, 2));

  // 3. washed-out teal, like a worn VHS tape
  o.globalCompositeOperation = 'multiply';
  o.fillStyle = 'rgb(170, 232, 228)';
  o.fillRect(0, 0, width, height);
  o.globalCompositeOperation = 'screen';
  o.fillStyle = 'rgba(0, 80, 90, 0.35)';
  o.fillRect(0, 0, width, height);

  // 4. a hot pink flare band across the screen
  let by = random(height * 0.25, height * 0.75);
  let flare = o.createLinearGradient(0, by - 70, 0, by + 70);
  flare.addColorStop(0, 'rgba(255, 40, 140, 0)');
  flare.addColorStop(0.5, 'rgba(255, 40, 140, 0.55)');
  flare.addColorStop(1, 'rgba(255, 40, 140, 0)');
  o.fillStyle = flare;
  o.fillRect(0, by - 70, width, 140);
  o.globalCompositeOperation = 'source-over';

  // 5. torn horizontal strips, shifted left and right
  for (let i = 0; i < 12; i++) {
    let sy = floor(random(height));
    let sh = min(floor(random(3, 30)), height - sy);
    if (sh > 0) o.drawImage(fx.out, 0, sy, width, sh, random(-50, 50), sy, width, sh);
  }

  // 6. blocky compression damage: shrink a patch, then blow it back up without smoothing
  let s = fx.small.getContext('2d');
  for (let i = 0; i < 6; i++) {
    let bw = floor(random(60, 320));
    let bh = floor(random(16, 110));
    let bx = floor(random(width - bw));
    let byy = floor(random(height - bh));
    fx.small.width = ceil(bw / 8);
    fx.small.height = ceil(bh / 8);
    s.drawImage(fx.out, bx, byy, bw, bh, 0, 0, fx.small.width, fx.small.height);
    o.imageSmoothingEnabled = false;
    o.drawImage(fx.small, 0, 0, fx.small.width, fx.small.height, bx, byy, bw, bh);
    o.imageSmoothingEnabled = true;
  }

  // 7. signal noise: short streaks of blue, white, black, pink and cyan
  let streaks = ['rgba(40, 70, 255, 0.75)', 'rgba(255, 255, 255, 0.6)', 'rgba(0, 0, 0, 0.45)', 'rgba(255, 60, 200, 0.6)', 'rgba(0, 210, 230, 0.6)'];
  for (let i = 0; i < 160; i++) {
    o.fillStyle = random(streaks);
    o.fillRect(random(width), random(height), random(10, 220), random(1, 3));
  }

  // 8. scanlines
  o.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let y = 0; y < height; y += 3) {
    o.fillRect(0, y, width, 1);
  }
}

// copy dst <- src, keeping only one colour channel (multiply by a pure colour)
function tintCopy(dst, src, col) {
  let d = dst.getContext('2d');
  d.globalCompositeOperation = 'source-over';
  d.drawImage(src, 0, 0);
  d.globalCompositeOperation = 'multiply';
  d.fillStyle = col;
  d.fillRect(0, 0, width, height);
  d.globalCompositeOperation = 'source-over';
}

// copy a rectangle of src to (dx, dy) on ctx, skipping any part that is off screen
function copyRegion(ctx, src, x, y, w, h, dx, dy) {
  let sx = max(0, x);
  let sy = max(0, y);
  let sw = min(x + w, width) - sx;
  let sh = min(y + h, height) - sy;
  if (sw <= 0 || sh <= 0) return;
  ctx.drawImage(src, sx, sy, sw, sh, dx + (sx - x), dy + (sy - y), sw, sh);
}

// leave a copy of the clock window on the trail layer, where it stays
function stampMainWindow() {
  let r = mainWindowRect();
  copyRegion(trailLayer.drawingContext, drawingContext.canvas, r.x, r.y, r.w, r.h, r.x, r.y);
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
// icon is 'clock' for the clock window, the name of a drawIcon() icon, or nothing
function titleBar(x, y, w, h, label, active, icon) {
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
  if (icon === 'clock') {
    drawClockIcon(x + 3, y + 3, h - 6);
    tx = x + h + 2;
  } else if (icon) {
    drawSmallIcon(icon, x + h / 2, y + h / 2, 0.45);
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
