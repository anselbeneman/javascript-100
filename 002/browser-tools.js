(function () {
  'use strict';

  const SHORTCUT_ACTIONS = Object.freeze({
    ' ': 'pause',
    b: 'benchmark',
    d: 'defaults',
    r: 'randomize',
    s: 'scenario',
  });
  const IGNORED_SHORTCUT_TAGS = new Set(['button', 'input', 'select', 'textarea']);

  function getTargetTagName(target) {
    return target && target.tagName ? String(target.tagName).toLowerCase() : '';
  }

  function isEditableShortcutTarget(target) {
    return IGNORED_SHORTCUT_TAGS.has(getTargetTagName(target)) || Boolean(target && target.isContentEditable);
  }

  function getShortcutAction(event, shortcuts = SHORTCUT_ACTIONS) {
    if (!event || event.altKey || event.ctrlKey || event.metaKey || isEditableShortcutTarget(event.target)) {
      return null;
    }

    const key = String(event.key || '').toLowerCase();
    return shortcuts[key] || null;
  }

  function getGlobalValue(name) {
    if (name === 'document' && typeof document !== 'undefined') {
      return document;
    }

    if (name === 'navigator' && typeof navigator !== 'undefined') {
      return navigator;
    }

    if (name === 'URL' && typeof URL !== 'undefined') {
      return URL;
    }

    if (name === 'setTimeout' && typeof setTimeout !== 'undefined') {
      return setTimeout;
    }

    return null;
  }

  function getBrowserEnvironment(environment) {
    return {
      documentRef: environment && environment.documentRef ? environment.documentRef : getGlobalValue('document'),
      navigatorRef: environment && environment.navigatorRef ? environment.navigatorRef : getGlobalValue('navigator'),
      urlApi: environment && environment.urlApi ? environment.urlApi : getGlobalValue('URL'),
      setTimer: environment && environment.setTimer ? environment.setTimer : getGlobalValue('setTimeout'),
      revokeDelayMs: environment && Number.isFinite(environment.revokeDelayMs) ? environment.revokeDelayMs : 500,
    };
  }

  function fallbackCopyText(text, environment = {}) {
    const { documentRef } = getBrowserEnvironment(environment);

    if (!documentRef) {
      return false;
    }

    const textarea = documentRef.createElement('textarea');

    textarea.value = String(text);
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    documentRef.body.appendChild(textarea);
    textarea.select();

    const copied = documentRef.execCommand('copy');
    textarea.remove();

    return copied;
  }

  async function copyText(text, environment = {}) {
    const { navigatorRef } = getBrowserEnvironment(environment);

    try {
      if (navigatorRef.clipboard && navigatorRef.clipboard.writeText) {
        await navigatorRef.clipboard.writeText(String(text));
        return true;
      }

      return fallbackCopyText(text, environment);
    } catch (error) {
      return fallbackCopyText(text, environment);
    }
  }

  function downloadBlob(name, blob, environment = {}) {
    const { documentRef, urlApi, setTimer, revokeDelayMs } = getBrowserEnvironment(environment);

    if (!documentRef || !urlApi || !setTimer) {
      return;
    }

    const anchor = documentRef.createElement('a');

    anchor.href = urlApi.createObjectURL(blob);
    anchor.download = name;
    documentRef.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimer(() => urlApi.revokeObjectURL(anchor.href), revokeDelayMs);
  }

  window.FluidBrowserTools = Object.freeze({
    copyText,
    downloadBlob,
    fallbackCopyText,
    getShortcutAction,
    isEditableShortcutTarget,
    shortcutActions: SHORTCUT_ACTIONS,
  });
}());
