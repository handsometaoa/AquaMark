import './style.css';
import { getSettings, getActiveTab, saveSettings } from '../../lib/settings';
import { defaultRule } from '../../lib/rules';
import { state, tr, applyI18n, lang } from './store';
import { $, paintSlider, toast } from './ui';
import { initListEvents, renderAll, renderLanguage } from './render';
import { closeSheet, openSheet, syncPreview, saveSheet } from './sheet';
import { bindImportExport } from './io';
import { bindAbout, closeAbout } from './about';

function bind() {
  // 总开关：暂停 / 恢复全部水印
  $('#masterSwitch').addEventListener('click', async () => {
    state.settings.masterEnabled = !state.settings.masterEnabled;
    await saveSettings(state.settings);
    renderAll();
    toast(tr(state.settings.masterEnabled ? 'masterOn' : 'masterOff'));
  });

  // 添加规则（预填当前网站域名）
  $('#addBtn').addEventListener('click', () => openSheet(defaultRule(state.currentHost), true));

  // 编辑抽屉：遮罩 / 取消 / Esc 关闭，保存
  document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeSheet));
  $('#saveBtn').addEventListener('click', saveSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSheet();
      closeAbout();
    }
  });

  // 抽屉内滑杆：拖动时刷新填充与实时预览
  $('#sheetWrap')
    .querySelectorAll<HTMLInputElement>('input[type=range]')
    .forEach((el) => {
      el.addEventListener('input', () => {
        paintSlider(el);
        syncPreview();
      });
    });

  initListEvents();
  bindImportExport();
  bindAbout();

  // 语言切换：持久化到设置并即时刷新界面
  $('#langBtn').addEventListener('click', async () => {
    state.settings.lang = lang() === 'zh' ? 'en' : 'zh';
    await saveSettings(state.settings);
    renderLanguage();
  });
}

async function init() {
  try {
    const tab = await getActiveTab();
    if (tab?.url && /^https?:/i.test(tab.url)) state.currentHost = new URL(tab.url).hostname;
  } catch {
    /* ignore */
  }
  state.settings = await getSettings();
  applyI18n();
  bind();
  renderAll();
}

init();
