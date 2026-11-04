const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputOpen = path.join(__dirname, '../public/assets/aistudio/image_d187cf32.png');
const inputClosed = path.join(__dirname, '../public/assets/aistudio/Neon_Sci-Fi_Crate_Collection_c92ce232.png');

const outDirSrc = path.join(__dirname, '../src/assets/images/crates');
const outDirPub = path.join(__dirname, '../public/assets/crates');

if (!fs.existsSync(outDirSrc)) fs.mkdirSync(outDirSrc, { recursive: true });
if (!fs.existsSync(outDirPub)) fs.mkdirSync(outDirPub, { recursive: true });

const srcOpen = PNG.sync.read(fs.readFileSync(inputOpen));
const srcClosed = PNG.sync.read(fs.readFileSync(inputClosed));

function isBlackBg(r, g, b) {
  return r <= 15 && g <= 15 && b <= 15;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function extractCrate(src, cx, cy, width, height) {
  const dst = new PNG({ width, height });
  const startX = Math.round(cx - width / 2);
  const startY = Math.round(cy - height / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = startX + x;
      const sy = startY + y;
      const dIdx = (y * width + x) * 4;
      if (sx < 0 || sx >= src.width || sy < 0 || sy >= src.height) {
        dst.data[dIdx + 3] = 0;
        continue;
      }
      const sIdx = (sy * src.width + sx) * 4;
      dst.data[dIdx] = src.data[sIdx];
      dst.data[dIdx + 1] = src.data[sIdx + 1];
      dst.data[dIdx + 2] = src.data[sIdx + 2];
      dst.data[dIdx + 3] = 255;
    }
  }

  // Flood fill from borders to identify pure background
  const isBg = new Uint8Array(width * height);
  const queue = [];
  for (let x = 0; x < width; x++) {
    const idx0 = x * 4;
    const idx1 = ((height - 1) * width + x) * 4;
    if (isBlackBg(dst.data[idx0], dst.data[idx0+1], dst.data[idx0+2])) {
      isBg[x] = 1;
      queue.push(x);
    }
    if (isBlackBg(dst.data[idx1], dst.data[idx1+1], dst.data[idx1+2])) {
      const pos = (height - 1) * width + x;
      isBg[pos] = 1;
      queue.push(pos);
    }
  }
  for (let y = 0; y < height; y++) {
    const idx0 = (y * width) * 4;
    const idx1 = (y * width + (width - 1)) * 4;
    if (isBlackBg(dst.data[idx0], dst.data[idx0+1], dst.data[idx0+2])) {
      const pos = y * width;
      isBg[pos] = 1;
      queue.push(pos);
    }
    if (isBlackBg(dst.data[idx1], dst.data[idx1+1], dst.data[idx1+2])) {
      const pos = y * width + (width - 1);
      isBg[pos] = 1;
      queue.push(pos);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const pos = queue[head++];
    const px = pos % width;
    const py = Math.floor(pos / width);

    const neighbors = [
      [px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!isBg[nPos]) {
          const nIdx = nPos * 4;
          if (isBlackBg(dst.data[nIdx], dst.data[nIdx+1], dst.data[nIdx+2])) {
            isBg[nPos] = 1;
            queue.push(nPos);
          }
        }
      }
    }
  }

  // Alpha feathering and de-fringing
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      const idx = pos * 4;
      if (isBg[pos]) {
        dst.data[idx + 3] = 0;
      } else {
        const touches = (
          (x > 0 && isBg[pos - 1]) ||
          (x < width - 1 && isBg[pos + 1]) ||
          (y > 0 && isBg[pos - width]) ||
          (y < height - 1 && isBg[pos + width])
        );
        if (touches) {
          const r = dst.data[idx];
          const g = dst.data[idx+1];
          const b = dst.data[idx+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          dst.data[idx + 3] = Math.max(10, Math.min(255, Math.round(lum * 3.5)));
        }
      }
    }
  }

  return dst;
}

function shiftToPurple(png) {
  const dst = new PNG({ width: png.width, height: png.height });
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const a = png.data[i + 3];

    dst.data[i + 3] = a;
    if (a === 0) continue;

    const [h, s, l] = rgbToHsl(r, g, b);
    if (s > 0.12) {
      // Shift hue to royal purple: 270 / 360 = 0.75
      const [newR, newG, newB] = hslToRgb(0.75, Math.min(1.0, s * 1.05), l);
      dst.data[i] = newR;
      dst.data[i + 1] = newG;
      dst.data[i + 2] = newB;
    } else {
      dst.data[i] = r;
      dst.data[i + 1] = g;
      dst.data[i + 2] = b;
    }
  }
  return dst;
}

