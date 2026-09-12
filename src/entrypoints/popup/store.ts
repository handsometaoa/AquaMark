import { normalizeSettings } from '../../lib/rules';
import type { WatermarkRule } from '../../lib/types';
import type { Lang } from '../../lib/i18n';
import { t, tf, type MsgKey } from '../../lib/i18n';
import { $ } from './ui';

/** 弹窗全局共享状态（各渲染/交互模块共同读写） */
export const state = {
  settings: normalizeSettings(null),
  /** 当前激活标签页的域名（非扩展环境为演示域名） */
  currentHost: '',
  /** 正在编辑的规则；null 表示抽屉关闭 */
  editing: null as WatermarkRule | null,
  editingNew: false,
};

/** 当前语言：用户设置优先，否则跟随浏览器（非中文环境一律英文） */
export function lang(): Lang {
  if (state.settings.lang) return state.settings.lang;
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/** 取当前语言文案 */
export function tr(key: MsgKey): string {
  return t(key, lang());
}

/** 带参数文案 */
export function trf(key: 'exported' | 'importSummary', n: number, skipped?: number): string {
  return tf(key, lang(), n, skipped);
}

/** 应用启动 / 切换语言后调用：把静态文案刷到 DOM */
export function applyI18n() {
  const l = lang();
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  const map: Array<[string, MsgKey]> = [
    ['#appSub', 'appSub'],
    ['#rulesTitle', 'rulesTitle'],
    ['#importBtn .tool-label', 'import'],
    ['#exportBtn .tool-label', 'export'],
    ['#addBtn .btn-add-label', 'add'],
    ['#aboutBtn', 'about'],
    ['#backupHint', 'backupHint'],
    ['#emptyTitle', 'emptyTitle'],
    ['#emptySub', 'emptySub'],
    ['#sheetTitle', 'sheetAdd'],
    ['#domainLabel', 'domain'],
    ['#f-domain', 'domainPh'],
    ['#textLabel', 'text'],
    ['#colorLabel', 'color'],
    ['#rotationLabel', 'rotation'],
    ['#fontsizeLabel', 'fontSize'],
    ['#previewTag', 'preview'],
    ['#cancelBtn', 'cancel'],
    ['#saveBtn', 'save'],
    ['#aboutAuthorLabel', 'aboutAuthor'],
    ['#aboutRepoLabel', 'aboutRepo'],
    ['#aboutIssuesLabel', 'aboutIssues'],
    ['#aboutStackLabel', 'aboutStack'],
    ['#langLabel', 'langTitle'],
  ];
  for (const [sel, key] of map) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (el instanceof HTMLInputElement) el.placeholder = t(key, l);
    else el.textContent = t(key, l);
  }
  // 语言按钮自身显示「另一种语言」，点击即切换
  const langBtn = $('#langBtn');
  if (langBtn) langBtn.textContent = l === 'zh' ? 'EN' : '中';
}
