let currentDomain = '';

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
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
  await renderXPathList();

  document.getElementById('btnAdd').addEventListener('click', onAddXPath);
  document.getElementById('xpathInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onAddXPath();
  });
  document.getElementById('btnPick').addEventListener('click', onPickElement);
  document.getElementById('btnTranslate').addEventListener('click', onTranslate);
  document.getElementById('btnSettings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

async function checkPendingPick(tabId) {
  const { _pendingPick, rules } = await chrome.storage.local.get(['_pendingPick', 'rules']);
  if (!_pendingPick) return;

  if (_pendingPick.domain === currentDomain) {
    const updated = { ...(rules || {}) };
    if (!updated[currentDomain]) updated[currentDomain] = { xpaths: [] };
    if (!updated[currentDomain].xpaths.includes(_pendingPick.xpath)) {
      updated[currentDomain].xpaths.push(_pendingPick.xpath);
    }
    await chrome.storage.local.set({ rules: updated });
  }
  await chrome.storage.local.remove('_pendingPick');
}

async function renderXPathList() {
  const { rules } = await chrome.storage.local.get('rules');
  const domainRules = rules?.[currentDomain];
  const list = document.getElementById('xpathList');
  const count = document.getElementById('xpathCount');

  list.innerHTML = '';

  if (!domainRules?.xpaths?.length) {
    list.innerHTML = '<div class="empty-state">暂无 XPath 规则</div>';
    count.textContent = '0';
    return;
  }

  count.textContent = domainRules.xpaths.length;

  domainRules.xpaths.forEach((xpath, i) => {
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

async function onAddXPath() {
  const input = document.getElementById('xpathInput');
  const xpath = input.value.trim();
  if (!xpath) return;

  const { rules } = await chrome.storage.local.get('rules');
  const updated = { ...(rules || {}) };
  if (!updated[currentDomain]) updated[currentDomain] = { xpaths: [] };
  if (!updated[currentDomain].xpaths.includes(xpath)) {
    updated[currentDomain].xpaths.push(xpath);
  }
  await chrome.storage.local.set({ rules: updated });
  input.value = '';
  await renderXPathList();
}

async function onRemoveXPath(index) {
  const { rules } = await chrome.storage.local.get('rules');
  if (!rules?.[currentDomain]) return;
  rules[currentDomain].xpaths.splice(index, 1);
  if (rules[currentDomain].xpaths.length === 0) delete rules[currentDomain];
  await chrome.storage.local.set({ rules });
  await renderXPathList();
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
