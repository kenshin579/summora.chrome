# Summora Chrome 확장 — 현재 탭 캡처 설계 (v1)

> 상태: 설계 승인됨 (2026-05-28). 다음 단계: 구현 plan.

## 1. 목표

보고 있는 탭을 웹앱을 열지 않고 한 번에 Summora에 `pending` 글로 담는다. 지금은 웹앱 add 페이지에 URL을 수동으로 붙여넣어야 하는데, 그 흐름을 브라우저 툴바 클릭으로 대체한다.

## 2. 범위

**포함**
- 툴바 아이콘 클릭 → 팝업에서 현재 탭을 `POST /api/articles`로 저장.
- 저장 전 URL 정규화(중복 방지, §5).
- 결과 피드백(저장됨 / 실패) + "웹앱에서 보기" 링크.
- 옵션 페이지로 API 주소 설정(`chrome.storage`).

**제외 (YAGNI)**
- 피드·검색·상세 등 조회(웹앱이 담당), 우클릭 컨텍스트 메뉴, 인증, YouTube 한정, 자동 요약(`k:summora-sync` 스킬 영역), 웹스토어 게시.

## 3. 백엔드 계약 (기존, 불변)

- `POST /api/articles`, body `{ "url": "..." }`, 인증 없음.
- 성공 시 `201 Created` + 생성된(또는 기존) 글의 ListItem JSON(`id`, `url`, `source`, `status`, …).
- 백엔드가 URL 유효성(YouTube/일반 URL)과 중복을 판단한다. 같은 URL(완전 일치)을 다시 보내면 새 행을 만들지 않고 **기존 행을 201로 반환**한다(기존이 `failed`면 재시도로 간주해 새로 생성). 따라서 응답만으로 "신규 생성"과 "기존 반환"을 구분할 수 없다 → v1은 둘 다 "저장됨 ✓"로 표시.

## 4. 아키텍처 / 파일 구조

빌드 없는 **Manifest V3 (바닐라 HTML/CSS/JS)**. 번들러·프레임워크 없음. `chrome://extensions`에서 "압축 해제된 확장 로드"로 레포 루트를 지정해 실행.

- `manifest.json` — MV3. `permissions: ["activeTab", "storage"]`. `host_permissions`은 옵션에서 설정할 수 있는 주소를 커버하도록 운영(`https://summora.advenoh.pe.kr/*`)과 로컬(`http://localhost:8080/*`, `http://127.0.0.1:8080/*`) 포함. `action`(기본 팝업 `popup.html`), `options_page`(`options.html`), `icons` 등록.
- `src/url.js` — 순수 모듈. `normalizeUrl(raw)`:
  - YouTube(`watch?v=`, `youtu.be/`, `/shorts/`)면 영상 ID만 추출해 `https://www.youtube.com/watch?v=ID`로 표준화.
  - 그 외 URL이면 추적 파라미터(`utm_*`, `si`, `fbclid`, `gclid`)만 제거하고 나머지는 보존.
  - 파싱 불가/비-http(s)면 입력을 그대로 반환(백엔드가 거르도록).
- `src/api.js` — 순수 모듈.
  - `getBaseUrl()` / `setBaseUrl(url)` — `chrome.storage.sync` 래퍼, 기본값 `https://summora.advenoh.pe.kr`.
  - `saveArticle(baseUrl, url)` — `fetch(POST {baseUrl}/api/articles, {url})`. 응답을 `{ ok, status: "saved"|"error", article?, message? }`로 정규화(2xx면 `saved` + article, 비-2xx/네트워크 예외면 `error` + 사람이 읽을 메시지).
