# Ollama Translate

> Browser extension — Translate web pages using local Ollama. Private, free, no data leaves your machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-≥116-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com)
[![Edge](https://img.shields.io/badge/Edge-≥116-0078D7?logo=microsoftedge&logoColor=white)](https://microsoftedge.com)

## Features

- **🔒 100% Local** — Connects to your local Ollama instance. No data ever leaves your machine.
- **🎯 Precise Translation Zones** — Configure XPath rules per domain to translate only the areas you care about.
- **🚫 Exclusion Zones** — CSS selectors to skip code blocks, navigation bars, etc.
- **🏗️ HTML Structure Preserved** — Only text nodes are replaced. Links, images, code highlighting stay intact.
- **🧠 SPA Compatible** — Automatically detects route changes. Works with React, Vue, and other SPA frameworks.
- **🖱️ Element Picker** — Click any element on the page to auto-generate its XPath — no manual typing needed.
- **🧩 Custom Model & Prompt** — Use any Ollama model, write your own translation prompt.
- **⏱️ Tab-Close Abort** — Closes the tab? Pending requests are cancelled instantly. No wasted compute.
- **💸 Completely Free** — Runs locally. No API keys, no subscriptions, no limits.

## Quick Start

### Prerequisites

1. Install [Ollama](https://ollama.com) and start it
2. Pull a model (e.g. `ollama pull qwen3:8b`)

### Install the Extension

1. Clone or download this repository
2. Open your browser's extension management:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `extension/` directory

### Ollama CORS Configuration

Browser extensions need Ollama to allow cross-origin requests:

```bash
# macOS desktop app
launchctl setenv OLLAMA_ORIGINS "*"
# Then restart the Ollama app

# Terminal launch
export OLLAMA_ORIGINS=*
ollama serve
```

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

Right-click the extension icon → **Options** → set your model name and translation prompt.

Supports any Ollama model: `qwen3:8b`, `llama3.2`, `gemma3`, etc.

## Data Flow

```
Page content → TreeWalker extracts text nodes → filter excluded zones
    → send each text to local Ollama → receive translation
    → replace text node → MutationObserver guards against framework re-renders
```

## Development

```bash
git clone https://github.com/yundGo/ollama-translate.git
cd ollama-translate
# Edit code, then refresh the extension at chrome://extensions
```

Debug logs: `chrome://extensions` → click the extension's **Service Worker** link.

## Project Structure

```
extension/
├── manifest.json              # MV3 config
├── content/content.js         # Page script: XPath matching, translation, SPA support
├── background/service-worker.js  # Ollama API calls, request abort
├── popup/popup.{html,css,js}  # Popup: XPath and exclusion zone management
├── options/options.{html,css,js}  # Settings: model, prompt, global rules
└── icons/                     # Extension icons
```

## Tech Stack

- Manifest V3 (Chrome / Edge)
- Ollama OpenAI-compatible API (`/v1/chat/completions`)
- TreeWalker + MutationObserver
- AbortController

## License

MIT
