import { defineConfig } from 'wxt';

const ICONS: Record<string, string> = {
  '16': '/icon/16.png',
  '32': '/icon/32.png',
  '48': '/icon/48.png',
  '128': '/icon/128.png',
};

export default defineConfig({
  // 源码统一放在 src/，与 public、scripts 分离
  srcDir: 'src',
  manifest: {
    name: 'AquaMark · 域名水印',
    description: '根据域名动态为网页添加水印：自定义内容、颜色、密度与深浅。',
    homepage_url: 'https://github.com/handsometaoa/AquaMark',
    permissions: ['storage'],
    host_permissions: ['<all_urls>'],
    icons: ICONS,
    action: {
      default_title: 'AquaMark · 域名水印',
      default_icon: ICONS,
    },
  },
});
