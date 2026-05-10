# Local Translate

> 浏览器扩展 — 使用本地大模型翻译网页，数据不出本机，完全免费。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-≥116-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com)
[![Edge](https://img.shields.io/badge/Edge-≥116-0078D7?logo=microsoftedge&logoColor=white)](https://microsoftedge.com)

## 特点

- **🔒 本地处理** — 连接本地大模型后端，所有文本均在本地完成翻译，不上传任何数据到云端
- **⏹️ 网站独立开关** — 弹窗中可单独开启或关闭每个网站的自动翻译
- **🎯 精准翻译区域** — 为每个域名配置 XPath，只翻译你关心的区域，不影响页面其他部分
- **🚫 排除区域** — CSS 选择器排除代码块、导航栏等不需要翻译的元素
- **🏗️ 保留 HTML 结构** — 只替换文本内容，链接、图片、代码高亮等标签完整保留
- **🔄 自动去重** — 多条 XPath 规则匹配到同一元素时只翻译一次，不会重复处理
- **🧠 SPA 兼容** — 自动检测页面路由变化，React/Vue 单页应用也可正常工作
- **🖱️ 元素选取器** — 点击页面元素自动生成 XPath，无需手写
- **🧩 自定义模型与提示词** — 自由选择模型和编写翻译提示词
- **⏱️ 标签页关闭即取消** — 关闭页面时自动中断请求，不浪费算力
- **💸 完全免费** — 本地运行，无 API 费用，无限使用
- **🔌 后端无关** — 兼容任何 OpenAI 兼容 API：Ollama、LM Studio、llama.cpp 等
- **🧠 推荐非思考模型** — 不做显式推理的模型翻译更快。推荐：`Qwen/Qwen2.5-3B-Instruct-GGUF`

## 快速开始

### 前提条件

准备一个运行中的本地大模型后端（OpenAI 兼容 API）：

- [Ollama](https://ollama.com) — `ollama pull qwen3:8b && ollama serve`
- [LM Studio](https://lmstudio.ai) — 启动本地推理服务器
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — `./server -m model.gguf`

### 安装扩展

1. 下载此仓库到本地
2. 打开浏览器扩展管理页面：
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. 开启 **开发者模式**
4. 点击 **加载已解压的扩展**，选择 `extension/` 目录

### 配置

1. 右键扩展图标 → **选项**
2. 设置 **API 地址**（例如 `http://localhost:11434/v1/chat/completions`）
3. 设置模型名称并点击 **保存**

## 使用方法

### 1. 配置翻译区域

打开任意网页 → 点击扩展图标 → 输入 XPath 或点击 **选取页面元素** → 添加

### 2. 配置排除区域（可选）

在弹窗的"排除区域"中输入 CSS 选择器，代码块等内容将被跳过。

示例排除规则：
- `.pub-pre-copy-container` — 排除代码块
- `pre`, `code` — 排除 `<pre>` 和 `<code>` 元素
- `.sidebar`, `nav` — 排除侧边栏和导航

### 3. 自定义模型和提示词

右键扩展图标 → **选项** → 设置 API 地址、模型名称和翻译提示词。

推荐使用非思考模型加快翻译速度：`Qwen/Qwen2.5-3B-Instruct-GGUF`。

## 数据流

```
网页内容 → TreeWalker 提取文本节点 → 过滤排除区域
    → 逐条发送到本地大模型 API → 翻译结果
    → 替换文本节点 → MutationObserver 保护翻译不被框架覆盖
```

## 开发

```bash
git clone https://github.com/yundGo/local-translate.git
cd local-translate
# 修改代码后，在 chrome://extensions 刷新扩展
```

调试日志：`chrome://extensions` → 点击扩展的 **Service Worker** 链接。

## 项目结构

```
extension/
├── manifest.json              # MV3 配置
├── content/content.js         # 页面脚本：XPath匹配、翻译替换、SPA支持
├── background/service-worker.js  # API 通信、请求取消
├── popup/popup.{html,css,js}  # 弹窗：XPath 和排除规则管理
├── options/options.{html,css,js}  # 设置：API 地址、模型、提示词、全局规则
└── icons/                     # 扩展图标
```

## 技术栈

- Manifest V3 (Chrome / Edge)
- OpenAI 兼容 API (`/v1/chat/completions`)
- TreeWalker + MutationObserver
- AbortController 请求取消

## 协议

MIT
