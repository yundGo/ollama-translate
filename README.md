# Local Translate

> Browser extension — Translate web pages using local LLMs. Private, free, no data leaves your machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-≥116-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com)
[![Edge](https://img.shields.io/badge/Edge-≥116-0078D7?logo=microsoftedge&logoColor=white)](https://microsoftedge.com)

## Features

- **🔒 100% Local** — Connects to your local LLM backend. No data ever leaves your machine.
- **⏹️ Per-Site Toggle** — Enable or disable auto-translation for each website independently via the popup.
- **🎯 Precise Translation Zones** — Configure XPath rules per domain to translate only the areas you care about.
- **🚫 Exclusion Zones** — CSS selectors to skip code blocks, navigation bars, etc.
- **🏗️ HTML Structure Preserved** — Only text nodes are replaced. Links, images, code highlighting stay intact.
- **🔄 Automatic Deduplication** — Overlapping XPath rules never cause duplicate translations. An element is translated once regardless of how many rules match it.
- **🧠 SPA Compatible** — Automatically detects route changes. Works with React, Vue, and other SPA frameworks.
- **🖱️ Element Picker** — Click any element on the page to auto-generate its XPath — no manual typing needed.
- **🧩 Custom Model & Prompt** — Use any model, write your own translation prompt.
- **⏱️ Tab-Close Abort** — Closes the tab? Pending requests are cancelled instantly. No wasted compute.
- **💸 Completely Free** — Runs locally. No API keys, no subscriptions, no limits.
- **🔌 Backend Agnostic** — Works with any OpenAI-compatible API: Ollama, LM Studio, llama.cpp, and more.

## Quick Start

### Prerequisites

A local LLM backend running with an OpenAI-compatible API. Choose one:

- [Ollama](https://ollama.com) — `ollama pull qwen3:8b && ollama serve`
- [LM Studio](https://lmstudio.ai) — Start the local inference server
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — `./server -m model.gguf`

### Install the Extension

1. Clone or download this repository
2. Open your browser's extension management:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `extension/` directory

### Configure

1. Right-click the extension icon → **Options**
2. Set the **API Endpoint** (e.g. `http://localhost:11434/v1/chat/completions`)
3. Set your model name and click **Save**

## Usage

### 1. Configure Translation Zones

Open any page → click the extension icon → enter an XPath or click **Pick Element** → add it.

### 2. Configure Exclusion Zones (optional)

Add CSS selectors in the popup's "Exclusion Zones" section to skip unwanted areas.

Example exclusion selectors:
- `.pub-pre-copy-container` — skip code blocks
- `pre`, `code` — skip `<pre>` and `<code>` elements
- `.sidebar`, `nav` — skip sidebars and navigation

### 3. Customise Model & Prompt

Right-click the extension icon → **Options** → set your API endpoint, model name and translation prompt.

## Data Flow

```
Page content → TreeWalker extracts text nodes → filter excluded zones
    → send each text to local LLM → receive translation
    → replace text node → MutationObserver guards against framework re-renders
```

## Development

```bash
git clone https://github.com/yundGo/local-translate.git
cd local-translate
# Edit code, then refresh the extension at chrome://extensions
```

Debug logs: `chrome://extensions` → click the extension's **Service Worker** link.

## Project Structure

```
extension/
├── manifest.json              # MV3 config
├── content/content.js         # Page script: XPath matching, translation, SPA support
├── background/service-worker.js  # API calls, request abort
├── popup/popup.{html,css,js}  # Popup: XPath and exclusion zone management
├── options/options.{html,css,js}  # Settings: endpoint, model, prompt, global rules
└── icons/                     # Extension icons
```

## Tech Stack

- Manifest V3 (Chrome / Edge)
- OpenAI-compatible API (`/v1/chat/completions`)
- TreeWalker + MutationObserver
- AbortController

## License

MIT
