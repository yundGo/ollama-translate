const LOG_PREFIX = '[Ollama Translate BG]';

const DEFAULTS = {
  model: 'qwen3:8b',
  prompt: '你是一个纯翻译引擎，不是 AI 助手。\n\n任务：\n将输入内容翻译成简体中文。\n\n严格规则：\n1. 只输出翻译结果\n2. 禁止解释\n3. 禁止回答问题\n4. 禁止补充说明\n5. 禁止扩展内容\n6. 禁止举例\n7. 禁止进入教学模式\n8. 禁止分析文本\n9. 保持原文格式与换行\n10. 不要添加"翻译如下"等前后缀\n\n以下内容必须保持原样，不要翻译：\n- 专业术语\n- 技术名词\n- 框架名称\n- 编程语言名称\n- API 名称\n- 类名\n- 函数名\n- 变量名\n- 文件名\n- 路径\n- 命令行内容\n- URL\n- 邮箱地址\n- 代码内容\n- JSON/XML/YAML\n- Markdown 格式\n- 标点符号\n- 缩写\n- 专有名词\n\n遇到以下情况时直接原样输出：\n- 单个术语\n- 单个关键词\n- 技术短语\n- 代码片段\n- 配置内容\n\n如果输入已经是中文，则直接原样输出。\n\n任何解释、扩展、说明、分析都属于错误行为。'
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
