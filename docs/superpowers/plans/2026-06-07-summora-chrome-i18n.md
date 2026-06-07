# Summora Chrome 확장 다국어(i18n) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome 확장의 모든 사용자 노출 문자열을 한국어/영어로 다국어화하고, 브라우저 UI 언어에 따라 자동 표시되게 한다.

**Architecture:** Chrome 표준 `chrome.i18n` + `_locales/{en,ko}/messages.json` 사용. `default_locale: en`. `src/api.js`는 에러 코드만 반환하고 UI 레이어(`popup.js`)가 번역한다. HTML 정적 텍스트는 `data-i18n` 속성 + 부트스트랩(`src/i18n.js`)으로 주입한다.

**Tech Stack:** Manifest V3, 순수 ESM JS (빌드 없음), vitest, `chrome.i18n` API.

---

## File Structure

- Create: `_locales/en/messages.json` — 영어 메시지 카탈로그 (폴백)
- Create: `_locales/ko/messages.json` — 한국어 메시지 카탈로그
- Create: `src/i18n.js` — `t()`, `applyI18n()` 헬퍼
- Create: `src/i18n.test.js` — en/ko 키 집합 일치 검증
- Modify: `manifest.json` — `default_locale`, `__MSG_` 참조, 버전 `1.1.0`
- Modify: `src/api.js` — 에러 코드 반환 (문자열 제거)
- Modify: `src/api.test.js` — 코드 기준 검증
- Modify: `popup.html` / `popup.js` — i18n 적용
- Modify: `options.html` / `options.js` — i18n 적용
- Modify: `scripts/zip.sh` — `_locales/`, `src/i18n.js` 포함
- Modify: `package.json` — 버전 `1.1.0`
- Modify: `README.md` — 영문으로 교체

브랜치는 이미 `feature/chrome-i18n`에 있다. 모든 명령은 `summora.chrome/` 안에서 실행한다.

---

### Task 1: 로케일 메시지 카탈로그 생성

**Files:**
- Create: `_locales/en/messages.json`
- Create: `_locales/ko/messages.json`

- [ ] **Step 1: 영어 메시지 파일 작성**

Create `_locales/en/messages.json`:

```json
{
  "extName": { "message": "Summora" },
  "extDescription": { "message": "Save the current tab to Summora." },
  "actionTitle": { "message": "Save to Summora" },
  "saveButton": { "message": "Save" },
  "saving": { "message": "Saving…" },
  "saved": { "message": "Saved" },
  "openInWebApp": { "message": "Open in web app →" },
  "badgeYouTube": { "message": "YouTube" },
  "badgeLink": { "message": "Link" },
  "notSavable": { "message": "This page can't be saved." },
  "optionsTitle": { "message": "Summora Settings" },
  "apiUrlLabel": { "message": "API address" },
  "optionsSaved": { "message": "Saved ✓" },
  "errNetwork": { "message": "Network error: can't reach the backend." },
  "errHttp": {
    "message": "Save failed (HTTP $status$)",
    "placeholders": { "status": { "content": "$1" } }
  }
}
```

- [ ] **Step 2: 한국어 메시지 파일 작성**

Create `_locales/ko/messages.json`:

```json
{
  "extName": { "message": "Summora" },
  "extDescription": { "message": "현재 탭을 Summora에 저장합니다." },
  "actionTitle": { "message": "Summora에 저장" },
  "saveButton": { "message": "저장" },
  "saving": { "message": "저장 중…" },
  "saved": { "message": "저장했어요" },
  "openInWebApp": { "message": "웹앱에서 보기 →" },
  "badgeYouTube": { "message": "YouTube" },
  "badgeLink": { "message": "링크" },
  "notSavable": { "message": "이 페이지는 저장할 수 없습니다." },
  "optionsTitle": { "message": "Summora 설정" },
  "apiUrlLabel": { "message": "API 주소" },
  "optionsSaved": { "message": "저장됨 ✓" },
  "errNetwork": { "message": "네트워크 오류: 백엔드에 연결할 수 없습니다." },
  "errHttp": {
    "message": "저장 실패 (HTTP $status$)",
    "placeholders": { "status": { "content": "$1" } }
  }
}
```

