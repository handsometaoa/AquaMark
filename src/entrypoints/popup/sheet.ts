import { saveSettings } from '../../lib/settings';
import { normalizeDomain } from '../../lib/rules';
import { DEFAULT_TEXT, type WatermarkRule } from '../../lib/types';
import { buildTile, isLightColor } from '../../lib/watermark';
import { state } from './store';
import { $, paintSlider, toast } from './ui';
import { renderAll } from './render';

const SWATCHES = ['#FF375F', '#FFFFFF', '#0A84FF', '#7B5CFF', '#FF9F0A', '#30D158', '#64D2FF', '#1D1D1F'];
const PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

function readRuleFromFields(): WatermarkRule {
  const activeColor = $('.swatch.active') as HTMLElement;
  return {
    ...state.editing!,
    domain: ($('#f-domain') as HTMLInputElement).value,
    text: ($('#f-text') as HTMLInputElement).value.trim() || DEFAULT_TEXT,
    color: activeColor?.dataset.color || '#FFFFFF',
    opacity: Number(($('#f-opacity') as HTMLInputElement).value),
    density: Number(($('#f-density') as HTMLInputElement).value),
    rotation: Number(($('#f-rotation') as HTMLInputElement).value),
    fontSize: Number(($('#f-fontsize') as HTMLInputElement).value),
  };
}

/** 同步编辑抽屉底部的水印实时预览 */
export function syncPreview() {
  if (!state.editing) return;
  const rule = readRuleFromFields();
  const tile = buildTile(rule, 2);
  const preview = $('#preview');
  const bg = isLightColor(rule.color) ? '#14171f' : '#eef1f6';
  preview.style.backgroundImage = `url('${tile.url}')`;
  preview.style.backgroundSize = `${tile.w}px ${tile.h}px`;
  preview.style.backgroundColor = bg;
  $('#colorVal').textContent = rule.color.toUpperCase();
  $('#v-opacity').textContent = rule.opacity + '%';
  $('#v-density').textContent = String(rule.density);
  $('#v-rotation').textContent = rule.rotation + '°';
  $('#v-fontsize').textContent = rule.fontSize + 'px';
}

function renderSwatches(color: string) {
  const wrap = $('#swatches');
  const isPreset = SWATCHES.includes(color.toUpperCase());
  wrap.innerHTML =
    SWATCHES.map(
      (c) =>
        `<span class="swatch ${c.toUpperCase() === color.toUpperCase() ? 'active' : ''}" data-color="${c}" style="background:${c}" title="${c}"></span>`,
    ).join('') +
    `<span class="swatch custom ${isPreset ? '' : 'active'}" data-color="${isPreset ? '' : color}" title="自定义颜色" style="${isPreset ? '' : `background:${color}`}">${PLUS_SVG}<input type="color" value="${isPreset ? '#7bddff' : color}"></span>`;

  wrap.querySelectorAll<HTMLElement>('.swatch:not(.custom)').forEach((el) => {
    el.addEventListener('click', () => {
      wrap.querySelector('.swatch.active')?.classList.remove('active');
      el.classList.add('active');
      syncPreview();
    });
  });
  const custom = wrap.querySelector<HTMLElement>('.swatch.custom')!;
  const picker = custom.querySelector('input')!;
  picker.addEventListener('input', () => {
    custom.dataset.color = picker.value;
    custom.style.background = picker.value;
    custom.querySelector('svg')?.remove();
    wrap.querySelector('.swatch.active')?.classList.remove('active');
    custom.classList.add('active');
    syncPreview();
  });
  if (!isPreset) custom.dataset.color = color;
}

export function openSheet(rule: WatermarkRule, isNew: boolean) {
  state.editing = { ...rule };
  state.editingNew = isNew;
  $('#sheetTitle').textContent = isNew ? '添加水印规则' : '编辑水印规则';
  ($('#f-domain') as HTMLInputElement).value = rule.domain;
  ($('#f-text') as HTMLInputElement).value = rule.text === DEFAULT_TEXT ? '' : rule.text;
  ($('#f-text') as HTMLInputElement).placeholder = DEFAULT_TEXT;
  ($('#f-opacity') as HTMLInputElement).value = String(rule.opacity);
  ($('#f-density') as HTMLInputElement).value = String(rule.density);
  ($('#f-rotation') as HTMLInputElement).value = String(rule.rotation);
  ($('#f-fontsize') as HTMLInputElement).value = String(rule.fontSize);
  document.querySelectorAll<HTMLInputElement>('#sheetWrap input[type=range]').forEach(paintSlider);
  renderSwatches(rule.color);
  syncPreview();
  $('#sheetWrap').classList.add('show');
  if (isNew) setTimeout(() => ($('#f-domain') as HTMLInputElement).focus(), 350);
}

export function closeSheet() {
  $('#sheetWrap').classList.remove('show');
  state.editing = null;
}

export async function saveSheet() {
  if (!state.editing) return;
  const draft = readRuleFromFields();
  const domain = normalizeDomain(draft.domain);
  if (!domain || !domain.includes('.')) {
    toast('请输入有效域名，如 example.com');
    return;
  }
  if (state.settings.rules.some((r) => r.id !== state.editing!.id && normalizeDomain(r.domain) === domain)) {
    toast('该域名已存在');
    return;
  }
  const rule = { ...draft, domain };
  state.settings.updatedAt = Date.now();
  if (state.editingNew) state.settings.rules.unshift({ ...rule, createdAt: Date.now() });
  else state.settings.rules = state.settings.rules.map((r) => (r.id === rule.id ? { ...rule } : r));
  await saveSettings(state.settings);
  closeSheet();
  renderAll();
  toast('已保存 ✓');
}
