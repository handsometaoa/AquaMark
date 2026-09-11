import { getSettings, pickRule, watchSettings } from '../lib/settings';

const ext: any = (globalThis as any).chrome;

export default defineBackground(() => {
  const setBadge = (tabId: number, text: string) => {
    try {
      ext.action.setBadgeText({ tabId, text });
      if (text) {
        ext.action.setBadgeBackgroundColor({ tabId, color: '#4f8cff' });
        ext.action.setBadgeTextColor?.({ tabId, color: '#ffffff' });
      }
    } catch {
      /* 受限页面 */
    }
  };

  const update = async (tabId: number) => {
    try {
      const tab = await ext.tabs.get(tabId);
      const url: string = tab?.url ?? '';
      if (!/^https?:/i.test(url)) return setBadge(tabId, '');
      const host = new URL(url).hostname;
      const settings = await getSettings();
      const on = settings.masterEnabled && !!pickRule(host, settings.rules);
      setBadge(tabId, on ? 'ON' : '');
    } catch {
      /* ignore */
    }
  };

  ext.tabs.onUpdated.addListener((tabId: number, info: { status?: string; url?: string }) => {
    if (info.status === 'loading' || info.url !== undefined) update(tabId);
  });
  ext.tabs.onActivated.addListener((info: { tabId: number }) => update(info.tabId));

  // 设置变化时刷新所有标签页徽标
  watchSettings(async () => {
    const tabs = await ext.tabs.query({});
    for (const t of tabs ?? []) update(t.id);
  });
});
