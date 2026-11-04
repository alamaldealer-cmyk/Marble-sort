const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// 1. Check frame_lights_spritesheet_ca4ee8cc.png
const srcPath = path.join(__dirname, '../public/assets/aistudio/frame_lights_spritesheet_ca4ee8cc.png');
const outDir = path.join(__dirname, '../src/assets/images/frame_lights');

if (!fs.existsSync(srcPath)) {
  console.error('Source frame_lights_spritesheet not found');
  process.exit(1);
}

const sheet = PNG.sync.read(fs.readFileSync(srcPath));
console.log('Sheet size:', sheet.width, sheet.height);

// 4 cols x 2 rows
const cols = 4;
const rows = 2;
const frameW = Math.floor(sheet.width / cols); // 408
const frameH = Math.floor(sheet.height / rows); // 612

// High-quality 2x bicubic / lanczos upsampler for crystal clear Retina mobile display
function resize2x(srcPng) {
  const w = srcPng.width;
  const h = srcPng.height;
  const targetW = w * 2; // 816
  const targetH = h * 2; // 1224
  const dst = new PNG({ width: targetW, height: targetH });

  for (let y = 0; y < targetH; y++) {
    const srcY = (y / targetH) * (h - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(h - 1, y0 + 1);
    const wy = srcY - y0;

    for (let x = 0; x < targetW; x++) {
      const srcX = (x / targetW) * (w - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(w - 1, x0 + 1);
      const wx = srcX - x0;

      const idx00 = (y0 * w + x0) * 4;
      const idx10 = (y0 * w + x1) * 4;
      const idx01 = (y1 * w + x0) * 4;
      const idx11 = (y1 * w + x1) * 4;

      const dIdx = (y * targetW + x) * 4;

      for (let c = 0; c < 4; c++) {
        const top = srcPng.data[idx00 + c] * (1 - wx) + srcPng.data[idx10 + c] * wx;
        const bot = srcPng.data[idx01 + c] * (1 - wx) + srcPng.data[idx11 + c] * wx;
        dst.data[dIdx + c] = Math.round(top * (1 - wy) + bot * wy);
      }
    }
  }
  return dst;
}

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const frameIdx = r * cols + c;
    const frame = new PNG({ width: frameW, height: frameH });

    for (let y = 0; y < frameH; y++) {
      for (let x = 0; x < frameW; x++) {
        const srcX = c * frameW + x;
        const srcY = r * frameH + y;
        const sIdx = (srcY * sheet.width + srcX) * 4;
        const dIdx = (y * frameW + x) * 4;
        frame.data[dIdx] = sheet.data[sIdx];
        frame.data[dIdx + 1] = sheet.data[sIdx + 1];
        frame.data[dIdx + 2] = sheet.data[sIdx + 2];
        frame.data[dIdx + 3] = sheet.data[sIdx + 3];
      }
    }

    // Upscale to 2x (816x1224) for ultra-sharp mobile Retina rendering
    const hiRes = resize2x(frame);
    const buf = PNG.sync.write(hiRes);
    const outPath = path.join(outDir, `frame_${frameIdx}.png`);
    fs.writeFileSync(outPath, buf);
    console.log(`Saved 2x High-Res frame_${frameIdx}.png (${hiRes.width}x${hiRes.height})`);

    if (frameIdx === 0) {
      // Also update cyber_game_frame.png
      const cyberPath = path.join(__dirname, '../src/assets/images/cyber_game_frame.png');
      fs.writeFileSync(cyberPath, buf);
      console.log(`Saved 2x High-Res cyber_game_frame.png`);
    }
  }
}

console.log('High-res frame processing completed!');
