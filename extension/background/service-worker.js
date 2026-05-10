const LOG_PREFIX = '[Ollama Translate BG]';

const DEFAULTS = {
  model: 'qwen3:8b',
  prompt: 'Translate the following content into Chinese, and only return the translated result.For content that should not be translated (such as proper nouns, code, etc.), keep the original text.'
};

const pendingRequests = new Map();

function addPending(tabId, controller) {
  if (!tabId) return;
  if (!pendingRequests.has(tabId)) pendingRequests.set(tabId, []);
  pendingRequests.get(tabId).push(controller);
}

function removePending(tabId, controller) {
  if (!tabId) return;
  const list = pendingRequests.get(tabId);
  if (list) {
    const idx = list.indexOf(controller);
    if (idx !== -1) list.splice(idx, 1);
    if (list.length === 0) pendingRequests.delete(tabId);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  const list = pendingRequests.get(tabId);
  if (list) {
    console.log(LOG_PREFIX, 'tab closed, aborting', list.length, 'pending request(s)');
    list.forEach((c) => c.abort());
    pendingRequests.delete(tabId);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(LOG_PREFIX, 'received message:', message.action);

  if (message.action === 'translate') {
    const tabId = sender.tab?.id;
    const controller = new AbortController();
    addPending(tabId, controller);

    console.log(LOG_PREFIX, 'translate request, text length:', message.text?.length, 'model:', message.model);

    translateText(message.text, message.model, message.prompt, controller.signal)
      .then((translated) => {
        removePending(tabId, controller);
        sendResponse({ translated });
      })
      .catch((err) => {
        removePending(tabId, controller);
        if (err.name === 'AbortError') {
          console.log(LOG_PREFIX, 'request aborted');
          sendResponse({ aborted: true });
        } else {
          console.error(LOG_PREFIX, 'Error:', err.message, err.stack);
          sendResponse({ error: err.message });
        }
      });
    return true;

  } else if (message.action === 'listModels') {
    listModels()
      .then((models) => sendResponse({ models }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  } else if (message.action === 'getDefaults') {
    sendResponse(DEFAULTS);
  }
});

async function translateText(text, model, prompt, signal) {
  const url = 'http://localhost:11434/v1/chat/completions';

  const body = {
    model: model || DEFAULTS.model,
    messages: [
      { role: 'system', content: prompt || DEFAULTS.prompt },
      { role: 'user', content: text }
    ],
    stream: false
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  if (res.status === 403) {
    throw new Error(
      'Ollama 拒绝了请求，需要设置环境变量允许扩展访问：\n' +
      '1. 退出 Ollama（菜单栏图标 → Quit）\n' +
      '2. 终端执行: launchctl setenv OLLAMA_ORIGINS "*"\n' +
      '3. 重新打开 Ollama\n' +
      '或直接运行: OLLAMA_ORIGINS=* /Applications/Ollama.app/Contents/MacOS/Ollama'
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${res.statusText}. ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function listModels() {
  const res = await fetch('http://localhost:11434/api/tags');
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return data.models || [];
}
