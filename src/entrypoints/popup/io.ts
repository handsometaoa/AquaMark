import { saveSettings } from '../../lib/settings';
import { normalizeDomain } from '../../lib/rules';
import { DEFAULT_COLOR, DEFAULT_TEXT, type WatermarkRule } from '../../lib/types';
import { state, tr, trf } from './store';
import { $, toast } from './ui';
import { renderAll } from './render';

/** 导入值的类型与范围收紧，坏数据退回默认 */
function sanitizeImportedRule(raw: unknown): WatermarkRule | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const domain = normalizeDomain(String(r.domain ?? ''));
  if (!domain || !domain.includes('.')) return null;
  const clamp = (v: unknown, min: number, max: number, dft: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dft;
  };
  return {
    id: crypto.randomUUID(),
    domain,
    enabled: r.enabled !== false,
    text: String(r.text ?? '').slice(0, 40) || DEFAULT_TEXT,
    color: /^#[0-9a-f]{6}$/i.test(String(r.color)) ? String(r.color).toUpperCase() : DEFAULT_COLOR,
    opacity: clamp(r.opacity, 1, 100, 50),
    density: clamp(r.density, 1, 10, 5),
    rotation: clamp(r.rotation, -90, 90, -30),
    fontSize: clamp(r.fontSize, 10, 48, 16),
    createdAt: Number(r.createdAt) || Date.now(),
  };
}

export function bindImportExport() {
  $('#exportBtn').addEventListener('click', () => {
    const payload = {
      app: 'aquamark',
      version: 1,
      exportedAt: new Date().toISOString(),
      rules: state.settings.rules,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquamark-rules-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    state.settings.lastExportAt = Date.now();
    saveSettings(state.settings);
    renderAll();
    toast(trf('exported', state.settings.rules.length));
  });

  $('#importBtn').addEventListener('click', () => ($('#importFile') as HTMLInputElement).click());

  $('#importFile').addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.rules) ? data.rules : null;
      if (!incoming) throw new Error('bad format');
      const existing = new Set(state.settings.rules.map((r) => normalizeDomain(r.domain)));
      let added = 0;
      let skipped = 0;
      for (const raw of incoming) {
        const rule = sanitizeImportedRule(raw);
        if (!rule || existing.has(rule.domain)) {
          skipped++;
          continue;
        }
        state.settings.rules.push(rule);
        existing.add(rule.domain);
        added++;
      }
      state.settings.updatedAt = Date.now();
      await saveSettings(state.settings);
      renderAll();
      if (added) toast(trf('importSummary', added, skipped));
      else toast(tr('importNone'));
    } catch {
      toast(tr('importFail'));
    } finally {
      input.value = '';
    }
  });
}
