import { normalizeSettings } from './rules';
import type { Settings } from './types';

// 常用纯函数/常量在此统一导出，调用方只需引入 settings
export { pickRule, domainMatches, normalizeDomain, defaultRule } from './rules';
export { DEFAULT_TEXT, DEFAULT_COLOR } from './types';

/** 浏览器扩展环境检测：普通页面预览时走内置演示数据 */
const ext: any = (globalThis as any).chrome;
export const hasExtensionAPI = !!ext?.storage?.local;

const SETTINGS_KEY = 'settings';

const MOCK_SETTINGS: Settings = {
  masterEnabled: true,
  rules: [
    {
      id: 'mock-1',
      domain: 'github.com',
      enabled: true,
      text: '内部资料 · 禁止外传',
      color: '#FF375F',
      opacity: 50,
      density: 5,
      rotation: -30,
      fontSize: 16,
      createdAt: 3,
    },
    {
      id: 'mock-2',
      domain: 'notion.so',
      enabled: true,
      text: 'CONFIDENTIAL',
      color: '#64D2FF',
      opacity: 20,
      density: 7,
      rotation: -45,
      fontSize: 18,
      createdAt: 2,
    },
    {
      id: 'mock-4',
      domain: 'mail.google.com',
      enabled: true,
      text: '内部资料 · 禁止外传',
      color: '#FF9F0A',
      opacity: 25,
      density: 6,
      rotation: -30,
      fontSize: 16,
      createdAt: 4,
    },
    {
      id: 'mock-5',
      domain: 'docs.qq.com',
      enabled: true,
      text: '机密文档',
      color: '#30D158',
      opacity: 35,
      density: 6,
      rotation: -30,
      fontSize: 16,
      createdAt: 5,
    },
    {
      id: 'mock-3',
      domain: 'figma.com',
      enabled: false,
      text: '仅限内部使用',
      color: '#FF375F',
      opacity: 12,
      density: 6,
      rotation: -30,
      fontSize: 14,
      createdAt: 1,
    },
  ],
};

export async function getSettings(): Promise<Settings> {
  if (!hasExtensionAPI) return normalizeSettings(MOCK_SETTINGS);
  const res = await ext.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(res?.[SETTINGS_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!hasExtensionAPI) return;
  await ext.storage.local.set({ [SETTINGS_KEY]: settings });
}

/** 监听设置变化（任何页面改动后，所有页面实时生效） */
export function watchSettings(cb: (settings: Settings) => void): void {
  if (!hasExtensionAPI) return;
  ext.storage.onChanged.addListener((changes: Record<string, any>, area: string) => {
    if (area === 'local' && changes[SETTINGS_KEY]) cb(normalizeSettings(changes[SETTINGS_KEY].newValue));
  });
}

/** 获取当前激活标签页信息；非扩展环境返回演示数据 */
export async function getActiveTab(): Promise<{ url: string } | null> {
  if (!hasExtensionAPI) return { url: 'https://github.com/' };
  const tabs = await ext.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] ?? null;
}
