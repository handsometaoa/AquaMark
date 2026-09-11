import { saveSettings } from '../../lib/settings';
import { defaultRule, domainMatches } from '../../lib/rules';
import { buildTile, isLightColor } from '../../lib/watermark';
import type { WatermarkRule } from '../../lib/types';
import { state } from './store';
import { $, esc, toast } from './ui';
import { openSheet } from './sheet';

const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6M14 11v6M6.5 7l.8 11a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5.5V7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

let deleteTimer: ReturnType<typeof setTimeout> | undefined;

function renderMaster() {
  $('#masterSwitch').setAttribute('aria-checked', String(state.settings.masterEnabled));
}

function renderCurrent() {
  const card = $('#currentCard');
  const { currentHost, settings } = state;
  if (!currentHost) {
    card.innerHTML = `<div class="cur-tip">当前标签页不是可识别的网站</div>`;
    return;
  }
  const letter = currentHost.replace(/^www\./, '')[0]?.toUpperCase() ?? '?';
  const hue = [...currentHost].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const favicon = `<div class="cur-favicon" style="background:linear-gradient(145deg,hsl(${hue} 65% 52%),hsl(${(hue + 40) % 360} 65% 40%))">${letter}</div>`;
  const head = (badge: string) => `
    <div class="cur-head">${favicon}
      <div class="cur-main">
        <div class="cur-host">${esc(currentHost)}</div>
        <div class="cur-sub">当前网站</div>
      </div>${badge}
    </div>`;

  // 命中规则（无论是否启用），与列表展示顺序一致，取第一条
  const candidates = settings.rules.filter((r) => domainMatches(currentHost, r.domain));
  const rule = [...candidates].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

  // 状态 1：未配置 → 空白预览框 + 添加按钮
  if (!rule) {
    card.innerHTML = `
      ${head(`<span class="badge"><i></i>未配置</span>`)}
      <div class="cur-preview cur-preview-empty">暂无水印</div>
      <div class="cur-actions"><button class="btn primary" id="curAdd">为当前网站添加水印</button></div>`;
    $('#curAdd').addEventListener('click', () => {
      openSheet({ ...defaultRule(currentHost), domain: currentHost }, true);
    });
    return;
  }

  const tile = buildTile(rule, 2);
  const previewBg = isLightColor(rule.color) ? '#14171f' : '#eef1f6';
  const preview = `<div class="cur-preview" style="background-image:url('${tile.url}');background-size:${tile.w}px ${tile.h}px;background-color:${previewBg};${rule.enabled && settings.masterEnabled ? '' : 'opacity:.35;'}"></div>`;

  // 状态 2：已启用 → 水印生效中 + 编辑
  if (rule.enabled && settings.masterEnabled) {
    card.innerHTML = `
      ${head(`<span class="badge on"><i></i>水印生效中</span>`)}
      ${preview}
      <div class="cur-actions"><button class="btn" id="curEdit">编辑此站点水印</button></div>`;
    $('#curEdit').addEventListener('click', () => openSheet(rule, false));
    return;
  }

  // 状态 3：规则存在但未启用（或总开关关闭）→ 水印未生效 + 一键启用
  card.innerHTML = `
    ${head(`<span class="badge off"><i></i>水印未生效</span>`)}
    ${preview}
    <div class="cur-actions"><button class="btn success" id="curEnable">启用此站点水印</button></div>`;
  $('#curEnable').addEventListener('click', async () => {
    rule.enabled = true;
    settings.masterEnabled = true;
    settings.updatedAt = Date.now();
    await saveSettings(settings);
    renderAll();
    toast('水印已启用 ✓');
  });
}

