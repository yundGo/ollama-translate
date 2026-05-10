# Ollama Translate

> 浏览器扩展 — 使用本地 Ollama 模型翻译网页，数据不出本机，完全免费。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-≥116-4285F4?logo=googlechrome&logoColor=white)](https://chrome.google.com)
[![Edge](https://img.shields.io/badge/Edge-≥116-0078D7?logo=microsoftedge&logoColor=white)](https://microsoftedge.com)

## 特点

- **🔒 本地处理** — 连接本地 Ollama，所有文本均在本地完成翻译，不上传任何数据到云端
- **🎯 精准翻译区域** — 为每个域名配置 XPath，只翻译你关心的区域，不影响页面其他部分
- **🚫 排除区域** — CSS 选择器排除代码块、导航栏等不需要翻译的元素
- **🏗️ 保留 HTML 结构** — 只替换文本内容，链接、图片、代码高亮等标签完整保留
- **🔄 自动去重** — 多条 XPath 规则匹配到同一元素时只翻译一次，不会重复处理
- **🧠 SPA 兼容** — 自动检测页面路由变化，React/Vue 单页应用也可正常工作
- **🖱️ 元素选取器** — 点击页面元素自动生成 XPath，无需手写
- **🧩 自定义模型与提示词** — 使用你喜欢的任何 Ollama 模型，自由编写翻译提示词
- **⏱️ 标签页关闭即取消** — 关闭页面时自动中断 Ollama 请求，不浪费算力
- **💸 完全免费** — 本地运行，无 API 费用，无限使用

## 快速开始

### 前提条件

1. 安装 [Ollama](https://ollama.com) 并启动
2. 拉取一个翻译模型（如 `ollama pull qwen3:8b`）

### 安装扩展

1. 下载此仓库到本地
2. 打开浏览器扩展管理页面：
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. 开启 **开发者模式**
4. 点击 **加载已解压的扩展**，选择 `extension/` 目录

### Ollama CORS 配置

浏览器扩展需要 Ollama 允许跨域请求：

```bash
# macOS 桌面版
launchctl setenv OLLAMA_ORIGINS "*"
# 重启 Ollama 应用

# 终端启动
export OLLAMA_ORIGINS=*
ollama serve
```

## 使用方法

### 1. 配置翻译区域

打开任意网页 → 点击扩展图标 → 输入 XPath 或点击 **选取页面元素** → 添加

![popup](https://via.placeholder.com/360x400?text=Popup+Preview)

### 2. 配置排除区域（可选）

在弹窗的"排除区域"中输入 CSS 选择器，代码块等内容将被跳过。

示例排除规则：
- `.pub-pre-copy-container` — 排除代码块
- `pre`, `code` — 排除 `<pre>` 和 `<code>` 元素
- `.sidebar`, `nav` — 排除侧边栏和导航

### 3. 自定义模型和提示词

右键扩展图标 → **选项** → 设置模型名称和翻译提示词。

支持所有 Ollama 模型：`qwen3:8b`、`llama3.2`、`gemma3` 等。

## 数据流

```
网页内容 → TreeWalker 提取文本节点 → 过滤排除区域
    → 逐条发送到本地 Ollama API → 翻译结果
    → 替换文本节点 → MutationObserver 保护翻译不被框架覆盖
```

## 扩展截图

| 弹窗管理 | 设置页面 |
|---------|---------|
| 管理当前域名 XPath 和排除规则 | 配置模型、提示词、全局规则 |
| *(截图待补充)* | *(截图待补充)* |

## 开发

```bash
git clone https://github.com/yundGo/ollama-translate.git
cd ollama-translate
# 修改代码后，在 chrome://extensions 刷新扩展
```

调试日志：`chrome://extensions` → 点击扩展的 **Service Worker** 链接。

## 项目结构

```
extension/
├── manifest.json              # MV3 配置
├── content/content.js         # 页面脚本：XPath匹配、翻译替换、SPA支持
├── background/service-worker.js  # Ollama API 通信、请求取消
├── popup/popup.{html,css,js}  # 弹窗：XPath 和排除规则管理
├── options/options.{html,css,js}  # 设置：模型、提示词、全局规则
└── icons/                     # 扩展图标
```

## 技术栈

- Manifest V3 (Chrome / Edge)
- Ollama OpenAI-compatible API (`/v1/chat/completions`)
- TreeWalker + MutationObserver
- AbortController 请求取消

## 协议

MIT
