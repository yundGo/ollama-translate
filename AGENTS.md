# AGENTS.md — Ollama Translate

## ⚠️ 重要约束

- **禁止自动提交 git** — 只有用户明确要求时才执行 git commit。
- **禁止修改默认提示词** — DEFAULTS.prompt 的内容由用户自行维护，不要改动。

Browser extension (Chrome/Edge MV3) that translates webpage regions using local Ollama, with per-domain XPath rule memory.

## Project structure

```
extension/
├── manifest.json              # MV3 config
├── content/content.js         # Page script: XPath matching, text extraction, translation replacement, element picker, SPA URL observer
├── background/service-worker.js  # Ollama API calls via fetch, tab-close abort, DEFAULTS single source of truth
├── popup/popup.{html,css,js}  # Per-domain XPath rule management
├── options/options.{html,css,js}  # Global settings (model, prompt, rule management)
└── icons/icon{16,48,128}.png  # Placeholder icons
```

## Key architecture facts

- **DEFAULTS (model + prompt)** are defined once in `background/service-worker.js` as a `DEFAULTS` constant. All other files fetch them via the `getDefaults` message. Never hardcode defaults elsewhere.
- **Translation flow**: content script walks text nodes via `TreeWalker` → sends each to service worker via `chrome.runtime.sendMessage` → service worker calls `POST /v1/chat/completions` (OpenAI-compatible endpoint) → content script sets `node.textContent` individually → `protectTranslation()` MutationObserver guards against React re-renders.
- **Abort on tab close**: service worker tracks pending requests per `tabId` via `AbortController`. `chrome.tabs.onRemoved` aborts all.
- **Element picker**: popup sends `startPicker` to content script → hover-highlight + click → XPath saved to `_pendingPick` in storage → popup picks it up on next open.

## Developer commands

Load unpacked extension:
- Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `extension/`.
- Edge: `edge://extensions` → Developer mode → Load unpacked → select `extension/`.
- After code changes, click the refresh icon on the extension card in `chrome://extensions`.

## Debugging

- Service worker logs: `chrome://extensions` → find Ollama Translate → click "Service Worker" (blue link) → opens DevTools with Console + Network tabs.
- All logs prefixed with `[Ollama Translate]` or `[Ollama Translate BG]`.
- Page translation requests (`localhost:11434/v1/chat/completions`) appear in the service worker's **Network** tab, NOT the page's Network panel.

## Ollama connectivity

- Uses OpenAI-compatible endpoint: `POST /v1/chat/completions`.
- 403 error means Ollama's CORS middleware blocks `chrome-extension://` origin. Fix: set `OLLAMA_ORIGINS=*` and restart Ollama.
- For macOS desktop app: `launchctl setenv OLLAMA_ORIGINS "*"` then restart Ollama app.

## Constraints

- `chrome.sockets.tcp` is NOT available in MV3 extensions (was Chrome Apps only).
