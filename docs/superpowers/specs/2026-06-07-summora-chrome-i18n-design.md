# Summora Chrome 확장 다국어(i18n) 설계

- 날짜: 2026-06-07
- 대상: `summora.chrome` (Manifest V3, 빌드 없는 순수 JS)
- 목표: 확장의 모든 사용자 노출 문자열을 한국어/영어로 다국어화한다.

## 배경

현재 확장은 모든 UI 문자열이 한국어로 하드코딩되어 있고 `_locales/` 구조나
`chrome.i18n` 사용처가 없다. Chrome 표준 i18n 메커니즘을 도입해 브라우저 UI
언어에 따라 자동으로 한국어/영어를 표시한다.

## 결정 사항

- **지원 언어**: 한국어(`ko`) + 영어(`en`)
- **`default_locale`**: `en` — 한국어 외 모든 브라우저 언어는 영어로 폴백, 글로벌 노출 고려
- **언어 선택**: Chrome 표준 동작(브라우저 UI 언어 자동 감지)만 사용. 옵션 페이지에
  수동 언어 선택 기능은 두지 않는다(YAGNI).
- **에러 메시지 처리**: `src/api.js`는 문자열 대신 **에러 코드**를 반환하고, UI 레이어
  (`popup.js`)가 `chrome.i18n`으로 번역한다(관심사 분리, 테스트 견고성).
- **README**: 영어로 통일한다(한국어 README 폐기, 영문으로 교체).
- **버전**: 기능 추가이므로 minor 업 — `1.0.2 → 1.1.0` (manifest + package.json).

## 동작 방식 (Chrome i18n)

- `_locales/<lang>/messages.json`에 언어별 메시지를 둔다.
- `manifest.json`은 `__MSG_키__` 치환을 자동 지원(매니페스트·CSS 한정).
- HTML 본문 텍스트는 빌드가 없으므로 JS 부트스트랩이 `chrome.i18n.getMessage`로
  주입한다.
- 브라우저 UI 언어가 `ko`면 한국어, 그 외에는 `default_locale`(en)로 폴백.

## 파일 구조

```
summora.chrome/
├── _locales/
│   ├── en/messages.json      ← 폴백(default_locale)
│   └── ko/messages.json
├── src/i18n.js               ← 신설: t(), applyI18n() 헬퍼
├── manifest.json             ← default_locale 추가, name/desc/title → __MSG_
├── popup.html / popup.js
├── options.html / options.js
├── src/api.js                ← 에러 코드 반환 (문자열 제거)
├── src/api.test.js           ← 코드 기준 검증으로 수정
├── src/i18n.test.js          ← 신설(선택): 로케일 키 집합 일치 검증
└── README.md                 ← 영문으로 교체
```

## 메시지 카탈로그

키는 camelCase. 이모지(`▶ 🔗 ✓ ⚠`)는 메시지에서 분리해 마크업/코드에 그대로 두고
텍스트만 i18n 한다.

| 키 | en | ko |
|----|----|----|
| `extName` | Summora | Summora |
| `extDescription` | Save the current tab to Summora. | 현재 탭을 Summora에 저장합니다. |
| `actionTitle` | Save to Summora | Summora에 저장 |
| `saveButton` | Save | 저장 |
| `saving` | Saving… | 저장 중… |
| `saved` | Saved | 저장했어요 |
| `openInWebApp` | Open in web app → | 웹앱에서 보기 → |
| `badgeYouTube` | YouTube | YouTube |
| `badgeLink` | Link | 링크 |
| `notSavable` | This page can't be saved. | 이 페이지는 저장할 수 없습니다. |
| `optionsTitle` | Summora Settings | Summora 설정 |
| `apiUrlLabel` | API address | API 주소 |
| `optionsSaved` | Saved ✓ | 저장됨 ✓ |
| `errNetwork` | Network error: can't reach the backend. | 네트워크 오류: 백엔드에 연결할 수 없습니다. |
| `errHttp` | Save failed (HTTP $status$) | 저장 실패 (HTTP $status$) |

- `errHttp`는 Chrome i18n placeholder(`$status$`) 사용 → `messages.json`에
  `placeholders` 정의 + `getMessage("errHttp", [String(status)])` 호출.
- `extName`은 양 언어 동일("Summora", 브랜드).

## 컴포넌트 변경

### `src/i18n.js` (신설)

```js
export const t = (key, subs) => chrome.i18n.getMessage(key, subs);

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = t(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });
  document.documentElement.lang = chrome.i18n.getUILanguage();
}
```

### `manifest.json`

- `name` → `__MSG_extName__`, `description` → `__MSG_extDescription__`
- `action.default_title` → `__MSG_actionTitle__`
- `default_locale: "en"` 추가 (없으면 `__MSG_` 사용 시 Chrome이 로드 거부)
- `version` → `1.1.0`

### HTML (`popup.html`, `options.html`)

- 정적 텍스트에 `data-i18n="키"` 속성 부여, 폴백 텍스트는 영어로 유지.
- `<html lang>`은 부트스트랩에서 `getUILanguage()`로 실제 반영.

### `popup.js`

- 정적/동적 문자열을 `t(키)`로 교체. 이모지는 코드에 유지.
- 에러 분기: `serverMessage` 우선 → `code === "network"`면 `t("errNetwork")` →
  그 외 `t("errHttp", [String(httpStatus)])`.
- 초기화 시 `applyI18n()` 호출.

### `options.js`

- 초기화 시 `applyI18n()` 호출. 로직 변경 없음.

### `src/api.js`

```js
// 성공
return { ok: true, status: "saved", article };
// 비-2xx
return { ok: false, status: "error", code: "http",
         httpStatus: res.status, serverMessage }; // body.message/error 있으면, 없으면 undefined
// fetch 예외
return { ok: false, status: "error", code: "network" };
```

문자열을 더 이상 생성하지 않는다. 서버가 내려준 메시지는 `serverMessage`로 통과시킨다.

## 테스트

### `src/api.test.js` (수정)

- 비-2xx: `r.code === "http"`, `r.serverMessage === "지원하지 않는 URL"` 검증
  (기존 `r.message` 문자열 단언 제거).
- fetch 예외: `r.code === "network"` 검증(기존 `toMatch(/네트워크/)` 제거).
- 성공 케이스는 변경 없음.

### `src/i18n.test.js` (신설, 선택)

- `_locales/en/messages.json`과 `ko/messages.json`의 키 집합이 동일한지 검증해
  번역 누락을 방지한다(JSON 파싱만 하므로 chrome 스텁 불필요).

## 패키징

- `scripts/zip.sh`가 `_locales/`를 zip 아티팩트에 포함하는지 확인하고 필요 시 보정.
- `make tag`/Release 흐름은 그대로 사용.

## 스코프 밖 (YAGNI)

- 옵션 페이지의 수동 언어 선택 UI
- 한국어 외 영어 외 추가 언어
- 한국어 README 유지(영문으로 대체)
```
