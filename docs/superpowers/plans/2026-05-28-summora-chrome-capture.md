# Summora Chrome 확장 — 현재 탭 캡처 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 툴바 아이콘 클릭 → 팝업으로 현재 탭을 `POST /api/articles`에 보내 Summora `pending` 글로 저장하는 빌드 없는 Manifest V3 확장을 만든다.

**Architecture:** 순수 로직(URL 정규화·API 호출)을 `src/url.js`·`src/api.js` ES 모듈로 분리해 vitest로 테스트하고, `popup`/`options` 페이지는 그 모듈을 import 하는 얇은 글루(수동 확인)로 둔다. 번들러·프레임워크 없음 — `chrome://extensions`에서 압축 해제 로드.

**Tech Stack:** Manifest V3, 바닐라 HTML/CSS/JS(ES modules), vitest(node env). 패키지 매니저는 **npm**(pnpm 미설치). 테스트 실행은 `npx vitest run` 또는 `node_modules/.bin/vitest run`. 작업 루트: `/Users/frankoh/src/workspace_summora/summora.chrome`. 브랜치: `feat/chrome-capture`(생성됨). **커밋 author email: `kenshin579@hotmail.com`** (`git -c user.email=kenshin579@hotmail.com commit ...`).

설계 문서: `docs/superpowers/specs/2026-05-28-summora-chrome-capture-design.md`.

## File Structure

- `package.json` — `"type": "module"`, `test` 스크립트, vitest devDep.
- `.gitignore` — `node_modules`.
- `src/url.js` — `normalizeUrl(raw)`, `isSavableUrl(raw)`. 순수, chrome/fetch 의존 없음.
- `src/url.test.js` — url.js 테스트.
- `src/api.js` — `DEFAULT_BASE_URL`, `getBaseUrl()`, `setBaseUrl(url)`, `saveArticle(baseUrl, url)`. `chrome.storage`·`fetch` 전역 사용.
- `src/api.test.js` — api.js 테스트(chrome·fetch mock).
- `manifest.json` — MV3 매니페스트.
- `icons/icon-16.png`, `icon-48.png`, `icon-128.png` — placeholder 아이콘.
- `popup.html` / `popup.js` — 캡처 UI.
- `options.html` / `options.js` — API 주소 설정 UI.

---

### Task 1: 프로젝트 스캐폴드 + 테스트 하니스

**Files:**
- Create: `package.json`, `.gitignore`, `src/smoke.test.js`

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "summora-chrome",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "현재 탭을 Summora에 저장하는 Chrome 확장",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: `.gitignore` 작성**

```
node_modules
```

- [ ] **Step 3: vitest 설치**

Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && npm install`
Expected: `node_modules/`에 vitest 설치, 경고는 무방.

- [ ] **Step 4: 스모크 테스트 작성** — `src/smoke.test.js`:

```js
import { describe, it, expect } from "vitest";

