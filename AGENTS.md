# AGENTS.md — Local Translate

## ⚠️ 重要约束

- **禁止自动提交 git** — 只有用户明确要求时才执行 git commit，提交后自动推送。
- **默认分支为 `main`**，非 `master`。
- **禁止修改默认提示词** — DEFAULTS.prompt 的内容由用户自行维护，不要改动。
- **README 双语言维护** — `README.md`（英文）和 `README.zh.md`（中文）同步更新。

Browser extension (Chrome/Edge MV3) that translates webpage regions using local LLMs, with per-domain XPath rule memory.

## Project structure

```
extension/
├── manifest.json              # MV3 config
├── content/content.js         # Page script: XPath matching, text extraction, translation replacement, element picker, SPA URL observer
├── background/service-worker.js  # LLM API calls via fetch, tab-close abort, DEFAULTS single source of truth
├── popup/popup.{html,css,js}  # Per-domain XPath rule management
├── options/options.{html,css,js}  # Global settings (endpoint, model, prompt, rule management)
└── icons/icon{16,48,128}.png  # Placeholder icons
```

## Key architecture facts

- **DEFAULTS (model + endpoint + prompt)** are defined once in `background/service-worker.js` as a `DEFAULTS` constant. All other files fetch them via the `getDefaults` message. Never hardcode defaults elsewhere.
- **Translation flow**: content script walks text nodes via `TreeWalker` → sends each to service worker via `chrome.runtime.sendMessage` → service worker calls `POST /v1/chat/completions` (OpenAI-compatible endpoint) → content script sets `node.textContent` individually → `protectTranslation()` MutationObserver guards against React re-renders.
- **Abort on tab close**: service worker tracks pending requests per `tabId` via `AbortController`. `chrome.tabs.onRemoved` aborts all.
- **Element picker**: popup sends `startPicker` to content script → hover-highlight + click → XPath saved to `_pendingPick` in storage → popup picks it up on next open.
- **Backend agnostic**: API endpoint is configurable in settings. Works with Ollama, LM Studio, llama.cpp, and any OpenAI-compatible backend.

## Developer commands

Load unpacked extension:
- Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `extension/`.
- Edge: `edge://extensions` → Developer mode → Load unpacked → select `extension/`.
- After code changes, click the refresh icon on the extension card in `chrome://extensions`.

## Debugging

- Service worker logs: `chrome://extensions` → find Local Translate → click "Service Worker" (blue link) → opens DevTools with Console + Network tabs.
- All logs prefixed with `[Local Translate]` or `[Local Translate BG]`.
- Page translation requests appear in the service worker's **Network** tab, NOT the page's Network panel.

## Backend connectivity

- Uses OpenAI-compatible endpoint: `POST /v1/chat/completions`.
- CORS: If your backend blocks `chrome-extension://` origin, configure it to allow the origin or set `*`.
  - Ollama: `launchctl setenv OLLAMA_ORIGINS "*"`
  - LM Studio: CORS is enabled by default
  - llama.cpp: CORS is enabled by default

## Constraints

- `chrome.sockets.tcp` is NOT available in MV3 extensions (was Chrome Apps only).
