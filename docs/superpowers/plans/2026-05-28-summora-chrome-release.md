# Summora Chrome 확장 — 태그 빌드/릴리스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `make tag patch|minor|major` 한 명령으로 버전 범프 → 테스트 → allowlist zip → 커밋 → 태그 → GitHub Release(zip 첨부)까지 자동화한다.

**Architecture:** 빌드 없는 바닐라 확장이므로 WXT를 쓰지 않고 zip을 직접 만든다. zip 패키징(`scripts/zip.sh`)을 분리해 `make zip`과 `scripts/release.sh`가 공유(DRY). 버전 SoT는 `package.json`이고 릴리스 스크립트가 `manifest.json`도 동기화.

**Tech Stack:** bash, `zip` CLI(/usr/bin/zip), `gh` CLI, node(버전 읽기), vitest(테스트 게이트). macOS(`sed -i ''`). 작업 루트: `/Users/frankoh/src/workspace_summora/summora.chrome`. 브랜치: `feat/release-tag`(생성됨). 커밋 author email: `kenshin579@hotmail.com`. shellcheck 미설치.

설계 문서: `docs/superpowers/specs/2026-05-28-summora-chrome-release-design.md`.

## File Structure

- `scripts/zip.sh` (신규, +x) — `package.json` 버전을 읽어 `dist/summora-chrome-vX.Y.Z.zip`을 allowlist로 생성. zip 경로를 stdout, 메시지를 stderr.
- `scripts/release.sh` (신규, +x) — 버전 범프 + 테스트 + 두 파일 동기화 + zip + 커밋 + 태그 + GH Release.
- `Makefile` (신규) — `help`/`test`/`zip`/`tag` 타겟.
- `.gitignore` (수정) — `dist` 추가.

---

### Task 1: zip 패키징 스크립트 (`scripts/zip.sh`) + .gitignore

**Files:**
- Create: `scripts/zip.sh`
- Modify: `.gitignore`

- [ ] **Step 1: `scripts/zip.sh` 작성**

```bash
#!/bin/bash
# package.json 버전을 읽어 런타임 파일만 담은 확장 zip을 dist/ 에 생성한다.
# stdout: 생성된 zip 경로 (호출자가 캡처). stderr: 진행 메시지.
set -e

VERSION="v$(node -p "require('./package.json').version")"
rm -rf dist
mkdir -p dist
ZIP_FILE="dist/summora-chrome-${VERSION}.zip"

# zip 루트에 manifest.json 이 와야 Chrome이 로드한다.
# src/ 는 런타임 파일만 명시(테스트 *.test.js 제외). icons/ 는 PNG만 있어 통째로.
zip -r "$ZIP_FILE" \
  manifest.json \
  popup.html popup.js \
  options.html options.js \
  src/url.js src/api.js \
  icons \
  -x '*.DS_Store' >&2

echo "Created: $ZIP_FILE" >&2
echo "$ZIP_FILE"
```

- [ ] **Step 2: 실행권한 부여** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && chmod +x scripts/zip.sh`

- [ ] **Step 3: `.gitignore` 에 `dist` 추가** — 현재 `.gitignore` 내용은 `node_modules` 한 줄. 다음으로 만든다:

```
node_modules
dist
```

- [ ] **Step 4: zip 생성·내용 검증** — Run:
```
cd /Users/frankoh/src/workspace_summora/summora.chrome && ZIP=$(./scripts/zip.sh) && echo "ZIP=$ZIP" && unzip -l "$ZIP"
```
Expected: `dist/summora-chrome-v0.1.0.zip` 생성. `unzip -l` 목록에 `manifest.json`(루트), `popup.html`, `popup.js`, `options.html`, `options.js`, `src/url.js`, `src/api.js`, `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png` 포함. **`src/url.test.js`·`src/api.test.js`·`package.json`·`docs/` 는 미포함**.

- [ ] **Step 5: 제외 항목 명시 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && unzip -l dist/summora-chrome-v0.1.0.zip | grep -E "test|docs|package" || echo "OK: no test/docs/package files"`
Expected: `OK: no test/docs/package files`.

- [ ] **Step 6: 커밋** — (`dist/` 는 gitignore 되므로 스테이징 안 됨)

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add scripts/zip.sh .gitignore && git -c user.email=kenshin579@hotmail.com commit -m "feat: 런타임 파일 zip 패키징 스크립트 + dist gitignore"
```

---

### Task 2: 릴리스 스크립트 (`scripts/release.sh`)

**Files:**
- Create: `scripts/release.sh`

- [ ] **Step 1: `scripts/release.sh` 작성**

```bash
#!/bin/bash
# 사용법: ./scripts/release.sh [patch|minor|major]
# 버전 범프 → 테스트 → package.json/manifest.json 동기화 → zip → 커밋 → 태그 → GitHub Release.
set -e

VERSION_TYPE=${1:-patch}

# package.json = 버전 source of truth
CURRENT_VERSION=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case $VERSION_TYPE in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

NEW_VERSION_NUM="${MAJOR}.${MINOR}.${PATCH}"
NEW_VERSION="v${NEW_VERSION_NUM}"

echo "Current: v${CURRENT_VERSION}  →  New: ${NEW_VERSION}"

# 1. 테스트 게이트 (실패 시 set -e 로 중단)
echo "Running tests..."
node_modules/.bin/vitest run