function renderList() {
  const list = $('#ruleList');
  const empty = $('#emptyState');
  const rules = [...state.settings.rules].sort((a, b) => b.createdAt - a.createdAt);
  empty.classList.toggle('hidden', rules.length > 0);
  list.innerHTML = rules
    .map((r, i) => {
      const match = state.currentHost && domainMatches(state.currentHost, r.domain);
      return `
      <div class="rule ${r.enabled ? '' : 'off'}" data-id="${r.id}" style="animation-delay:${0.12 + i * 0.045}s" title="${match ? '匹配当前网站' : ''}">
        <span class="dot" style="background:${esc(r.color)};color:${esc(r.color)}"></span>
        <div class="rule-main">
          <div class="rule-domain">${esc(r.domain)}${match ? ' <span class="chip" style="color:#8fd6a8;border-color:rgba(48,209,88,.3);background:rgba(48,209,88,.1)">当前</span>' : ''}</div>
          <div class="rule-meta">
            <span class="chip">${esc(r.text)}</span>
            <span class="chip">密度 ${r.density} · 深浅 ${r.opacity}%</span>
          </div>
        </div>
        <button class="switch sm" data-act="toggle" aria-checked="${r.enabled}" aria-label="启用或停用 ${esc(r.domain)}"></button>
        <button class="icon-btn" data-act="del" aria-label="删除 ${esc(r.domain)}">${TRASH_SVG}</button>
      </div>`;
    })
    .join('');
  updateListFade();
  updateExportDot();
}

export function renderAll() {
  renderMaster();
  renderCurrent();
  renderList();
}

/** 列表可滚动且未到底时，底部显示渐隐提示（避免生硬裁切行） */
function updateListFade() {
  const list = $('#ruleList');
  const scrollable = list.scrollHeight > list.clientHeight + 2;
  const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
  $('.list-fade').classList.toggle('show', scrollable && !atBottom);
}

/** 规则有改动且尚未导出备份时，「导出」按钮亮橙色圆点提醒 */
export function updateExportDot() {
  const dirty =
    state.settings.rules.length > 0 && (state.settings.updatedAt || 0) > (state.settings.lastExportAt || 0);
  $('.dirty-dot').classList.toggle('show', dirty);
}

/* ————— 列表行交互 ————— */

/** 原位切换开关状态，不重渲染列表（避免整列动画重播） */
async function toggleRule(rule: WatermarkRule, btn: HTMLElement) {
  rule.enabled = !rule.enabled;
  state.settings.updatedAt = Date.now();
  btn.setAttribute('aria-checked', String(rule.enabled));
  btn.setAttribute('aria-label', `启用或停用 ${rule.domain}`);
  btn.closest('.rule')?.classList.toggle('off', !rule.enabled);
  await saveSettings(state.settings);
  renderCurrent();
}

function resetDelBtn(btn: HTMLElement) {
  btn.classList.remove('armed');
  btn.innerHTML = TRASH_SVG;
}

/** 行内折叠动画后移除，不整列重渲染 */
async function removeRule(rule: WatermarkRule, row: HTMLElement) {
  row.style.animation = 'none';
  row.style.height = row.scrollHeight + 'px';
  requestAnimationFrame(() => row.classList.add('removing'));
  setTimeout(async () => {
    state.settings.rules = state.settings.rules.filter((r) => r.id !== rule.id);
    state.settings.updatedAt = Date.now();
    await saveSettings(state.settings);
    row.remove();
    $('#emptyState').classList.toggle('hidden', state.settings.rules.length > 0);
    renderCurrent();
    updateListFade();
    updateExportDot();
    toast('已删除');
  }, 300);
}

export function initListEvents() {
  $('#ruleList').addEventListener('scroll', updateListFade, { passive: true });

  $('#ruleList').addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('.rule');
    if (!row) return;
    const rule = state.settings.rules.find((r) => r.id === row.dataset.id);
    if (!rule) return;
    const act = target.closest<HTMLElement>('[data-act]')?.dataset.act;

    if (act === 'toggle') {
      await toggleRule(rule, target.closest<HTMLElement>('[data-act=toggle]')!);
      return;
    }
    if (act === 'del') {
      const btn = target.closest<HTMLElement>('[data-act=del]')!;
      if (!btn.classList.contains('armed')) {
        document.querySelectorAll<HTMLElement>('.icon-btn.armed').forEach(resetDelBtn);
        btn.classList.add('armed');
        btn.textContent = '确认删除';
        clearTimeout(deleteTimer);
        deleteTimer = setTimeout(() => resetDelBtn(btn), 2600);
        return;
      }
      clearTimeout(deleteTimer);
      await removeRule(rule, row);
      return;
    }
    // 点击行其他区域 → 编辑
    if (!target.closest('[data-act]')) openSheet(rule, false);
  });
}
