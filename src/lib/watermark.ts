import type { WatermarkRule } from './types';

const FONT_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`;

/** 密度 1~10 → 平铺间距 px（越大越密） */
export function densityToGap(density: number): number {
  return 232 - Math.min(10, Math.max(1, density)) * 19;
}

/** 深浅 1~100 → 透明度 */
export function opacityToAlpha(opacity: number): number {
  return Math.min(0.5, Math.max(0.005, (opacity / 100) * 0.5));
}

export interface Tile {
  url: string;
  /** CSS 像素尺寸（用于 background-size） */
  w: number;
  h: number;
}

/**
 * 生成一张水印平铺单元（Canvas → dataURL）。
 * 内容脚本与弹窗预览共用，保证「预览即所得」。
 */
export function buildTile(rule: WatermarkRule, dpr = 2): Tile {
  const fs = Math.max(8, rule.fontSize) * dpr;
  const text = rule.text || ' ';
  const rot = ((rule.rotation || 0) * Math.PI) / 180;

  const measure = document.createElement('canvas').getContext('2d')!;
  const font = `500 ${fs}px ${FONT_STACK}`;
  measure.font = font;
  const tw = measure.measureText(text).width;

  // 旋转后的包围盒，保证平铺时无缝
  const bw = Math.abs(tw * Math.cos(rot)) + Math.abs(fs * Math.sin(rot));
  const bh = Math.abs(tw * Math.sin(rot)) + Math.abs(fs * Math.cos(rot));
  const gap = densityToGap(rule.density) * dpr;
  const w = Math.max(2, Math.ceil(bw + gap));
  const h = Math.max(2, Math.ceil(bh + gap));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rot);
  ctx.globalAlpha = opacityToAlpha(rule.opacity);
  ctx.fillStyle = rule.color;
  ctx.fillText(text, 0, 0);

  return { url: canvas.toDataURL(), w: w / dpr, h: h / dpr };
}

/** 按 hex 亮度判断深浅色（用于预览底色自动切换） */
export function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return true;
  const n = parseInt(m[1] ?? 'ffffff', 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}
