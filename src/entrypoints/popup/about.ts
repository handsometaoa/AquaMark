import { $ } from './ui';

/** 仓库与作者信息（与 package.json / README 保持一致） */
const REPO_URL = 'https://github.com/handsometaoa/AquaMark';
const FALLBACK_VERSION = '1.1.0';

export function bindAbout() {
  let version = FALLBACK_VERSION;
  try {
    const ext: any = (globalThis as any).chrome;
    version = ext?.runtime?.getManifest?.().version ?? version;
  } catch {
    /* 非扩展环境 */
  }
  $('#aboutVersion').textContent = `v${version}`;

  $('#aboutBtn').addEventListener('click', () => $('#aboutSheet').classList.add('show'));
  document.querySelectorAll('[data-about-close]').forEach((el) =>
    el.addEventListener('click', () => $('#aboutSheet').classList.remove('show')),
  );
}

export function closeAbout() {
  $('#aboutSheet').classList.remove('show');
}

export { REPO_URL };
