import { getSettings, pickRule, watchSettings } from '../lib/settings';
import { buildTile } from '../lib/watermark';
import type { WatermarkRule } from '../lib/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    let host: HTMLDivElement | null = null;
    let root: ShadowRoot | null = null;
    let lastHref = '';

    /** 用 Shadow DOM 承载水印层：不受页面样式影响，也不污染页面 */
    function ensureHost() {
      if (host && host.isConnected && root) return;
      host = document.createElement('div');
      host.id = '__aquamark-host__';
      host.style.cssText = 'all:initial;position:fixed;width:0;height:0;overflow:hidden;';
      root = host.attachShadow({ mode: 'closed' });
      (document.documentElement || document.body).appendChild(host);
    }

    function apply(rule: WatermarkRule | null) {
      ensureHost();
      const shadow = root!;
      shadow.innerHTML = '';
      if (!rule) return;
      const { url, w, h } = buildTile(rule, Math.min(2, window.devicePixelRatio || 1));
      const layer = document.createElement('div');
      layer.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483647',
        'pointer-events:none',
        'user-select:none',
        `background-image:url("${url}")`,
        'background-repeat:repeat',
        `background-size:${w}px ${h}px`,
      ].join(';');
      shadow.appendChild(layer);
    }

    async function render() {
      try {
        const settings = await getSettings();
        const rule = settings.masterEnabled ? pickRule(location.hostname, settings.rules) : null;
        apply(rule);
      } catch {
        /* 忽略受限页面 */
      }
    }

    watchSettings(render);

    // 自愈：水印节点被页面移除 / SPA 切换域名时自动重建
    setInterval(() => {
      if (!host || !host.isConnected) {
        render();
        return;
      }
      if (location.href !== lastHref) {
        lastHref = location.href;
        render();
      }
    }, 1200);

    lastHref = location.href;
    render();
  },
});