# 2. 버전 동기화 — package.json + manifest.json 의 "version": "..." 한 줄만 교체
#    ("manifest_version": 3 은 따옴표 없는 값이라 매칭되지 않음)
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION_NUM}\"/" package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"${NEW_VERSION_NUM}\"/" manifest.json
echo "Bumped package.json + manifest.json to ${NEW_VERSION_NUM}"

# 3. zip 패키징 (경로 캡처)
ZIP_FILE=$(./scripts/zip.sh)

# 4. 버전 변경 커밋
git add package.json manifest.json
git -c user.email=kenshin579@hotmail.com commit -m "[release] ${NEW_VERSION}"

# 5. 태그 생성 및 푸시
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
git push origin HEAD
git push origin "$NEW_VERSION"

# 6. GitHub 릴리스 (zip 첨부)
gh release create "$NEW_VERSION" "$ZIP_FILE" \
  --title "$NEW_VERSION" \
  --generate-notes

echo ""
echo "Released: $NEW_VERSION"
echo "Asset: $ZIP_FILE"
```

- [ ] **Step 2: 실행권한 부여** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && chmod +x scripts/release.sh`

- [ ] **Step 3: 구문 검사** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && bash -n scripts/release.sh && echo "syntax OK"`
Expected: `syntax OK`. (실제 릴리스는 푸시·GH Release를 일으키므로 여기서 실행하지 않는다.)

- [ ] **Step 4: sed 버전 교체 동작 격리 검증** — 실제 파일을 건드리지 않고 sed 규칙만 확인. Run:
```
cd /Users/frankoh/src/workspace_summora/summora.chrome && printf '{\n  "manifest_version": 3,\n  "version": "0.1.0"\n}\n' | sed 's/"version": "[^"]*"/"version": "9.9.9"/'
```
Expected: 출력에서 `"manifest_version": 3` 은 그대로, `"version": "0.1.0"` → `"version": "9.9.9"` 로만 바뀜.

- [ ] **Step 5: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add scripts/release.sh && git -c user.email=kenshin579@hotmail.com commit -m "feat: 버전 범프 + 태그 + GitHub Release 스크립트"
```

---

### Task 3: Makefile

**Files:**
- Create: `Makefile`

- [ ] **Step 1: `Makefile` 작성** (탭 들여쓰기 주의 — 레시피 줄은 반드시 TAB)

```makefile
.PHONY: help test zip tag

help:
	@echo "Summora Chrome Extension 명령어"
	@echo ""
	@echo "  make test                    테스트 실행 (vitest)"
	@echo "  make zip                     런타임 파일 zip 생성 (dist/)"
	@echo "  make tag patch|minor|major   버전 범프 + 태그 + GitHub Release (zip 첨부)"

test:
	@node_modules/.bin/vitest run

zip:
	@./scripts/zip.sh

# 태그 및 릴리스 (인자: patch, minor, major)
tag:
	@./scripts/release.sh $(filter-out $@,$(MAKECMDGOALS))

# 인자를 타겟으로 인식하지 않도록 처리
%:
	@:
```

- [ ] **Step 2: `make help` 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && make help`
Expected: 사용법 3줄 출력, 에러 없음.

- [ ] **Step 3: `make test` 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && make test`
Expected: vitest 18 passed.

- [ ] **Step 4: `make zip` 확인** — Run: `cd /Users/frankoh/src/workspace_summora/summora.chrome && make zip && unzip -l dist/summora-chrome-v0.1.0.zip | grep -c manifest.json`
Expected: zip 생성, `manifest.json` 1개 포함(출력 `1`).

- [ ] **Step 5: 커밋**

```bash
cd /Users/frankoh/src/workspace_summora/summora.chrome && git add Makefile && git -c user.email=kenshin579@hotmail.com commit -m "feat: 릴리스 Makefile (test/zip/tag)"
```

---

## 검증 (수동 — 실제 릴리스 시)

설계 §6. 구현 중에는 `make zip` + `unzip -l` 로 패키징만 검증한다(런타임 파일만, manifest 루트, 테스트/docs 제외). 실제 릴리스는 사용자가 `make tag minor`(또는 major/patch) 실행 시: 버전 범프 커밋 + 태그 푸시 + GitHub Release(zip 첨부)까지 동작.

## 배포 / 사용

도입 후 `summora.chrome`에서 `make tag <bump>` 로 릴리스. 사용자는 GitHub Release의 zip을 받아 `chrome://extensions` 압축 해제 로드. summora backend·charts 무관.

---

## Self-Review 결과

- **Spec coverage:** §3 결정(무빌드/SoT package.json/테스트 게이트/author)→T2(release.sh), §4 zip 내용물→T1(zip.sh allowlist), §5.1 zip.sh→T1, §5.2 release.sh→T2, §5.3 Makefile→T3, §5.4 .gitignore→T1, §6 검증→각 Task 검증 스텝 + 검증 섹션. 누락 없음.
- **Placeholder scan:** TBD/TODO 없음. 모든 스크립트/명령 완전 기재.
- **Type consistency:** `scripts/zip.sh` 가 stdout으로 출력하는 zip 경로를 `release.sh` 가 `ZIP_FILE=$(./scripts/zip.sh)` 로 캡처(stderr 메시지는 분리) — 인터페이스 일치. zip 파일명 패턴 `dist/summora-chrome-vX.Y.Z.zip` 가 zip.sh·release.sh·검증 스텝에서 동일. 버전 SoT `package.json` 을 zip.sh(읽기)·release.sh(범프+sed) 모두 일관 사용.
