# Summora Chrome 확장 — 팝업 UI 개선 설계

> 상태: 설계 승인됨 (2026-05-28). 다음 단계: 구현 plan.

## 1. 배경 / 문제

현재 팝업(`popup.html`/`popup.js`)이 허접하게 느껴진다:
- 순백 배경 + 검정 버튼 — 방금 만든 종이/테라코타 브랜드 아이덴티티 미사용.
- 성공 시 큰 버튼이 통째로 회색 비활성으로 죽고, 그 아래 "저장됨 ✓"이 중복 표시(메시지 두 번).
- 로고·썸네일·소스 표시 없이 제목 + 긴 URL만 노출.

## 2. 목표 / 범위

브랜드 정합 + 정보 강화로 팝업을 다듬는다. **저장 로직(normalize/api)은 불변.** 무빌드 바닐라 유지.

**포함**
- 브랜드 테마(종이 배경, 테라코타 버튼, 헤더에 아이콘+워드마크) — `popup.html`, `options.html` 양쪽.
- 콘텐츠 카드: YouTube면 영상 썸네일, 일반 페이지면 파비콘 + 제목(2줄) + 소스 배지 + URL(1줄 말줄임).
- 상태 재설계: 대기 / 로딩 / 성공(버튼을 "웹앱에서 보기 →"로 대체) / 에러 / 저장 불가.
- `src/url.js`에 `youtubeId(raw)` export 추가(썸네일/배지 판별), 테스트 포함.

**제외 (YAGNI)**
- 새 권한, 새 파일(zip allowlist 불변 위해 CSS는 각 HTML에 인라인), 옵션 페이지 기능 변경, 백엔드 변경, 페이지 메타(설명/og) 수집.

## 3. 팔레트 (웹앱 `globals.css`와 동일)

paper `#faf6ee` / paper-2 `#f3ebd9` / ink `#2a221c` / ink-2 `#5d4f44` / ink-3 `#8c7d6f` / line `#d8cdb7` / line-faint `#e8dfcc` / accent `#b54526` / accent-press `#993a20` / 성공 `#2f7d4f`.

## 4. 컴포넌트 / 변경

### 4.1 `src/url.js`
- `youtubeId(raw)` **신규 export** — watch(`v=`)·`youtu.be/`·`/shorts/`·`/embed/`·`m.`/`music.youtube.com`에서 영상 ID 반환, 아니면 `null`. 기존 내부 `youtubeVideoId(u)`를 이 함수로 정리(중복 제거). `normalizeUrl`은 이를 사용하도록 유지(동작 불변).
- `normalizeUrl`, `isSavableUrl` 시그니처/동작 불변.

### 4.2 `popup.html`
- 인라인 CSS에 §3 팔레트(`:root` 변수)와 레이아웃.
- 구조: `head`(로고 `icons/icon-48.png` 26px + "Summora") + `body` 안에 `#card`, `#action`(빈 컨테이너; JS가 채움).

### 4.3 `popup.js`
저장 로직은 그대로. 렌더링만 추가, **XSS 방지 위해 제목/URL은 `textContent`, 이미지 `src`만 설정(innerHTML로 신뢰 불가 문자열 삽입 금지)**.
- `init()`: 활성 탭 조회 → 저장 불가(`!isSavableUrl`)면 헤더 아래 안내문만, 버튼 없음.
- 카드 렌더:
  - `id = youtubeId(url)`. **YouTube**(id 있음): 16:9 `<img class="thumb" src="https://i.ytimg.com/vi/${id}/mqdefault.jpg">`(onerror 시 썸네일 숨김), 그 아래 제목, 메타행 배지 "▶ YouTube" + URL.
  - **일반**: 썸네일 없이 (파비콘 `tab.favIconUrl`이 http(s)/data면 표시) + 제목 한 행, 메타행 배지 "🔗 링크" + URL.
  - 제목은 표시용으로 끝의 " - YouTube" 접미사 제거(있으면). URL은 호스트+경로 위주 표시.
- `#action` 상태:
  - 대기: 테라코타 "저장" 버튼.
  - 로딩: 버튼 비활성 + 스피너 + "저장 중…".
  - 성공: `#action`을 성공 블록으로 **대체** — 초록 체크 + "저장했어요" + (id/응답의 article.id 있으면) 테라코타 "웹앱에서 보기 →" 앵커(`{baseUrl}/articles/{id}`, 새 탭). 회색 죽은 버튼·중복 텍스트 없음.
  - 에러: 버튼 재활성 + 그 아래 "⚠ {message}"(테라코타).

### 4.4 `options.html`
- 동일 종이 테마 + 헤더(아이콘 + "Summora 설정"). 입력/저장 기능·`options.js`(import/로직)는 불변, 마크업/CSS만 정돈.

## 5. 테스트

- `src/url.test.js`: `youtubeId` — watch/`youtu.be`/shorts/embed/music → ID, 일반 URL·비youtube → null. `normalizeUrl`/`isSavableUrl` 기존 케이스 회귀 없음.
- 팝업/옵션 DOM·썸네일/파비콘 로딩은 압축 해제 로드 후 수동 확인.

## 6. 검수 기준

- [ ] YouTube 글: 썸네일·"▶ YouTube" 배지·제목·URL이 나오고 저장 버튼이 테라코타.
- [ ] 일반 링크: 파비콘·"🔗 링크" 배지로 렌더.
- [ ] 저장 성공 시 회색 죽은 버튼/중복 텍스트 없이 "저장했어요" + "웹앱에서 보기 →"만 표시.
- [ ] 에러 시 버튼 재활성 + 메시지, `chrome://` 등은 안내문 + 버튼 없음.
- [ ] 옵션 페이지가 동일 테마.
- [ ] 제목/URL이 마크업으로 들어가도 textContent로만 처리(XSS 없음).
- [ ] `vitest` 회귀 없음(+youtubeId 케이스).

## 7. 배포

`summora.chrome` 변경. 새 파일·권한 없음(zip allowlist 불변). 머지 후 `make tag patch`(v1.0.2)로 릴리스.
