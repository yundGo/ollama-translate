let currentDomain = '';

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getDomainRules(rules) {
  const r = rules?.[currentDomain];
  return { xpaths: r?.xpaths || [], exclude: r?.exclude || [], enabled: r?.enabled ?? true };
}

async function init() {
  const tab = await getCurrentTab();
  if (!tab?.url) {
    document.getElementById('domain').textContent = '无法获取页面信息';
    return;
  }

  try {
    currentDomain = new URL(tab.url).hostname;
  } catch {
    document.getElementById('domain').textContent = '无效的页面地址';
    return;
  }

  document.getElementById('domain').textContent = currentDomain;

  await checkPendingPick(tab.id);
  await loadToggleState();
  await renderXPathList();
  await renderExcludeList();
  checkOllamaStatus();

  document.getElementById('btnAdd').addEventListener('click', onAddXPath);
  document.getElementById('xpathInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onAddXPath();
  });
  document.getElementById('btnPick').addEventListener('click', onPickElement);
  document.getElementById('btnTranslate').addEventListener('click', onTranslate);
  document.getElementById('btnSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('btnAddExclude').addEventListener('click', onAddExclude);
  document.getElementById('excludeInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onAddExclude();
  });
  document.getElementById('toggleAuto').addEventListener('change', onToggleAuto);
}

async function loadToggleState() {
  const { rules } = await chrome.storage.local.get('rules');
  const { enabled } = getDomainRules(rules);
  document.getElementById('toggleAuto').checked = enabled;
}

async function onToggleAuto() {
  const enabled = document.getElementById('toggleAuto').checked;
  const { rules } = await chrome.storage.local.get('rules');
  const { xpaths, exclude } = getDomainRules(rules);
  await saveDomainRules(xpaths, exclude, enabled);
  const tab = await getCurrentTab();
  if (tab?.id && enabled) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'translate' });
    } catch {}
  }
}

async function checkPendingPick(tabId) {
  const { _pendingPick, rules } = await chrome.storage.local.get(['_pendingPick', 'rules']);
  if (!_pendingPick) return;

  if (_pendingPick.domain === currentDomain) {
    const updated = { ...(rules || {}) };
    if (!updated[currentDomain]) updated[currentDomain] = { xpaths: [], exclude: [], enabled: true };
    if (!updated[currentDomain].xpaths.includes(_pendingPick.xpath)) {
      updated[currentDomain].xpaths.push(_pendingPick.xpath);
    }
    await chrome.storage.local.set({ rules: updated });
  }
  await chrome.storage.local.remove('_pendingPick');
}

async function saveDomainRules(xpaths, exclude, enabled) {
  const { rules } = await chrome.storage.local.get('rules');
  const updated = { ...(rules || {}) };
  const data = {};
  if (xpaths.length) data.xpaths = xpaths;
  if (exclude.length) data.exclude = exclude;
  if (enabled !== undefined) data.enabled = enabled;
  if (data.xpaths || data.exclude || Object.hasOwn(data, 'enabled')) {
    updated[currentDomain] = data;
  } else {
    delete updated[currentDomain];
  }
  await chrome.storage.local.set({ rules: updated });
}

async function renderXPathList() {
  const { rules } = await chrome.storage.local.get('rules');
  const { xpaths } = getDomainRules(rules);
  const list = document.getElementById('xpathList');
  const count = document.getElementById('xpathCount');

  list.innerHTML = '';
  count.textContent = xpaths.length;

  if (!xpaths.length) {
    list.innerHTML = '<div class="empty-state">暂无 XPath 规则</div>';
    return;
  }

  xpaths.forEach((xpath, i) => {
    const item = document.createElement('div');
    item.className = 'xpath-item';
    item.innerHTML = `
      <span class="xpath-text">${escapeHtml(xpath)}</span>
      <button class="btn-remove" data-index="${i}" title="删除">✕</button>
    `;
    item.querySelector('.btn-remove').addEventListener('click', () => onRemoveXPath(i));
    list.appendChild(item);
  });
}

async function renderExcludeList() {
  const { rules } = await chrome.storage.local.get('rules');
  const { exclude } = getDomainRules(rules);
  const list = document.getElementById('excludeList');

  list.innerHTML = '';

  if (!exclude.length) {
    list.innerHTML = '<div class="empty-state">暂无排除规则</div>';
    return;
  }

  exclude.forEach((sel, i) => {
    const item = document.createElement('div');
    item.className = 'xpath-item';
    item.innerHTML = `
      <span class="xpath-text">${escapeHtml(sel)}</span>
      <button class="btn-remove" data-index="${i}" title="删除">✕</button>
    `;
    item.querySelector('.btn-remove').addEventListener('click', () => onRemoveExclude(i));
    list.appendChild(item);
  });
}

async function onAddXPath() {
  const input = document.getElementById('xpathInput');
  const xpath = input.value.trim();
  if (!xpath) return;

  const { rules } = await chrome.storage.local.get('rules');
  const { xpaths, exclude, enabled } = getDomainRules(rules);
  if (!xpaths.includes(xpath)) xpaths.push(xpath);
  await saveDomainRules(xpaths, exclude, enabled);
  input.value = '';
  await renderXPathList();
}

async function onRemoveXPath(index) {
  const { rules } = await chrome.storage.local.get('rules');
  const { xpaths, exclude, enabled } = getDomainRules(rules);
  xpaths.splice(index, 1);
  await saveDomainRules(xpaths, exclude, enabled);
  await renderXPathList();
}

async function onAddExclude() {
  const input = document.getElementById('excludeInput');
  const sel = input.value.trim();
  if (!sel) return;

  const { rules } = await chrome.storage.local.get('rules');
  const { xpaths, exclude, enabled } = getDomainRules(rules);
  if (!exclude.includes(sel)) exclude.push(sel);
  await saveDomainRules(xpaths, exclude, enabled);
  input.value = '';
  await renderExcludeList();
}

async function onRemoveExclude(index) {
  const { rules } = await chrome.storage.local.get('rules');
  const { xpaths, exclude, enabled } = getDomainRules(rules);
  exclude.splice(index, 1);
  await saveDomainRules(xpaths, exclude, enabled);
  await renderExcludeList();
}

async function onPickElement() {
  const tab = await getCurrentTab();
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'startPicker' });
  } catch {
    alert('无法在当前页面启动元素选择器，请刷新页面后重试。');
  }
  window.close();
}

async function onTranslate() {
  const tab = await getCurrentTab();
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'translate' });
  } catch {
    alert('无法触发翻译，请刷新页面后重试。');
  }
  window.close();
}

async function checkOllamaStatus() {
  const el = document.getElementById('statusOllama');
  el.className = 'status status-loading';
  el.textContent = '检查 Ollama 连接...';
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'listModels' });
    if (resp.error) {
      el.className = 'status status-err';
      el.textContent = '⚠️ Ollama 未运行';
    } else {
      el.className = 'status status-ok';
      el.textContent = `✓ Ollama 运行中 (${resp.models.length} 个模型)`;
    }
  } catch {
    el.className = 'status status-err';
    el.textContent = '⚠️ Ollama 未运行';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