- [ ] **Step 3: UTF-8 인코딩 확인**

Run: `file -I _locales/ko/messages.json`
Expected: `charset=utf-8`

- [ ] **Step 4: 커밋**

```bash
git add _locales
git commit -m "feat: en/ko 로케일 메시지 카탈로그 추가"
```

---

### Task 2: 로케일 키 일치 검증 테스트

번역 누락을 막기 위해 en/ko의 키 집합이 동일한지 검증한다. JSON 파싱만 하므로 `chrome` 스텁이 필요 없다.

**Files:**
- Test: `src/i18n.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/i18n.test.js`:

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function load(lang) {
  const path = fileURLToPath(new URL(`../_locales/${lang}/messages.json`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("locale catalogs", () => {
  it("en 과 ko 의 키 집합이 동일하다", () => {
    const en = Object.keys(load("en")).sort();
    const ko = Object.keys(load("ko")).sort();
    expect(ko).toEqual(en);
  });

  it("모든 메시지에 message 필드가 있다", () => {
    for (const lang of ["en", "ko"]) {
      const cat = load(lang);
      for (const [key, val] of Object.entries(cat)) {
        expect(val.message, `${lang}/${key}`).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `node_modules/.bin/vitest run src/i18n.test.js`
Expected: PASS (Task 1에서 양쪽 카탈로그를 동일 키로 작성했으므로 통과)

- [ ] **Step 3: 커밋**

```bash
git add src/i18n.test.js
git commit -m "test: 로케일 키 집합 일치 검증 추가"
```

---

### Task 3: i18n 헬퍼 모듈

**Files:**
- Create: `src/i18n.js`

- [ ] **Step 1: 헬퍼 작성**

Create `src/i18n.js`:

```js
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
```

- [ ] **Step 2: 커밋**

```bash
git add src/i18n.js
git commit -m "feat: chrome.i18n 헬퍼(t, applyI18n) 추가"
```

> 참고: `applyI18n`/`t`는 `chrome.i18n`(브라우저 전용)에 의존하므로 node 단위 테스트 대상이 아니다. 동작 검증은 Task 9의 수동 로드 단계에서 한다.

---

### Task 4: api.js 에러 코드 반환 (TDD)

`src/api.js`가 문자열 대신 구조화된 에러 코드를 반환하도록 바꾼다. 먼저 테스트를 코드 기준으로 수정한다.

**Files:**
- Modify: `src/api.test.js`
- Modify: `src/api.js`

- [ ] **Step 1: 테스트를 코드 기준으로 수정**

In `src/api.test.js`, "비-2xx 이면 error + 서버 메시지" 테스트를 다음으로 교체:

```js
  it("비-2xx 이면 code:http + serverMessage 통과", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ message: "지원하지 않는 URL" }),
      }))
    );
    const r = await saveArticle("https://api.test", "ftp://x");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("error");
    expect(r.code).toBe("http");
    expect(r.httpStatus).toBe(400);
    expect(r.serverMessage).toBe("지원하지 않는 URL");
  });
```

"fetch 예외면 네트워크 오류 메시지" 테스트를 다음으로 교체:

```js
  it("fetch 예외면 code:network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      })
    );
    const r = await saveArticle("https://api.test", "https://x");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("error");
    expect(r.code).toBe("network");
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node_modules/.bin/vitest run src/api.test.js`
Expected: FAIL — `r.code`가 `undefined` (아직 api.js 미수정)

- [ ] **Step 3: api.js 의 saveArticle 에러 분기 수정**

In `src/api.js`, `saveArticle`의 `if (!res.ok)` 블록과 `catch` 블록을 다음으로 교체:

```js
    if (!res.ok) {
      let serverMessage;
      try {
        const body = await res.json();
        serverMessage = body?.message || body?.error || undefined;
      } catch {
        // 본문 파싱 실패 시 serverMessage 없음
      }
      return { ok: false, status: "error", code: "http", httpStatus: res.status, serverMessage };
    }
    const article = await res.json();
    return { ok: true, status: "saved", article };
  } catch {
    return { ok: false, status: "error", code: "network" };
  }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node_modules/.bin/vitest run src/api.test.js`
Expected: PASS (3개 describe 블록 전부 통과)

- [ ] **Step 5: 커밋**

```bash
git add src/api.js src/api.test.js
git commit -m "refactor: api.js 가 에러 메시지 대신 코드 반환"
```

---

### Task 5: manifest.json 다국어화 + 버전 범프

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: manifest 수정**

In `manifest.json`:
- `"name": "Summora"` → `"name": "__MSG_extName__"`
- `"version": "1.0.2"` → `"version": "1.1.0"`
- `"description": "현재 탭을 Summora에 저장합니다."` → `"description": "__MSG_extDescription__"`
- `"default_title": "Summora에 저장"` → `"default_title": "__MSG_actionTitle__"`
- 최상위에 `"default_locale": "en"` 추가 (예: `"version"` 줄 다음)

결과 상단부 예시:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "version": "1.1.0",
  "default_locale": "en",
  "description": "__MSG_extDescription__",
  "permissions": ["activeTab", "storage"],
```

그리고 `action` 안:

```json
  "action": {
    "default_popup": "popup.html",
    "default_title": "__MSG_actionTitle__",
```

- [ ] **Step 2: JSON 유효성 확인**

Run: `node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: 커밋**

```bash
git add manifest.json
git commit -m "feat: manifest 다국어화(__MSG_, default_locale) + v1.1.0"
```

---

### Task 6: popup 다국어화

**Files:**
- Modify: `popup.html`
- Modify: `popup.js`

- [ ] **Step 1: popup.html 헤더 텍스트에 data-i18n 부여**

In `popup.html`, `<html lang="ko">` → `<html lang="en">`,
헤더의 이름 span 을 다음으로 교체:

```html
    <div class="head"><img src="icons/icon-48.png" alt="" /><span class="name" data-i18n="extName">Summora</span></div>
```

- [ ] **Step 2: popup.js import 에 i18n 추가**

In `src/`... 아니라 `popup.js` 최상단 import 블록을 다음으로 교체:

```js
import { normalizeUrl, isSavableUrl, youtubeId } from "./src/url.js";
import { getBaseUrl, saveArticle } from "./src/api.js";
import { t, applyI18n } from "./src/i18n.js";
```

- [ ] **Step 3: 동적 문자열을 t() 로 교체**

In `popup.js`:

`renderCard` 의 badge 텍스트 줄:
```js
  badge.textContent = id ? `▶ ${t("badgeYouTube")}` : `🔗 ${t("badgeLink")}`;
```

`renderSaveButton` 의 버튼 텍스트:
```js
  btn.textContent = t("saveButton");
```

`init` 의 저장 불가 안내:
```js
    note.textContent = t("notSavable");
```

`save` 의 "저장 중…" 텍스트:
```js
  btn.appendChild(document.createTextNode(t("saving")));
```

`save` 의 성공 문구:
```js
    confirm.appendChild(document.createTextNode(t("saved")));
```

`save` 의 "웹앱에서 보기" 링크 텍스트:
```js
      a.textContent = t("openInWebApp");
```

- [ ] **Step 4: save 의 에러 분기를 코드 기반으로 교체**

In `popup.js`, `save` 의 `else` 블록(에러 처리)을 다음으로 교체:

```js
  } else {
    renderSaveButton(() => save(url));
    const err = document.createElement("div");
    err.className = "err";
    let msg;
    if (result.serverMessage) msg = result.serverMessage;
    else if (result.code === "network") msg = t("errNetwork");
    else msg = t("errHttp", [String(result.httpStatus)]);
    err.textContent = `⚠ ${msg}`;
    actionEl.appendChild(err);
  }
```

- [ ] **Step 5: 초기화 시 applyI18n 호출**

In `popup.js`, 맨 아래 `init();` 를 다음으로 교체:

```js
applyI18n();
init();
```

- [ ] **Step 6: 단위 테스트 회귀 확인**

Run: `node_modules/.bin/vitest run`
Expected: PASS (url/api/i18n 테스트 — popup.js 는 테스트 대상 아님, 회귀만 확인)

- [ ] **Step 7: 커밋**

```bash
git add popup.html popup.js
git commit -m "feat: popup 다국어화(chrome.i18n)"
```

---

### Task 7: options 다국어화

**Files:**
- Modify: `options.html`
- Modify: `options.js`

- [ ] **Step 1: options.html 에 data-i18n 부여**

In `options.html`:
- `<html lang="ko">` → `<html lang="en">`
- 헤더 이름 span:
  ```html
      <div class="head"><img src="icons/icon-48.png" alt="" /><span class="name" data-i18n="optionsTitle">Summora Settings</span></div>
  ```
- 라벨:
  ```html
      <label for="baseUrl" data-i18n="apiUrlLabel">API address</label>
  ```
- 저장 버튼:
  ```html
        <button id="save" data-i18n="saveButton">Save</button>
  ```
- 저장됨 표시:
  ```html
        <span class="saved" id="saved" data-i18n="optionsSaved" hidden>Saved ✓</span>
  ```

- [ ] **Step 2: options.js 에 applyI18n 적용**

In `options.js`, import 줄을 다음으로 교체:

```js
import { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } from "./src/api.js";
import { applyI18n } from "./src/i18n.js";
```

맨 아래 `init();` 를 다음으로 교체:

```js
applyI18n();
init();
```

- [ ] **Step 3: 커밋**

```bash
git add options.html options.js
git commit -m "feat: options 다국어화(chrome.i18n)"
```

---

### Task 8: 패키징 & package.json 버전

`zip.sh`가 런타임 파일을 명시 나열하므로 `_locales/`와 `src/i18n.js`를 추가해야 한다.

**Files:**
- Modify: `scripts/zip.sh`
- Modify: `package.json`

- [ ] **Step 1: zip.sh 에 _locales, src/i18n.js 추가**

In `scripts/zip.sh`, `zip -r` 명령의 파일 목록을 다음으로 교체:

```bash
zip -r "$ZIP_FILE" \
  manifest.json \
  popup.html popup.js \
  options.html options.js \
  src/url.js src/api.js src/i18n.js \
  _locales \
  icons \
  -x '*.DS_Store' >&2
```

- [ ] **Step 2: package.json 버전 범프**

In `package.json`, `"version": "1.0.2"` → `"version": "1.1.0"`

- [ ] **Step 3: zip 생성 검증**

Run: `make zip && unzip -l dist/summora-chrome-v1.1.0.zip`
Expected: 목록에 `_locales/en/messages.json`, `_locales/ko/messages.json`, `src/i18n.js`, `manifest.json` 포함

- [ ] **Step 4: 커밋**

```bash
git add scripts/zip.sh package.json
git commit -m "build: zip 에 _locales/i18n 포함, package v1.1.0"
```

---

### Task 9: 수동 로드 검증 (Chrome)

자동 테스트가 닿지 않는 `chrome.i18n` 런타임 동작을 확인한다.

**Files:** 없음 (수동 검증)

- [ ] **Step 1: 확장 로드**

`chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램을 로드" → `summora.chrome/` 폴더 선택. 로드 에러가 없어야 한다(특히 `default_locale` 누락 시 거부됨).

- [ ] **Step 2: 한국어 브라우저에서 확인**

브라우저 UI 언어가 한국어인 상태에서 팝업/옵션을 열어 `저장`, `저장 중…`, `이 페이지는 저장할 수 없습니다.`, `Summora 설정`, `API 주소` 등이 한국어로 보이는지 확인.

- [ ] **Step 3: 영어 폴백 확인**

`chrome://settings/languages`에서 UI 언어를 영어로 바꾸고 확장 재로드 → 팝업/옵션이 `Save`, `Saving…`, `Summora Settings`, `API address` 등 영어로 보이는지 확인.

- [ ] **Step 4: 에러 메시지 확인**

옵션에서 base URL을 잘못된 주소(예: `http://localhost:9`)로 바꾼 뒤 저장 시도 → 네트워크 오류 메시지가 현재 언어로 표시되는지 확인.

---

### Task 10: README 영문화

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README 를 영문으로 교체**

Replace `README.md` 전체 내용:

```markdown
# Summora Chrome Extension

A Manifest V3 Chrome extension that saves the URL of the tab you're viewing to [Summora](https://github.com/kenshin579/summora) with one click.

## Features

- Click the toolbar icon to see the current tab's title and URL, then hit **Save** to register it with the Summora backend (`POST /api/articles`).
- URLs are normalized before saving — tracking params (`utm_*`, `si`, `fbclid`, `gclid`) are stripped, and YouTube links (`youtu.be`, `/shorts`, `/embed`, `music`/`m.youtube`) are converted to canonical `watch?v=` URLs.
- Non-`http`/`https` pages (e.g. `chrome://`) disable the save button.
- On success, an **Open in web app** link is shown.
- The backend base URL can be changed on the options page (stored in `chrome.storage.sync`).
- UI is localized (English / Korean) via Chrome's `chrome.i18n`, following the browser's UI language. English is the fallback (`default_locale`).

## Layout

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest (`activeTab`, `storage`, `default_locale: en`) |
| `popup.html` / `popup.js` | Popup UI · save action |
| `options.html` / `options.js` | Backend base URL settings |
| `src/url.js` | URL normalization / savable check |
| `src/api.js` | base URL load/save, `saveArticle` fetch (returns error codes) |
| `src/i18n.js` | `chrome.i18n` helpers (`t`, `applyI18n`) |
| `_locales/` | `en` / `ko` message catalogs |
| `icons/` | 16 / 48 / 128 icons |

The default backend is `https://summora.advenoh.pe.kr`; for local development, switch it to `http://localhost:8080` on the options page.

## Install (developer mode)

1. Open `chrome://extensions` → enable **Developer mode** (top right)
2. Click **Load unpacked** → select this repository folder
3. Use the Summora toolbar icon to save the current tab

> To save to a local backend, start the server with `make up` in the [`summora`](https://github.com/kenshin579/summora) repo, then set the base URL to `http://localhost:8080` in the extension options.

## Testing

```bash
npm install
npm test     # vitest (src/url.test.js, src/api.test.js, src/i18n.test.js)
```

## Related

- [`summora`](https://github.com/kenshin579/summora) — backend API + web app (summaries, tags, highlights)
```

- [ ] **Step 2: 인코딩 확인 및 커밋**

```bash
file -I README.md   # charset=utf-8 확인
git add README.md
git commit -m "docs: README 영문화 + i18n 내용 반영"
```

---

## Self-Review

- **Spec coverage:** 메시지 카탈로그(Task 1), 키 일치 검증(Task 2), i18n 헬퍼(Task 3), api.js 코드화(Task 4), manifest(Task 5), popup(Task 6), options(Task 7), 패키징·버전(Task 8), 수동 검증(Task 9), README 영문화(Task 10) — 스펙 전 항목 커버.
- **Placeholder scan:** 모든 코드 단계에 실제 코드 포함. TBD/TODO 없음.
- **Type consistency:** `api.js` 반환 형태(`code`, `httpStatus`, `serverMessage`)가 Task 4 정의와 Task 6 소비처에서 일치. 헬퍼 `t`/`applyI18n` 시그니처가 Task 3 정의와 Task 6·7 사용처에서 일치. 메시지 키가 카탈로그(Task 1)와 사용처에서 일치.
```
