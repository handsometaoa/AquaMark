/**
 * 生成扩展图标：蓝紫渐变圆角方块 + 白色水滴 + 隐约的对角水印条纹。
 * 纯 Node 实现（SDF 光栅化 + 手写 PNG 编码），无需任何依赖。
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icon');

/* ---------- PNG 编码 ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- 绘制 ---------- */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function sdRound(px, py, half, r) {
  const qx = Math.abs(px) - half + r;
  const qy = Math.abs(py) - half + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
function sdBar(px, py, cx, cy, hw, hl, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const dx = px - cx, dy = py - cy;
  const lx = dx * c + dy * s;
  const ly = -dx * s + dy * c;
  const qx = Math.abs(lx) - hl;
  const qy = Math.abs(ly) - hw;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
}

function render(size) {
  const S = 4;
  const N = size * S;
  const AA = (1.6 * 2) / N;
  const rot = (-28 * Math.PI) / 180;
  const rgba = Buffer.alloc(size * size * 4);

  // 水滴：上尖锥 + 下圆，平滑并集
  const tipY = -0.6, cy = 0.22, rDrop = 0.34;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const u = (x * S + sx + 0.5) / N;
          const v = (y * S + sy + 0.5) / N;
          const p = u * 2 - 1;
          const q = v * 2 - 1;

          // 背景：圆角方块 + 蓝→紫渐变 + 左上高光
          const bgA = 1 - sstep(-AA, AA, sdRound(p, q, 1.0, 0.45));
          const t = clamp01(u * 0.55 + v * 0.5);
          let r = mix(58, 138, t), g = mix(140, 90, t), b = mix(255, 245, t);
          const glow = Math.exp(-((p + 0.65) ** 2 + (q + 0.75) ** 2) / 1.1) * 0.3;
          r = mix(r, 255, glow); g = mix(g, 255, glow); b = mix(b, 255, glow);

          // 隐约的水印条纹（呼应产品）
          const s1 = 1 - sstep(-AA, AA, sdBar(p, q, 0.1, -0.12, 0.085, 1.4, rot));
          const s2 = 1 - sstep(-AA, AA, sdBar(p, q, -0.15, 0.62, 0.05, 1.25, rot));
          const streak = s1 * 0.11 + s2 * 0.07;
          r = mix(r, 255, streak); g = mix(g, 255, streak); b = mix(b, 255, streak);

          // 水滴
          const dCircle = Math.hypot(p, q - cy) - rDrop;
          let cone;
          if (q < tipY) cone = Math.hypot(p, tipY - q);
          else if (q <= cy) {
            const hw = rDrop * ((q - tipY) / (cy - tipY));
            cone = Math.abs(p) - hw;
          } else cone = 1e9;
          const k = 0.09;
          const hMix = clamp01(0.5 + (0.5 * (dCircle - cone)) / k);
          const d = mix(dCircle, cone, hMix) - k * hMix * (1 - hMix);
          const dropA = 1 - sstep(-AA, AA, d);

          // 水滴体色：上白下微蓝 + 左上高光点
          const shade = clamp01((q + 0.6) / 1.3) * 0.45;
          let dr = mix(255, 205, shade), dg = mix(255, 224, shade), db = mix(255, 246, shade);
          const hl = 1 - sstep(0.045, 0.1, Math.hypot(p + 0.13, q - 0.06));
          dr = mix(dr, 255, hl * 0.9); dg = mix(dg, 255, hl * 0.9); db = mix(db, 255, hl * 0.9);

          const a = bgA * (1 - dropA) + dropA;
          if (a > 0.0001) {
            rSum += (r * bgA * (1 - dropA) + dr * dropA);
            gSum += (g * bgA * (1 - dropA) + dg * dropA);
            bSum += (b * bgA * (1 - dropA) + db * dropA);
            aSum += a;
          }
        }
      }
      const n = S * S;
      const idx = (y * size + x) * 4;
      const aAvg = Math.max(aSum / n, 0.0001);
      rgba[idx] = Math.round(clamp01(rSum / n / aAvg / 255) * 255);
      rgba[idx + 1] = Math.round(clamp01(gSum / n / aAvg / 255) * 255);
      rgba[idx + 2] = Math.round(clamp01(bSum / n / aAvg / 255) * 255);
      rgba[idx + 3] = Math.round(clamp01(aSum / n) * 255);
    }
  }
  return encodePNG(size, size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(join(OUT_DIR, `${size}.png`), render(size));
  console.log(`icon/${size}.png ✓`);
}