describe("harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 테스트 실행** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run`
Expected: 1 passed.

- [ ] **Step 6: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add package.json package-lock.json .gitignore src/smoke.test.js && git -c user.email=kenshin579@hotmail.com commit -m "chore: vitest 테스트 하니스 스캐폴드"
```

---

### Task 2: URL 정규화 모듈 (`src/url.js`)

설계 §5. YouTube는 영상 ID만 남겨 표준 watch URL로, 일반 URL은 추적 파라미터만 제거. `isSavableUrl`은 http(s)만 허용.

**Files:**
- Create: `src/url.js`, `src/url.test.js`
- Delete: `src/smoke.test.js` (하니스 검증용이었으므로 제거)

- [ ] **Step 1: 실패 테스트 작성** — `src/url.test.js`:

```js
import { describe, it, expect } from "vitest";
import { normalizeUrl, isSavableUrl } from "./url.js";

describe("normalizeUrl", () => {
  it("youtube watch: v= 만 남기고 t/list/si 제거", () => {
    expect(
      normalizeUrl("https://www.youtube.com/watch?v=ABC123&t=120s&list=PL1&si=xyz")
    ).toBe("https://www.youtube.com/watch?v=ABC123");
  });

  it("youtu.be 단축 URL → 표준 watch", () => {
    expect(normalizeUrl("https://youtu.be/ABC123?si=xyz")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("shorts → 표준 watch", () => {
    expect(normalizeUrl("https://www.youtube.com/shorts/ABC123")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("m.youtube.com watch 도 정규화", () => {
    expect(normalizeUrl("https://m.youtube.com/watch?v=ABC123&feature=share")).toBe(
      "https://www.youtube.com/watch?v=ABC123"
    );
  });

  it("일반 URL: utm_*/fbclid 제거하고 의미 있는 쿼리는 보존", () => {
    expect(
      normalizeUrl("https://blog.example.com/post?utm_source=x&id=7&fbclid=abc")
    ).toBe("https://blog.example.com/post?id=7");
  });

  it("일반 URL: 추적 파라미터 없으면 그대로", () => {
    expect(normalizeUrl("https://blog.example.com/post?id=7")).toBe(
      "https://blog.example.com/post?id=7"
    );
  });

  it("파싱 불가 입력은 그대로 반환", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });

  it("비-http(s) 스킴은 그대로 반환", () => {
    expect(normalizeUrl("chrome://extensions")).toBe("chrome://extensions");
  });
});

describe("isSavableUrl", () => {
  it("http(s)는 true", () => {
    expect(isSavableUrl("https://example.com")).toBe(true);
    expect(isSavableUrl("http://localhost:3000/x")).toBe(true);
  });

  it("chrome://, about:, 빈 문자열, 비-URL은 false", () => {
    expect(isSavableUrl("chrome://extensions")).toBe(false);
    expect(isSavableUrl("about:blank")).toBe(false);
    expect(isSavableUrl("")).toBe(false);
    expect(isSavableUrl("not a url")).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run src/url.test.js`
Expected: FAIL ("Failed to resolve import './url.js'" 또는 함수 미정의).

- [ ] **Step 3: `src/url.js` 구현**

```js
// 제거 대상 추적 파라미터(접두사 utm_ 는 별도 처리)
const TRACKING_PARAMS = new Set(["si", "fbclid", "gclid"]);

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

export function normalizeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return raw;

  const id = youtubeVideoId(u);
  if (id) return `https://www.youtube.com/watch?v=${id}`;

  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith("utm_") || TRACKING_PARAMS.has(key)) {
      u.searchParams.delete(key);
    }
  }
  return u.toString();
}

export function isSavableUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: 통과 확인 + 스모크 제거** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && rm src/smoke.test.js && node_modules/.bin/vitest run`
Expected: url.test.js 전부 PASS, 다른 테스트 없음.

- [ ] **Step 5: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add src/url.js src/url.test.js && git rm --cached src/smoke.test.js 2>/dev/null; git add -A && git -c user.email=kenshin579@hotmail.com commit -m "feat: URL 정규화 + 저장 가능 판별 모듈"
```

---

### Task 3: API 모듈 (`src/api.js`)

설계 §3·§4·§7. baseUrl 저장/조회와 저장 요청 + 응답 정규화.

**Files:**
- Create: `src/api.js`, `src/api.test.js`

- [ ] **Step 1: 실패 테스트 작성** — `src/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_BASE_URL, getBaseUrl, setBaseUrl, saveArticle } from "./api.js";

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("getBaseUrl / setBaseUrl", () => {
  it("저장값이 없으면 기본 운영 주소", async () => {
    vi.stubGlobal("chrome", {
      storage: { sync: { get: vi.fn(async (d) => d) } },
    });
    expect(await getBaseUrl()).toBe(DEFAULT_BASE_URL);
  });

  it("저장값이 있으면 그 값", async () => {
    vi.stubGlobal("chrome", {
      storage: { sync: { get: vi.fn(async () => ({ baseUrl: "http://localhost:8080" })) } },
    });
    expect(await getBaseUrl()).toBe("http://localhost:8080");
  });

  it("setBaseUrl 은 storage.sync.set 호출", async () => {
    const set = vi.fn(async () => {});
    vi.stubGlobal("chrome", { storage: { sync: { set } } });
    await setBaseUrl("http://localhost:8080");
    expect(set).toHaveBeenCalledWith({ baseUrl: "http://localhost:8080" });
  });
});

describe("saveArticle", () => {
  it("2xx 이면 saved + article 정규화", async () => {
    const article = { id: 42, url: "https://x", status: "pending" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 201, json: async () => article }))
    );
    const r = await saveArticle("https://api.test", "https://x");
    expect(r).toEqual({ ok: true, status: "saved", article });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test/api/articles",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("비-2xx 이면 error + 서버 메시지", async () => {
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
    expect(r.message).toBe("지원하지 않는 URL");
  });

  it("fetch 예외면 네트워크 오류 메시지", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      })
    );
    const r = await saveArticle("https://api.test", "https://x");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("error");
    expect(r.message).toMatch(/네트워크/);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run src/api.test.js`
Expected: FAIL (import 해석 실패).

- [ ] **Step 3: `src/api.js` 구현**

```js
export const DEFAULT_BASE_URL = "https://summora.advenoh.pe.kr";

export async function getBaseUrl() {
  const { baseUrl } = await chrome.storage.sync.get({ baseUrl: DEFAULT_BASE_URL });
  return baseUrl || DEFAULT_BASE_URL;
}

export async function setBaseUrl(url) {
  await chrome.storage.sync.set({ baseUrl: url });
}

export async function saveArticle(baseUrl, url) {
  try {
    const res = await fetch(`${baseUrl}/api/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      let message = `저장 실패 (HTTP ${res.status})`;
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
        else if (body?.error) message = body.error;
      } catch {
        // 본문 파싱 실패 시 기본 메시지 유지
      }
      return { ok: false, status: "error", message };
    }
    const article = await res.json();
    return { ok: true, status: "saved", article };
  } catch {
    return {
      ok: false,
      status: "error",
      message: "네트워크 오류: 백엔드에 연결할 수 없습니다.",
    };
  }
}
```

- [ ] **Step 4: 통과 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run`
Expected: url.test.js + api.test.js 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add src/api.js src/api.test.js && git -c user.email=kenshin579@hotmail.com commit -m "feat: Summora API 저장 + baseUrl 설정 모듈"
```

---

### Task 4: 매니페스트 + 아이콘

설계 §4. MV3 매니페스트와 placeholder 아이콘.

**Files:**
- Create: `manifest.json`, `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`

- [ ] **Step 1: placeholder 아이콘 생성** — Run (1x1 PNG를 세 파일로 디코드, Chrome이 스케일):

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && mkdir -p icons && B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" && for f in 16 48 128; do printf '%s' "$B64" | base64 -D > "icons/icon-$f.png"; done && file icons/icon-16.png
```
Expected: `icons/icon-16.png: PNG image data ...` 3개 파일 생성. (macOS `base64 -D`; 실패 시 `--decode`.)

- [ ] **Step 2: `manifest.json` 작성**

```json
{
  "manifest_version": 3,
  "name": "Summora",
  "version": "0.1.0",
  "description": "현재 탭을 Summora에 저장합니다.",
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "https://summora.advenoh.pe.kr/*",
    "http://localhost:8080/*",
    "http://127.0.0.1:8080/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Summora에 저장",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 3: 매니페스트 유효성 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest OK')"`
Expected: `manifest OK`.

- [ ] **Step 4: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add manifest.json icons && git -c user.email=kenshin579@hotmail.com commit -m "feat: MV3 매니페스트 + placeholder 아이콘"
```

---

### Task 5: 팝업 UI (`popup.html` / `popup.js`)

설계 §4·§6·§7. 현재 탭 표시 → 저장 → 결과.

**Files:**
- Create: `popup.html`, `popup.js`

- [ ] **Step 1: `popup.html` 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <style>
      body { width: 320px; margin: 0; padding: 16px; font-family: -apple-system, system-ui, sans-serif; }
      h1 { font-size: 14px; margin: 0 0 8px; }
      .meta { font-size: 12px; color: #666; word-break: break-all; white-space: pre-line; margin-bottom: 12px; }
      button { width: 100%; padding: 10px; font-size: 14px; border: 0; border-radius: 6px; background: #111; color: #fff; cursor: pointer; }
      button:disabled { opacity: 0.5; cursor: default; }
      .result { margin-top: 12px; font-size: 13px; }
      .result a { color: #2563eb; }
    </style>
  </head>
  <body>
    <h1>Summora에 저장</h1>
    <div class="meta" id="meta"></div>
    <button id="save">저장</button>
    <div class="result" id="result"></div>
    <script type="module" src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 2: `popup.js` 작성**

```js
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
```

- [ ] **Step 3: 회귀 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run`
Expected: 기존 테스트 전부 PASS(팝업은 import 경로만 추가, 단위 테스트 없음 — DOM은 수동 확인).

- [ ] **Step 4: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add popup.html popup.js && git -c user.email=kenshin579@hotmail.com commit -m "feat: 캡처 팝업 UI"
```

---

### Task 6: 옵션 페이지 (`options.html` / `options.js`)

설계 §4. API 주소 설정.

**Files:**
- Create: `options.html`, `options.js`

- [ ] **Step 1: `options.html` 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px; }
      h1 { font-size: 18px; }
      label { display: block; font-size: 13px; margin-bottom: 6px; }
      input { width: 100%; padding: 8px; font-size: 14px; box-sizing: border-box; }
      button { margin-top: 12px; padding: 8px 16px; }
      .saved { color: #16a34a; font-size: 13px; margin-left: 8px; }
    </style>
  </head>
  <body>
    <h1>Summora 설정</h1>
    <label for="baseUrl">API 주소</label>
    <input id="baseUrl" type="url" placeholder="https://summora.advenoh.pe.kr" />
    <div>
      <button id="save">저장</button>
      <span class="saved" id="saved" hidden>저장됨 ✓</span>
    </div>
    <script type="module" src="options.js"></script>
  </body>
</html>
```

- [ ] **Step 2: `options.js` 작성**

```js
import { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } from "./src/api.js";

const input = document.getElementById("baseUrl");
const savedEl = document.getElementById("saved");

async function init() {
  input.value = await getBaseUrl();
}

document.getElementById("save").addEventListener("click", async () => {
  const value = (input.value.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  await setBaseUrl(value);
  input.value = value;
  savedEl.hidden = false;
  setTimeout(() => {
    savedEl.hidden = true;
  }, 2000);
});

init();
```

- [ ] **Step 3: 회귀 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && node_modules/.bin/vitest run`
Expected: 기존 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add options.html options.js && git -c user.email=kenshin579@hotmail.com commit -m "feat: API 주소 설정 옵션 페이지"
```

---

## 검증 (수동 — 확장 로드 후)

설계 §9. `chrome://extensions` → 개발자 모드 → "압축 해제된 확장 로드" → 레포 루트 선택.

1. YouTube 영상에서 아이콘 클릭 → "저장" → 웹앱 피드에 `pending` 카드, "웹앱에서 보기" 링크 동작.
2. 일반 블로그/뉴스 페이지도 저장됨.
3. `?t=120s&si=...` 붙은 URL 저장 → 정규화되어 중복 행 미발생(같은 영상 재저장 시 카드 1개).
4. 옵션에서 `http://localhost:8080`으로 바꾸고 `make up` 로컬 백엔드에 저장 확인.
5. `chrome://extensions` 탭에서 팝업 열면 버튼 비활성 + 안내.
6. 백엔드 끈 상태로 저장 → "실패 ✗ 네트워크 오류…" 표시, 다시 활성화.

## 배포 / 로딩

빌드 없음. 압축 해제 로드로 사용. 웹스토어 게시는 v1 범위 밖. summora backend·charts 변경 없음.

---

## Self-Review 결과

- **Spec coverage:** §1 목표→T5/T6, §2 범위(capture only)→전체, §3 백엔드 계약/저장됨 표시→T3(saveArticle)·T5, §4 파일구조→T1~T6 그대로, §5 URL 정규화→T2, §6 데이터 흐름→T5, §7 상태/에러→T3(메시지)·T5(로딩/비활성/재시도), §8 테스트→T2·T3 vitest + 수동, §9 검수→검증 섹션, §10 로딩→배포 섹션. 누락 없음.
- **Placeholder scan:** TBD/TODO 없음. 모든 코드/명령 완전 기재.
- **Type consistency:** `normalizeUrl`/`isSavableUrl`(T2) ↔ popup import(T5) 일치. `getBaseUrl`/`setBaseUrl`/`saveArticle`/`DEFAULT_BASE_URL`(T3) ↔ popup/options import(T5/T6) 일치. `saveArticle` 반환 `{ok,status,article|message}` ↔ popup 사용(`result.ok`/`result.article?.id`/`result.message`) 일치. manifest의 popup.html/options.html/icons 경로 ↔ T4/T5/T6 파일명 일치.
