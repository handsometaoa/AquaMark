/** 弹窗界面语言 */
export type Lang = 'zh' | 'en';

/** 静态文案：key → 双语 */
const STATIC = {
  appName: { zh: 'AquaMark', en: 'AquaMark' },
  appSub: { zh: '域名水印', en: 'Domain Watermark' },

  masterOn: { zh: '已恢复全部水印', en: 'All watermarks resumed' },
  masterOff: { zh: '已暂停全部水印', en: 'All watermarks paused' },

  currentSite: { zh: '当前网站', en: 'Current site' },
  activeBadge: { zh: '水印生效中', en: 'Watermark active' },
  inactiveBadge: { zh: '水印未生效', en: 'Watermark off' },
  unsetBadge: { zh: '未配置', en: 'Not configured' },
  noWatermark: { zh: '暂无水印', en: 'No watermark' },
  addForSite: { zh: '为当前网站添加水印', en: 'Add for this site' },
  editSite: { zh: '编辑此站点水印', en: 'Edit this watermark' },
  enableSite: { zh: '启用此站点水印', en: 'Enable this watermark' },
  enabledToast: { zh: '水印已启用 ✓', en: 'Watermark enabled ✓' },
  notWebPage: { zh: '当前标签页不是可识别的网站', en: 'Current tab is not a recognizable website' },

  rulesTitle: { zh: '域名规则', en: 'Domain Rules' },
  import: { zh: '导入', en: 'Import' },
  export: { zh: '导出', en: 'Export' },
  add: { zh: '添加', en: 'Add' },
  current: { zh: '当前', en: 'current' },
  density: { zh: '密度', en: 'Density' },
  opacity: { zh: '深浅', en: 'Opacity' },

  armDelete: { zh: '确认删除', en: 'Confirm' },
  deleted: { zh: '已删除', en: 'Deleted' },
  backupHint: {
    zh: '卸载扩展会清除全部规则 · 请先「导出」备份',
    en: 'Uninstalling clears all rules · Export a backup first',
  },
  about: { zh: '关于', en: 'About' },

  sheetAdd: { zh: '添加水印规则', en: 'Add Watermark Rule' },
  sheetEdit: { zh: '编辑水印规则', en: 'Edit Watermark Rule' },
  domain: { zh: '域名', en: 'Domain' },
  domainPh: { zh: 'example.com（自动匹配子域名）', en: 'example.com (subdomains included)' },
  text: { zh: '水印内容', en: 'Watermark Text' },
  color: { zh: '颜色', en: 'Color' },
  rotation: { zh: '角度', en: 'Angle' },
  fontSize: { zh: '字号', en: 'Font Size' },
  preview: { zh: '实时预览', en: 'Live Preview' },
  cancel: { zh: '取消', en: 'Cancel' },
  save: { zh: '保存', en: 'Save' },
  saved: { zh: '已保存 ✓', en: 'Saved ✓' },
  invalidDomain: { zh: '请输入有效域名，如 example.com', en: 'Enter a valid domain, e.g. example.com' },
  dupDomain: { zh: '该域名已存在', en: 'This domain already exists' },
  imported: { zh: '条规则', en: ' rule(s)' },

  importNone: { zh: '没有可导入的新规则', en: 'No new rules to import' },
  importFail: {
    zh: '导入失败：请选择 AquaMark 导出的 JSON 文件',
    en: 'Import failed: choose a JSON file exported by AquaMark',
  },

  emptyTitle: { zh: '还没有规则', en: 'No rules yet' },
  emptySub: { zh: '添加一个域名，为它定制水印', en: 'Add a domain to watermark it' },

  aboutAuthor: { zh: '作者', en: 'Author' },
  aboutRepo: { zh: '仓库地址', en: 'Repository' },
  aboutIssues: { zh: '问题反馈', en: 'Issues' },
  aboutStack: { zh: '技术栈', en: 'Tech Stack' },

  langTitle: { zh: '语言', en: 'Language' },
} as const;

export type MsgKey = keyof typeof STATIC;

/** 取静态文案 */
export function t(key: MsgKey, lang: Lang): string {
  return STATIC[key][lang];
}

/** 带参数的文案（导出条数 / 导入统计） */
export function tf(key: 'exported' | 'importSummary', lang: Lang, n: number, skipped?: number): string {
  if (key === 'exported') return lang === 'zh' ? `已导出 ${n} 条规则` : `Exported ${n} rule(s)`;
  return lang === 'zh'
    ? skipped
      ? `导入 ${n} 条规则，跳过 ${skipped} 条`
      : `导入 ${n} 条规则`
    : `Imported ${n} rule(s)${skipped ? `, skipped ${skipped}` : ''}`;
}
