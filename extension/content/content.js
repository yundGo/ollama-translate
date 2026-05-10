const LOG_PREFIX = '[Ollama Translate]';

(function () {
  'use strict';

  const translatedElements = new Map();

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

  function isMostlyChinese(text) {
    const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
    if (!cjk) return false;
    const letters = text.replace(/\s/g, '').length;
    return letters > 0 && cjk.length / letters > 0.5;
  }

  function isExcluded(node, selectors) {
    if (!selectors?.length) return false;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return false;
    return selectors.some((sel) => el.closest(sel));
  }

  function forEachTextNode(element, exclude, fn) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let i = 0;
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      if (isExcluded(walker.currentNode, exclude)) continue;
      fn(walker.currentNode, i);
      i++;
    }
  }

  async function translateElement(element, model, userPrompt, exclude) {
    console.log(LOG_PREFIX, 'translateElement, model:', model);

    const texts = [];
    forEachTextNode(element, exclude, (node, i) => {
      texts.push(node.textContent);
    });

    if (!texts.length) {
      console.warn(LOG_PREFIX, 'No text nodes found');
      return;
    }

    console.log(LOG_PREFIX, 'text nodes to translate:', texts.length);

    const translations = [];

    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (isMostlyChinese(t)) {
        translations.push(t);
        continue;
      }

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'translate',
          text: t,
          model,
          prompt: userPrompt
        });
        if (response?.translated) {
          forEachTextNode(element, exclude, (node, idx) => {
            if (idx === i && node.textContent !== response.translated) {
              node.textContent = response.translated;
            }
          });
          translations.push(response.translated);
        } else {
          translations.push(texts[i]);
        }
      } catch (err) {
        console.error(LOG_PREFIX, 'text node translation failed:', err.message);
        translations.push(texts[i]);
      }
    }

    translatedElements.set(element, { translations, exclude });
    ensureGlobalProtector();
  }

  function applyTranslations(element, data) {
    if (!element.isConnected) return;
    forEachTextNode(element, data.exclude, (node, i) => {
      if (i < data.translations.length && node.textContent !== data.translations[i]) {
        node.textContent = data.translations[i];
      }
    });
  }

  let globalProtector = null;

  function ensureGlobalProtector() {
    if (globalProtector) return;
    globalProtector = new MutationObserver(() => {
      for (const [element, data] of translatedElements) {
        if (!element.isConnected) {
          translatedElements.delete(element);
          continue;
        }
        applyTranslations(element, data);
      }
    });
    globalProtector.observe(document.body, { childList: true, subtree: true, characterData: true });
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

    const model = settings?.model;
    const userPrompt = settings?.prompt;
    const exclude = domainRules.exclude || [];

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
        promises.push(translateElement(el, model, userPrompt, exclude));
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
