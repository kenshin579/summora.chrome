# Summora Chrome 확장 — 팝업 UI 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 팝업을 브랜드(종이/테라코타) 테마로 다듬고, 콘텐츠 카드(YouTube 썸네일/일반 파비콘)·소스 배지·재설계한 성공 상태를 적용한다. 저장 로직은 불변.

**Architecture:** `src/url.js`에 `youtubeId()`를 export해 썸네일/배지 판별의 단일 소스로 쓰고, `popup.js`는 이를 이용해 카드와 상태를 DOM으로 안전하게(textContent/`src`만) 렌더한다. CSS는 새 파일 없이 각 HTML에 인라인(zip allowlist 불변). 무빌드 바닐라.

**Tech Stack:** 바닐라 MV3, vitest. 테스트 `node_modules/.bin/vitest run`. 작업 루트 `/Users/frankoh/src/workspace_summora/summora.chrome`, 브랜치 `feat/popup-redesign`(생성됨). 커밋 author `kenshin579@hotmail.com`.

설계: `docs/superpowers/specs/2026-05-28-summora-chrome-popup-redesign-design.md`.

팔레트: paper `#faf6ee`, paper-2 `#f3ebd9`, ink `#2a221c`, ink-2 `#5d4f44`, ink-3 `#8c7d6f`, line `#d8cdb7`, line-faint `#e8dfcc`, accent `#b54526`, accent-press `#993a20`, ok `#2f7d4f`.

---

### Task 1: `src/url.js` — `youtubeId()` export + 테스트

**Files:** Modify `src/url.js`, `src/url.test.js`

- [ ] **Step 1: 실패 테스트 추가** — `src/url.test.js` 상단 import에 `youtubeId` 추가하고, 새 describe 블록 추가:

```js
import { normalizeUrl, isSavableUrl, youtubeId } from "./url.js";
```
```js
describe("youtubeId", () => {
  it("watch / youtu.be / shorts / embed / music → ID", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=ABC123&t=1")).toBe("ABC123");
    expect(youtubeId("https://youtu.be/ABC123?si=x")).toBe("ABC123");
    expect(youtubeId("https://www.youtube.com/shorts/ABC123")).toBe("ABC123");
    expect(youtubeId("https://www.youtube.com/embed/ABC123")).toBe("ABC123");
    expect(youtubeId("https://music.youtube.com/watch?v=ABC123")).toBe("ABC123");
  });
  it("비-YouTube / 파싱 불가 → null", () => {
    expect(youtubeId("https://blog.example.com/post")).toBeNull();
    expect(youtubeId("https://www.youtube.com/")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run src/url.test.js`
Expected: FAIL (`youtubeId` is not a function / export 없음).

- [ ] **Step 3: 구현** — `src/url.js`에서 기존 내부 `youtubeVideoId(u)`(URL 객체 인자)를 **raw 문자열을 받는 export 함수**로 정리. 기존:
```js
function youtubeVideoId(u) {
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return u.pathname.slice(1).split("/")[0] || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
  }
  return null;
}
```
을 다음으로 교체:
```js
export function youtubeId(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return u.pathname.slice(1).split("/")[0] || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
  }
  return null;
}
```
그리고 `normalizeUrl` 안의 호출부를 바꾼다. 기존:
```js
  const id = youtubeVideoId(u);
  if (id) return `https://www.youtube.com/watch?v=${id}`;
```
을:
```js
  const id = youtubeId(raw);
  if (id) return `https://www.youtube.com/watch?v=${id}`;
```
(`normalizeUrl`은 이미 `raw`로 `new URL` 한 뒤 `u`를 갖고 있지만, `youtubeId(raw)`가 자체적으로 파싱하므로 그대로 호출하면 된다. `u` 기반 분기 제거.)

- [ ] **Step 4: 통과 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run`
Expected: 기존 + youtubeId 케이스 전부 PASS(회귀 없음).

