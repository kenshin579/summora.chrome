// chrome.i18n 래퍼. 정적 텍스트는 data-i18n 속성으로, 동적 텍스트는 t() 로 처리한다.
export const t = (key, subs) => chrome.i18n.getMessage(key, subs);

// data-i18n 속성이 달린 요소를 일괄 치환하고 문서 언어를 실제 UI 언어로 설정한다.
export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = t(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });
  document.documentElement.lang = chrome.i18n.getUILanguage();
}
