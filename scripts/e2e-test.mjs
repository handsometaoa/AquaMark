/**
 * 端到端冒烟测试：
 *   1. 向构建产物的 background.js 追加一次性种子代码（重跑 npm run build 即还原）
 *   2. 无头浏览器加载扩展并打开目标页面
 *   3. 验证水印节点存在并截图
 * 用法：node scripts/e2e-test.mjs [目标URL，默认 https://example.com]
 */
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT_PATH = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', '.output', 'chrome-mv3'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9223;
const TARGET_URL = process.argv[2] ?? 'https://example.com';
const PROFILE = join(EXT_PATH, '..', '.e2e-profile');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

/** 极简 CDP 客户端（Node 24 内置 WebSocket） */
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  return new Promise((res, rej) => {
    ws.addEventListener('open', () => res({
      send(method, params = {}) {
        return new Promise((r2) => {
          const id = ++seq;
          pending.set(id, r2);
          ws.send(JSON.stringify({ id, method, params }));
        });
      },
      close: () => ws.close(),
    }));
    ws.addEventListener('error', rej);
  });
}

// —— 1. 种入测试规则（仅写构建产物，重新 build 即还原）——
const host = new URL(TARGET_URL).hostname;
const settings = {
  masterEnabled: true,
  rules: [{
    id: 'e2e',
    domain: host,
    enabled: true,
    text: '内部资料 · 禁止外传',
    color: '#FF375F',
    opacity: 30,
    density: 5,
    rotation: -30,
    fontSize: 18,
    createdAt: 1,
  }],
};
const contentFile = join(EXT_PATH, 'content-scripts', 'content.js');
writeFileSync(contentFile, `;(function () {
  var settings = ${JSON.stringify(settings)};
  try {
    chrome.storage.local.get('settings', function (r) {
      if (!r.settings) chrome.storage.local.set({ settings: settings });
    });
  } catch (e) {}
})();` + readFileSync(contentFile, 'utf8'));
console.log('seed rule for', host, 'prepended to content.js');

// —— 2. 启动无头浏览器加载扩展 ——
rmSync(PROFILE, { recursive: true, force: true });
const edge = spawn(EDGE, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  `--load-extension=${EXT_PATH}`,
  TARGET_URL,
], { stdio: 'ignore' });

try {
  // —— 3. 等页面目标就绪 ——
  let page = null;
  for (let i = 0; i < 40 && !page; i++) {
    await sleep(500);
    const targets = await getTargets().catch(() => []);
    page = targets.find((t) => t.type === 'page' && t.url.includes(host));
  }
  if (!page) throw new Error('page target 未找到');
  await sleep(2000); // 等内容脚本注入 + storage 种入触发渲染

  const conn = await connect(page.webSocketDebuggerUrl);

  // —— 4. 验证水印节点（shadow root 为 closed，无法从主世界穿透，
  //      因此以宿主节点 + 截图作为依据；贴图渲染已由截图人工复核）——
  const probe = await conn.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      host: !!document.getElementById('__aquamark-host__'),
      detached: !!document.getElementById('__aquamark-host__') && !document.getElementById('__aquamark-host__').isConnected,
    })`,
  });
  const result = JSON.parse(probe.result.result.value);
  console.log('probe:', JSON.stringify(result));

  // —— 5. 截图 ——
  const shot = await conn.send('Page.captureScreenshot', { format: 'png' });
  const out = join(EXT_PATH, '..', 'e2e-shot.png');
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('screenshot saved:', out);
  conn.close();

  const ok = result.host === true && result.detached === false;
  console.log(ok ? 'E2E PASS（水印节点已挂载，水印效果见 e2e-shot.png）' : 'E2E FAIL: watermark node missing');
  if (!ok) process.exitCode = 1;
} catch (e) {
  console.error('E2E FAIL:', e.message);
  process.exitCode = 1;
} finally {
  edge.kill();
  await sleep(500);
  rmSync(PROFILE, { recursive: true, force: true });
}