// 7 Colors coordinates for open containers (360 x 345 standard)
const openDefs = [
  { color: 'pink',   cx: 194, cy: 306, w: 360, h: 345 },
  { color: 'ice',    cx: 578, cy: 306, w: 360, h: 345 },
  { color: 'yellow', cx: 959, cy: 306, w: 360, h: 345 },
  { color: 'lime',   cx: 1344, cy: 306, w: 360, h: 345 },
  { color: 'cyan',   cx: 311, cy: 716, w: 400, h: 350 },
  { color: 'orange', cx: 754, cy: 716, w: 400, h: 350 },
  { color: 'red',    cx: 1195, cy: 716, w: 400, h: 350 },
];

// 7 Colors coordinates for closed crates (360 x 285 standard)
const closedDefs = [
  { color: 'pink',   cx: 193, cy: 317, w: 353, h: 282 },
  { color: 'ice',    cx: 576, cy: 317, w: 354, h: 282 },
  { color: 'yellow', cx: 960, cy: 317, w: 354, h: 282 },
  { color: 'lime',   cx: 1343, cy: 317, w: 351, h: 282 },
  { color: 'cyan',   cx: 280, cy: 696, w: 400, h: 294 },
  { color: 'orange', cx: 757, cy: 696, w: 403, h: 294 },
  { color: 'red',    cx: 1246, cy: 696, w: 401, h: 294 },
];

console.log('Extracting open containers...');
let pinkOpenPng = null;
for (const def of openDefs) {
  const png = extractCrate(srcOpen, def.cx, def.cy, def.w, def.h);
  if (def.color === 'pink') pinkOpenPng = png;
  const buf = PNG.sync.write(png);
  fs.writeFileSync(path.join(outDirSrc, `crate_open_${def.color}.png`), buf);
  fs.writeFileSync(path.join(outDirPub, `crate_open_${def.color}.png`), buf);
  console.log(`Saved crate_open_${def.color}.png`);
}

// Generate purple open
if (pinkOpenPng) {
  const purpleOpen = shiftToPurple(pinkOpenPng);
  const buf = PNG.sync.write(purpleOpen);
  fs.writeFileSync(path.join(outDirSrc, 'crate_open_purple.png'), buf);
  fs.writeFileSync(path.join(outDirPub, 'crate_open_purple.png'), buf);
  console.log('Saved crate_open_purple.png');
}

console.log('Extracting closed crates...');
let pinkClosedPng = null;
for (const def of closedDefs) {
  const png = extractCrate(srcClosed, def.cx, def.cy, def.w, def.h);
  if (def.color === 'pink') pinkClosedPng = png;
  const buf = PNG.sync.write(png);
  fs.writeFileSync(path.join(outDirSrc, `crate_closed_${def.color}.png`), buf);
  fs.writeFileSync(path.join(outDirPub, `crate_closed_${def.color}.png`), buf);
  console.log(`Saved crate_closed_${def.color}.png`);
}

// Generate purple closed
if (pinkClosedPng) {
  const purpleClosed = shiftToPurple(pinkClosedPng);
  const buf = PNG.sync.write(purpleClosed);
  fs.writeFileSync(path.join(outDirSrc, 'crate_closed_purple.png'), buf);
  fs.writeFileSync(path.join(outDirPub, 'crate_closed_purple.png'), buf);
  console.log('Saved crate_closed_purple.png');

  // Generate mystery closed crate (sleek dark cyber metallic indigo with neon highlights)
  const mysteryClosed = new PNG({ width: pinkClosedPng.width, height: pinkClosedPng.height });
  for (let i = 0; i < pinkClosedPng.data.length; i += 4) {
    const r = pinkClosedPng.data[i];
    const g = pinkClosedPng.data[i + 1];
    const b = pinkClosedPng.data[i + 2];
    const a = pinkClosedPng.data[i + 3];

    mysteryClosed.data[i + 3] = a;
    if (a === 0) continue;

    const [h, s, l] = rgbToHsl(r, g, b);
    if (s > 0.08) {
      // Dark cyber metallic indigo/slate
      const [newR, newG, newB] = hslToRgb(0.70, 0.40, Math.min(0.85, l * 0.88));
      mysteryClosed.data[i] = newR;
      mysteryClosed.data[i + 1] = newG;
      mysteryClosed.data[i + 2] = newB;
    } else {
      mysteryClosed.data[i] = r;
      mysteryClosed.data[i + 1] = g;
      mysteryClosed.data[i + 2] = b;
    }
  }
  const mBuf = PNG.sync.write(mysteryClosed);
  fs.writeFileSync(path.join(outDirSrc, 'crate_mystery.png'), mBuf);
  fs.writeFileSync(path.join(outDirPub, 'crate_mystery.png'), mBuf);
  console.log('Saved crate_mystery.png');
}

console.log('All crate assets (8 open, 8 closed, 1 mystery) extracted successfully!');
