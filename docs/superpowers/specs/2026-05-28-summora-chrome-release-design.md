# Summora Chrome 확장 — 태그 빌드/릴리스 설계

> 상태: 설계 승인됨 (2026-05-28). 다음 단계: 구현 plan.

## 1. 목표

`inspireme.chrome`의 `make tag patch|minor|major` 릴리스 흐름을 `summora.chrome`에 도입한다. 한 명령으로 버전 범프 → 테스트 → zip 패키징 → 커밋 → 태그 푸시 → GitHub Release(zip 첨부)까지 자동화한다.

## 2. 핵심 차이 (inspireme와 다른 점)

`inspireme.chrome`는 WXT 빌드(`wxt zip` → `.output/*-chrome.zip`, dev 파일 자동 제외)를 쓰지만, `summora.chrome`는 **의도적으로 빌드가 없다**(레포 자체가 확장). 따라서:

- WXT를 도입하지 않는다 (작은 캡처 팝업에 과함 — YAGNI).
- zip을 **직접** 만들되, `src/`에 런타임(`url.js`,`api.js`)과 테스트(`*.test.js`)가 섞여 있으므로 **파일 단위 allowlist**로 런타임만 담는다.
- 버전 SoT가 `package.json`·`manifest.json` 두 곳이라 릴리스 스크립트가 **둘을 동시에** 갱신한다.

## 3. 결정 사항

- **방식**: 무빌드 유지 + allowlist zip.
- **버전 SoT**: `package.json` (inspireme와 일관). 스크립트가 `manifest.json`도 같은 값으로 동기화.
- **테스트 게이트**: 릴리스 전 `vitest run` 통과를 강제 (실패 시 `set -e`로 중단 — inspireme엔 없는 안전장치).
- **커밋 author**: `kenshin579@hotmail.com` (프로젝트 규칙). 릴리스 커밋 메시지 `[release] vX.Y.Z`.
- **첫 릴리스 버전**: 스크립트는 버전 무관 — 현재 `0.1.0`에서 `make tag major`면 `v1.0.0`, `minor`면 `v0.2.0`, `patch`면 `v0.1.1`. 어느 것으로 끊을지는 실제 `make tag` 실행 시 사용자가 선택.

## 4. zip 내용물

zip 루트에 `manifest.json`이 와야 Chrome이 로드한다(서브디렉터리 X).

**포함(런타임)**: `manifest.json`, `popup.html`, `popup.js`, `options.html`, `options.js`, `src/url.js`, `src/api.js`, `icons/`(PNG 3개).

**제외**: `src/*.test.js`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`, `docs/`, `node_modules/`, `.DS_Store`.

## 5. 컴포넌트

### 5.1 `scripts/zip.sh` (신규, 실행권한)
`package.json` 버전을 읽어 `dist/summora-chrome-vX.Y.Z.zip`을 allowlist로 생성. 진행 메시지는 stderr, 생성된 zip 경로는 stdout으로 출력(호출자가 캡처 가능). `release.sh`와 `make zip`이 공유(DRY).

### 5.2 `scripts/release.sh` (신규, 실행권한, `set -e`)
1. 인자(`patch`|`minor`|`major`, 기본 patch)로 `package.json` 버전을 파싱·범프.
2. `node_modules/.bin/vitest run` (테스트 게이트).
3. `package.json`·`manifest.json` 버전을 새 값으로 갱신(`sed -i ''` macOS, `"version": "..."` 한 줄만 — `manifest_version`은 매칭 안 됨).
4. `scripts/zip.sh`로 zip 생성, 경로 캡처.
5. `git add package.json manifest.json` + `[release] vX.Y.Z` 커밋(author `kenshin579@hotmail.com`).
6. `git tag -a vX.Y.Z` + `git push origin HEAD` + 태그 푸시.
7. `gh release create vX.Y.Z <zip> --title vX.Y.Z --generate-notes`.

### 5.3 `Makefile` (신규)
- `make test` → `node_modules/.bin/vitest run`.
- `make zip` → `scripts/zip.sh`.
- `make tag patch|minor|major` → `scripts/release.sh <arg>` (inspireme의 `%: @:` 패턴으로 인자를 타겟 오인 방지).
- `make help` → 사용법.

### 5.4 `.gitignore`
`dist` 추가 (zip 산출물 미커밋).

## 6. 테스트 / 검증

릴리스 전체(`make tag`)는 푸시·GH Release를 일으키므로 구현 중 실행하지 않는다. 대신 검증 가능한 부분:

- `make zip` 실행 → `unzip -l dist/summora-chrome-v0.1.0.zip`로 내용 확인: `manifest.json`이 루트에 있고, 런타임 파일만 포함, `*.test.js`·`docs/`·`package.json` 미포함.
- `release.sh`·`zip.sh`의 버전 파싱/범프 로직은 코드 리뷰로 검증(실제 태그/푸시는 사용자가 릴리스할 때 동작).
- 기존 vitest(18개)는 변경 없음 — 회귀 확인.

## 7. 배포 / 사용

도입 후 사용자가 `summora.chrome`에서 `make tag minor`(또는 major/patch) 실행 → GitHub Release에 zip 첨부됨. 사용자는 zip을 받아 `chrome://extensions` 압축 해제 로드. (웹스토어 게시는 범위 밖.) summora backend·charts 무관.
