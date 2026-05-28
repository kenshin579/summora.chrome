import { normalizeUrl, isSavableUrl, youtubeId } from "./src/url.js";
import { getBaseUrl, saveArticle } from "./src/api.js";

const cardEl = document.getElementById("card");
const actionEl = document.getElementById("action");

function cleanTitle(t) {
  return (t || "").replace(/\s*-\s*YouTube$/, "").trim();
}
function isHttpish(s) {
  return typeof s === "string" && /^(https?:|data:)/.test(s);
}

function renderCard(tab, url) {
  const id = youtubeId(url);
  const card = document.createElement("div");
  card.className = "card";

  if (id) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
    img.alt = "";
    img.addEventListener("error", () => img.remove());
    card.appendChild(img);
  }

  const b = document.createElement("div");
  b.className = "card-b";

  const titleText = cleanTitle(tab?.title) || url;
  if (id) {
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = titleText;
    b.appendChild(title);
  } else {
    const row = document.createElement("div");
    row.className = "row";
    if (isHttpish(tab?.favIconUrl)) {
      const fav = document.createElement("img");
      fav.className = "fav";
      fav.src = tab.favIconUrl;
      fav.alt = "";
      fav.addEventListener("error", () => fav.remove());
      row.appendChild(fav);
    }
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = titleText;
    row.appendChild(title);
    b.appendChild(row);
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  const badge = document.createElement("span");
  badge.className = id ? "badge" : "badge link";
  badge.textContent = id ? "▶ YouTube" : "🔗 링크";
  const urlEl = document.createElement("span");
  urlEl.className = "url";
  urlEl.textContent = url.replace(/^https?:\/\//, "");
  meta.appendChild(badge);
  meta.appendChild(urlEl);
  b.appendChild(meta);

  card.appendChild(b);
  cardEl.replaceChildren(card);
}

function renderSaveButton(onClick) {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "저장";
  btn.addEventListener("click", onClick);
  actionEl.replaceChildren(btn);
  return btn;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";

  if (!isSavableUrl(url)) {
    const note = document.createElement("div");
    note.className = "note";
    note.textContent = "이 페이지는 저장할 수 없습니다.";
    cardEl.replaceChildren(note);
    return;
  }

  renderCard(tab, url);
  renderSaveButton(() => save(url));
}

async function save(url) {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.disabled = true;
  const spin = document.createElement("span");
  spin.className = "spin";
  btn.appendChild(spin);
  btn.appendChild(document.createTextNode("저장 중…"));
  actionEl.replaceChildren(btn);

  const baseUrl = await getBaseUrl();
  const result = await saveArticle(baseUrl, normalizeUrl(url));

  if (result.ok) {
    const wrap = document.createElement("div");
    wrap.className = "success";
    const confirm = document.createElement("div");
    confirm.className = "confirm";
    const check = document.createElement("span");
    check.className = "check";
    check.textContent = "✓";
    confirm.appendChild(check);
    confirm.appendChild(document.createTextNode("저장했어요"));
    wrap.appendChild(confirm);
    const id = result.article?.id;
    if (id != null) {
      const a = document.createElement("a");
      a.className = "btn";
      a.href = `${baseUrl}/articles/${id}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "웹앱에서 보기 →";
      wrap.appendChild(a);
    }
    actionEl.replaceChildren(wrap);
  } else {
    renderSaveButton(() => save(url));
    const err = document.createElement("div");
    err.className = "err";
    err.textContent = `⚠ ${result.message}`;
    actionEl.appendChild(err);
  }
}

init();
