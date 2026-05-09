const DEFAULTS = {
  model: 'qwen3:8b',
  prompt: 'Translate the following content into English, and only return the translated result.For content that should not be translated (such as proper nouns, code, etc.), keep the original text.'
};

async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings) {
    document.getElementById('model').value = settings.model || '';
    document.getElementById('prompt').value = settings.prompt || '';
  }
}

async function saveSettings() {
  const model = document.getElementById('model').value.trim();
  const prompt = document.getElementById('prompt').value.trim();
  await chrome.storage.local.set({
    settings: { model: model || DEFAULTS.model, prompt }
  });
  const status = document.getElementById('saveStatus');
  status.textContent = '✓ 已保存';
  setTimeout(() => { status.textContent = ''; }, 2000);
}

function restorePrompt() {
  document.getElementById('prompt').value = DEFAULTS.prompt;
}

function resetAll() {
  document.getElementById('model').value = '';
  document.getElementById('prompt').value = '';
  chrome.storage.local.remove('settings', () => {
    document.getElementById('saveStatus').textContent = '✓ 已恢复默认';
    setTimeout(() => { document.getElementById('saveStatus').textContent = ''; }, 2000);
  });
}

async function detectModels() {
  const container = document.getElementById('modelList');
  container.innerHTML = '<span class="hint">检测中...</span>';
  try {
    const response = await chrome.runtime.sendMessage({ action: 'listModels' });
    if (response.error) {
      container.innerHTML = `<span class="hint" style="color:#e53935">连接 Ollama 失败: ${response.error}</span>`;
      return;
    }
    if (!response.models?.length) {
      container.innerHTML = '<span class="hint">未找到模型</span>';
      return;
    }
    container.innerHTML = response.models
      .map((m) => `<span class="model-tag" data-name="${escapeHtml(m.name)}">${escapeHtml(m.name)}</span>`)
      .join('') + '<span class="hint" style="display:block;margin-top:6px">点击模型名自动填入</span>';

    container.querySelectorAll('.model-tag').forEach((tag) => {
      tag.addEventListener('click', () => {
        document.getElementById('model').value = tag.dataset.name;
        container.innerHTML = '';
      });
    });
  } catch (err) {
    container.innerHTML = `<span class="hint" style="color:#e53935">通信失败: ${err.message}</span>`;
  }
}

async function renderRules() {
  const container = document.getElementById('rulesContainer');
  const { rules } = await chrome.storage.local.get('rules');

  if (!rules || Object.keys(rules).length === 0) {
    container.innerHTML = '<div class="empty-rules">暂无翻译规则</div>';
    return;
  }

  let html = '';
  for (const [domain, data] of Object.entries(rules)) {
    html += `<div class="rule-domain">${escapeHtml(domain)}</div>`;
    data.xpaths.forEach((xpath, i) => {
      html += `
        <div class="rule-item">
          <span class="xpath-text">${escapeHtml(xpath)}</span>
          <button class="btn-remove" data-domain="${escapeHtml(domain)}" data-index="${i}">✕</button>
        </div>`;
    });
  }
  container.innerHTML = html;

  container.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const domain = btn.dataset.domain;
      const index = parseInt(btn.dataset.index, 10);
      const { rules: cur } = await chrome.storage.local.get('rules');
      if (cur?.[domain]) {
        cur[domain].xpaths.splice(index, 1);
        if (cur[domain].xpaths.length === 0) delete cur[domain];
        await chrome.storage.local.set({ rules: cur });
        await renderRules();
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
document.getElementById('btnDetectModels').addEventListener('click', detectModels);
document.getElementById('btnRestorePrompt').addEventListener('click', restorePrompt);
document.getElementById('btnResetAll').addEventListener('click', resetAll);
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  renderRules();
});
