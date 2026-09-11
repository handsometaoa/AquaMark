import { DEFAULT_COLOR, DEFAULT_TEXT, type Settings, type WatermarkRule } from './types';

export function defaultRule(domain = ''): WatermarkRule {
  return {
    id: crypto.randomUUID(),
    domain,
    enabled: true,
    text: DEFAULT_TEXT,
    color: DEFAULT_COLOR,
    opacity: 50,
    density: 5,
    rotation: -30,
    fontSize: 16,
    createdAt: Date.now(),
  };
}

/** 去掉协议、路径、通配符前缀，统一小写 */
export function normalizeDomain(input: string): string {
  const noScheme = input.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  const noPath = noScheme.split(/[/?#]/)[0] ?? noScheme;
  return noPath
    .replace(/^\*?\./, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** host 是否命中规则域名（含子域名） */
export function domainMatches(host: string, domain: string): boolean {
  const d = normalizeDomain(domain);
  if (!d || !host) return false;
  return host === d || host.endsWith('.' + d);
}

/** 取当前 host 命中的、域名最长的启用规则 */
export function pickRule(host: string, rules: WatermarkRule[]): WatermarkRule | null {
  let best: WatermarkRule | null = null;
  for (const r of rules) {
    if (!r.enabled) continue;
    if (!domainMatches(host, r.domain)) continue;
    if (!best || normalizeDomain(r.domain).length > normalizeDomain(best.domain).length) best = r;
  }
  return best;
}

/** 补全旧版本/缺省字段 */
export function normalizeSettings(raw: unknown): Settings {
  const src = (raw ?? {}) as Partial<Settings>;
  const rules = Array.isArray(src.rules) ? src.rules : [];
  return {
    masterEnabled: src.masterEnabled !== false,
    rules: rules.map((r) => ({ ...defaultRule(), ...r })),
    updatedAt: Number(src.updatedAt) || 0,
    lastExportAt: Number(src.lastExportAt) || 0,
  };
}
