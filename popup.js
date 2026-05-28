import { normalizeUrl, isSavableUrl } from "./src/url.js";
import { getBaseUrl, saveArticle } from "./src/api.js";

const metaEl = document.getElementById("meta");
const saveBtn = document.getElementById("save");
const resultEl = document.getElementById("result");

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";
  metaEl.textContent = tab?.title ? `${tab.title}\n${url}` : url;

  if (!isSavableUrl(url)) {
    saveBtn.disabled = true;
    resultEl.textContent = "이 페이지는 저장할 수 없습니다.";
    return;
  }
  saveBtn.addEventListener("click", () => save(url));
}

async function save(url) {
  const original = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중…";
  resultEl.textContent = "";

  const baseUrl = await getBaseUrl();
  const result = await saveArticle(baseUrl, normalizeUrl(url));

  if (result.ok) {
    saveBtn.textContent = "저장됨";
    resultEl.textContent = "저장됨 ✓ ";
    const id = result.article?.id;
    if (id != null) {
      const a = document.createElement("a");
      a.href = `${baseUrl}/articles/${id}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "웹앱에서 보기";
      resultEl.appendChild(a);
    }
  } else {
    saveBtn.disabled = false;
    saveBtn.textContent = original;
    resultEl.textContent = `실패 ✗ ${result.message}`;
  }
}

init();