- [ ] **Step 5: 커밋**
```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add src/url.js src/url.test.js && git -c user.email=kenshin579@hotmail.com commit -m "feat: url.js youtubeId() export + 테스트"
```

---

### Task 2: 팝업 재디자인 (`popup.html` + `popup.js`)

**Files:** Modify `popup.html`, `popup.js`

- [ ] **Step 1: `popup.html` 교체** (인라인 CSS = 브랜드 테마):

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <style>
      :root{--paper:#faf6ee;--paper2:#f3ebd9;--ink:#2a221c;--ink2:#5d4f44;--ink3:#8c7d6f;
        --line:#d8cdb7;--line-faint:#e8dfcc;--accent:#b54526;--accent-press:#993a20;--ok:#2f7d4f;}
      *{box-sizing:border-box}
      body{width:340px;margin:0;background:var(--paper);
        font-family:-apple-system,system-ui,"Apple SD Gothic Neo",sans-serif;color:var(--ink);}
      .head{display:flex;align-items:center;gap:9px;padding:13px 16px;border-bottom:1px solid var(--line-faint)}
      .head img{width:26px;height:26px;border-radius:7px;display:block}
      .head .name{font-size:15px;font-weight:700;letter-spacing:-.2px}
      .body{padding:14px 16px 16px}
      .note{font-size:13px;color:var(--ink2);padding:4px 0 2px}
      .card{border:1px solid var(--line);border-radius:11px;overflow:hidden;background:#fff}
      .thumb{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:var(--paper2)}
      .card-b{padding:10px 12px}
      .row{display:flex;align-items:center;gap:9px;min-width:0}
      .title{font-size:14px;line-height:1.35;font-weight:600;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .meta{display:flex;align-items:center;gap:7px;margin-top:8px;min-width:0}
      .badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;
        border-radius:999px;background:rgba(181,69,38,.1);color:var(--accent);white-space:nowrap;flex:0 0 auto}
      .badge.link{background:var(--paper2);color:var(--ink2)}
      .url{font-size:11.5px;color:var(--ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .fav{width:15px;height:15px;border-radius:3px;flex:0 0 auto}
      .btn{margin-top:14px;width:100%;padding:11px;font-size:14px;font-weight:700;border:0;border-radius:9px;
        cursor:pointer;font-family:inherit;background:var(--accent);color:#fff;text-align:center}
      .btn:hover{background:var(--accent-press)}
      .btn:disabled{opacity:.6;cursor:default}
      a.btn{display:block;text-decoration:none}
      .success{margin-top:14px;display:flex;flex-direction:column;gap:10px}
      .confirm{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--ok)}
      .check{width:20px;height:20px;border-radius:999px;background:var(--ok);color:#fff;
        display:inline-flex;align-items:center;justify-content:center;font-size:13px}
      .err{margin-top:12px;font-size:12.5px;color:var(--accent);font-weight:600}
      .spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.4);
        border-top-color:#fff;border-radius:50%;vertical-align:-2px;margin-right:6px;animation:sp .7s linear infinite}
      @keyframes sp{to{transform:rotate(360deg)}}
    </style>
  </head>
  <body>
    <div class="head"><img src="icons/icon-48.png" alt="" /><span class="name">Summora</span></div>
    <div class="body">
      <div id="card"></div>
      <div id="action"></div>
    </div>
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 2: `popup.js` 교체** (저장 로직 동일, 렌더링 추가, textContent/`src`만 사용):

```js
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
    const btn2 = renderSaveButton(() => save(url));
    void btn2;
    const err = document.createElement("div");
    err.className = "err";
    err.textContent = `⚠ ${result.message}`;
    actionEl.appendChild(err);
  }
}

init();
```

- [ ] **Step 3: 회귀 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run`
Expected: 기존 테스트 전부 PASS(팝업 DOM 단위테스트 없음 — 수동 확인). import 경로 정상.

- [ ] **Step 4: 커밋**
```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add popup.html popup.js && git -c user.email=kenshin579@hotmail.com commit -m "feat: 팝업 브랜드 테마 + 콘텐츠 카드 + 상태 재설계"
```

---

### Task 3: 옵션 페이지 테마 (`options.html`)

**Files:** Modify `options.html`

- [ ] **Step 1: `options.html` 교체** (종이 테마 + 헤더, 기능/`options.js` 불변):

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <style>
      :root{--paper:#faf6ee;--paper2:#f3ebd9;--ink:#2a221c;--ink2:#5d4f44;
        --line:#d8cdb7;--line-faint:#e8dfcc;--accent:#b54526;--accent-press:#993a20;--ok:#2f7d4f;}
      *{box-sizing:border-box}
      body{margin:0;background:var(--paper);color:var(--ink);
        font-family:-apple-system,system-ui,"Apple SD Gothic Neo",sans-serif;}
      .head{display:flex;align-items:center;gap:9px;padding:14px 18px;border-bottom:1px solid var(--line-faint)}
      .head img{width:26px;height:26px;border-radius:7px;display:block}
      .head .name{font-size:15px;font-weight:700;letter-spacing:-.2px}
      .wrap{max-width:480px;margin:28px auto;padding:0 18px}
      label{display:block;font-size:13px;color:var(--ink2);margin-bottom:6px;font-weight:600}
      input{width:100%;padding:9px 10px;font-size:14px;border:1px solid var(--line);border-radius:8px;
        background:#fff;color:var(--ink)}
      input:focus{outline:none;border-color:var(--accent)}
      .actions{margin-top:14px;display:flex;align-items:center;gap:10px}
      button{padding:9px 16px;font-size:14px;font-weight:700;border:0;border-radius:8px;cursor:pointer;
        background:var(--accent);color:#fff;font-family:inherit}
      button:hover{background:var(--accent-press)}
      .saved{color:var(--ok);font-size:13px;font-weight:600}
    </style>
  </head>
  <body>
    <div class="head"><img src="icons/icon-48.png" alt="" /><span class="name">Summora 설정</span></div>
    <div class="wrap">
      <label for="baseUrl">API 주소</label>
      <input id="baseUrl" type="url" placeholder="https://summora.advenoh.pe.kr" />
      <div class="actions">
        <button id="save">저장</button>
        <span class="saved" id="saved" hidden>저장됨 ✓</span>
      </div>
    </div>
    <script type="module" src="options.js"></script>
  </body>
</html>
```
(`options.js`의 DOM 참조 id — `baseUrl`, `save`, `saved` — 전부 그대로 유지하므로 로직 변경 없음.)

- [ ] **Step 2: 회귀 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run`
Expected: 전부 PASS(옵션 DOM 수동 확인).

- [ ] **Step 3: 커밋**
```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add options.html && git -c user.email=kenshin579@hotmail.com commit -m "feat: 옵션 페이지 브랜드 테마"
```

---

## 검증 (수동 — 압축 해제 로드 후)

설계 §6. YouTube/일반/성공/에러/저장불가 상태와 옵션 테마를 Chrome에서 확인. 머지 후 `make tag patch`(v1.0.2) 릴리스.

---

## Self-Review 결과

- **Spec coverage:** §4.1 youtubeId→T1, §4.2 popup.html→T2S1, §4.3 popup.js(카드/상태/textContent)→T2S2, §4.4 options→T3, §5 테스트→T1 + 회귀, §6 검수→검증 섹션, §7 배포→검증 섹션. 누락 없음.
- **Placeholder scan:** TBD/TODO 없음. 전체 코드 기재.
- **Type consistency:** `youtubeId(raw)`(T1 export) ↔ popup.js import/사용(T2) 일치. `saveArticle` 반환 `{ok,article?,message}` ↔ popup `result.ok`/`result.article?.id`/`result.message` 일치. options의 id(`baseUrl`/`save`/`saved`)는 기존 `options.js`와 동일 유지. CSS는 인라인 → 새 파일 없음 → zip allowlist(`scripts/zip.sh`) 불변.
