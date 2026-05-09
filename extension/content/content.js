const LOG_PREFIX = '[Ollama Translate]';

(function () {
  'use strict';

  function getElementXPath(element) {
    if (element.id) return `//*[@id="${element.id}"]`;
    if (element === document.body) return '/html/body';
    let path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.id) {
        path.unshift(`//*[@id="${element.id}"]`);
        break;
      }
      let sibling = element;
      let count = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName === element.nodeName) count++;
      }
      if (count > 1) selector += `[${count}]`;
      path.unshift(selector);
      element = element.parentElement;
    }
    return '/' + path.join('/');
  }

  function getElementsByXPath(xpath) {
    const result = [];
    try {
      const iterator = document.evaluate(
        xpath, document, null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE, null
      );
      let node;
      while ((node = iterator.iterateNext())) {
        if (node.nodeType === Node.ELEMENT_NODE) result.push(node);
      }
    } catch (e) {
      console.warn(LOG_PREFIX, 'Invalid XPath:', xpath, e);
    }
    return result;
  }

  async function translateElement(element, model, prompt) {
    const rawText = element.innerText || element.textContent || '';
    const text = rawText.trim();
    console.log(LOG_PREFIX, 'translateElement, text length:', text.length, 'model:', model);
    if (!text) {
      console.warn(LOG_PREFIX, 'No text content in element');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text,
        model,
        prompt
      });
      if (response?.translated) {
        console.log(LOG_PREFIX, 'Translation OK, length:', response.translated.length);
        element.innerHTML = response.translated;
      } else if (response?.error) {
        console.error(LOG_PREFIX, 'Translation returned error:', response.error);
      } else {
        console.warn(LOG_PREFIX, 'Translation returned empty response:', response);
      }
    } catch (err) {
      console.error(LOG_PREFIX, 'Translation failed:', err.message, err.stack);
    }
  }

  async function translatePage() {
    const domain = window.location.hostname;
    console.log(LOG_PREFIX, 'translatePage called for domain:', domain);

    const { rules, settings } = await chrome.storage.local.get(['rules', 'settings']);
    console.log(LOG_PREFIX, 'storage rules:', JSON.stringify(rules));
    console.log(LOG_PREFIX, 'storage settings:', JSON.stringify(settings));

    const domainRules = rules?.[domain];
    console.log(LOG_PREFIX, 'domainRules for', domain, ':', JSON.stringify(domainRules));

    if (!domainRules?.xpaths?.length) {
      console.log(LOG_PREFIX, 'No xpath rules for this domain, skip');
      return;
    }

    const model = settings?.model || 'qwen3:8b';
    const systemPrompt = settings?.prompt || '将以下内容翻译为中文，保留原文格式，只返回翻译结果';

    const promises = [];
    for (const xpath of domainRules.xpaths) {
      console.log(LOG_PREFIX, 'evaluating xpath:', xpath);
      const elements = getElementsByXPath(xpath);
      console.log(LOG_PREFIX, 'xpath matched', elements.length, 'element(s)');
      if (elements.length === 0) {
        console.warn(LOG_PREFIX, 'xpath matched no elements:', xpath);
      }
      for (const el of elements) {
        if (el.dataset.ollamaTranslated === 'true') {
          console.log(LOG_PREFIX, 'element already translated, skip');
          continue;
        }
        el.dataset.ollamaTranslated = 'true';
        promises.push(translateElement(el, model, systemPrompt));
      }
    }
    console.log(LOG_PREFIX, 'total translation tasks:', promises.length);
    if (promises.length) {
      await Promise.allSettled(promises);
      console.log(LOG_PREFIX, 'all translations done');
    }
  }

  let pickerActive = false;

  function startPicker() {
    if (pickerActive) return;
    pickerActive = true;

    const overlay = document.createElement('div');
    overlay.id = 'ollama-picker-overlay';
    overlay.style.cssText =
      'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #4CAF50;background:rgba(76,175,80,0.1);display:none;transition:all 0.1s;';
    document.body.appendChild(overlay);

    let hoveredEl = null;

    function onMouseMove(e) {
      if (!pickerActive) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== hoveredEl && el !== overlay) {
        hoveredEl = el;
        const rect = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
      }
    }

    function onClick(e) {
      if (!pickerActive) return;
      e.preventDefault();
      e.stopPropagation();
      const xpath = getElementXPath(e.target);
      chrome.storage.local.set({
        _pendingPick: { domain: window.location.hostname, xpath }
      });
      cleanup();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cleanup();
      }
    }

    function cleanup() {
      pickerActive = false;
      hoveredEl = null;
      overlay.remove();
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
    }

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'getPageInfo':
        sendResponse({
          domain: window.location.hostname,
          url: window.location.href
        });
        break;
      case 'translate':
        translatePage().then(() => sendResponse({ done: true }));
        return true;
      case 'startPicker':
        startPicker();
        sendResponse({ started: true });
        break;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', translatePage);
  } else {
    translatePage();
  }

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      translatePage();
    }
  }).observe(document, { subtree: true, childList: true });
})();