- `popup.html` / `popup.js` — 열리면 `chrome.tabs.query({active, currentWindow})`로 현재 탭의 title/url 표시 → "Summora에 저장" 버튼 → `normalizeUrl` → `getBaseUrl` → `saveArticle` → 결과 메시지 + 반환 `id`로 `{baseUrl}/articles/{id}` "웹앱에서 보기" 링크. 저장 불가 탭(`chrome://`, `about:`, `edge://`, 빈 탭 등)이면 버튼 비활성 + 안내.
- `options.html` / `options.js` — API 주소 입력/저장(`setBaseUrl`), 저장 확인 메시지, 로드 시 현재값 표시.
- `icons/icon-16.png`, `icon-48.png`, `icon-128.png` — placeholder 아이콘.

## 5. URL 정규화 (중복 방지)

백엔드 중복 판정은 `WHERE url = ?` 문자열 완전 일치다. 브라우징 중인 탭 URL엔 타임스탬프·재생목록·추적 파라미터가 붙어 같은 콘텐츠라도 다른 행이 생길 수 있다. 이를 막기 위해 확장이 보내기 전에 정규화한다.

- `https://www.youtube.com/watch?v=ABC&t=120s&list=...&si=...` → `https://www.youtube.com/watch?v=ABC`
- `https://youtu.be/ABC?si=xxx` → `https://www.youtube.com/watch?v=ABC`
- `https://www.youtube.com/shorts/ABC` → `https://www.youtube.com/watch?v=ABC`
- `https://blog.example.com/post?utm_source=x&id=7` → `https://blog.example.com/post?id=7`

## 6. 데이터 흐름

아이콘 클릭 → 팝업이 활성 탭 url 읽음 → 사용자가 "저장" 클릭 → `normalizeUrl(tab.url)` → `getBaseUrl()` → `POST {url}` → 2xx면 "저장됨 ✓" + 보기 링크, 아니면 "실패 ✗" + 메시지(버튼 재시도 가능).

## 7. 상태 / 에러 처리

- 로딩: 저장 중 버튼 비활성 + "저장 중…" 텍스트.
- 성공: "저장됨 ✓" + `{baseUrl}/articles/{id}` 링크(새 탭).
- 실패(비-2xx 또는 네트워크 예외): "실패 ✗" + 메시지, 버튼 다시 활성화.
- 저장 불가 탭(`chrome://` 등 비-http(s)): 버튼 비활성 + "이 페이지는 저장할 수 없습니다" 안내.

## 8. 테스트

**Vitest (순수 모듈 집중)**
- `src/url.js`: YouTube watch/`youtu.be`/`shorts` → 표준 watch URL, 추적 파라미터 제거, 일반 URL 보존, 파싱 불가/비-http(s) 입력은 그대로 반환.
- `src/api.js`: 2xx 응답 → `{ ok:true, status:"saved", article }` 정규화, 비-2xx → `{ ok:false, status:"error", message }`, fetch 예외 → `error` 정규화, `getBaseUrl` 기본값/저장값 반환(`chrome.storage` mock).
- 팝업/옵션 DOM 동작과 브레이크포인트는 압축 해제 로드 후 수동 확인.

## 9. 검수 기준

- [ ] YouTube 영상에서 아이콘 클릭 → 저장 → 웹앱 피드에 `pending` 카드로 나타난다.
- [ ] 일반 블로그/뉴스 페이지도 동일하게 저장된다.
- [ ] 타임스탬프/추적 파라미터가 붙은 URL을 저장해도 정규화되어 중복 행이 생기지 않는다.
- [ ] 같은 페이지를 다시 저장해도 중복 없이 "저장됨 ✓"가 뜬다.
- [ ] 옵션 페이지에서 API 주소를 `http://localhost:8080`으로 바꾸면 로컬 백엔드로 저장된다.
- [ ] `chrome://` 등 저장 불가 탭에서는 버튼이 비활성화된다.
- [ ] 네트워크 오류 시 "실패 ✗" 메시지가 뜨고 재시도할 수 있다.

## 10. 배포 / 로딩

빌드 없음. `chrome://extensions` → 개발자 모드 켜기 → "압축 해제된 확장 로드" → 레포 루트 선택. 웹스토어 게시는 v1 범위 밖. backend·charts 변경 없음.
