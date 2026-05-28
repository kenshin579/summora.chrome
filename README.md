# Summora Chrome 확장

현재 보고 있는 탭의 URL을 클릭 한 번으로 [Summora](https://github.com/kenshin579/summora)에 저장하는 Chrome 확장 프로그램입니다 (Manifest V3).

## 기능

- 툴바 아이콘을 누르면 현재 탭의 제목과 URL을 보여주고, **저장** 버튼으로 Summora 백엔드(`POST /api/articles`)에 등록합니다.
- 저장 전 URL을 정규화합니다 — 추적 파라미터(`utm_*`, `si`, `fbclid`, `gclid`) 제거, YouTube 링크(`youtu.be`, `/shorts`, `/embed`, `music`/`m.youtube`)는 표준 `watch?v=` URL로 변환.
- `http`/`https`가 아닌 페이지(예: `chrome://`)는 저장 버튼이 비활성화됩니다.
- 저장에 성공하면 **웹앱에서 보기** 링크를 함께 표시합니다.
- 옵션 페이지에서 백엔드 base URL을 변경할 수 있습니다 (`chrome.storage.sync`에 저장).

## 구성

| 파일 | 역할 |
|------|------|
| `manifest.json` | MV3 매니페스트 (`activeTab`, `storage` 권한) |
| `popup.html` / `popup.js` | 팝업 UI · 저장 동작 |
| `options.html` / `options.js` | 백엔드 base URL 설정 |
| `src/url.js` | URL 정규화 / 저장 가능 여부 판정 |
| `src/api.js` | base URL 저장·조회, `saveArticle` fetch |
| `icons/` | 16 / 48 / 128 아이콘 |

기본 백엔드 주소는 `https://summora.advenoh.pe.kr`이며, 로컬 개발 시 옵션 페이지에서 `http://localhost:8080`으로 바꿔 사용합니다.

## 설치 (개발자 모드)

1. `chrome://extensions` 접속 → 우측 상단 **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드** 클릭 → 이 저장소 폴더 선택
3. 툴바의 Summora 아이콘으로 현재 탭 저장

> 로컬 백엔드에 저장하려면 [`summora`](https://github.com/kenshin579/summora) 저장소에서 `make up`으로 서버를 띄운 뒤, 확장 옵션에서 base URL을 `http://localhost:8080`으로 설정하세요.

## 테스트

```bash
npm install
npm test     # vitest (src/url.test.js, src/api.test.js)
```

## 관련 저장소

- [`summora`](https://github.com/kenshin579/summora) — 백엔드 API + 웹앱 (요약·태그·하이라이트)
