#!/bin/bash
# 사용법: ./scripts/release.sh [patch|minor|major]
# 버전 범프 → 테스트 → package.json/manifest.json 동기화 → zip → 커밋 → 태그 → GitHub Release.
set -e

VERSION_TYPE=${1:-patch}

# 작업 트리가 깨끗해야 릴리스 커밋에 다른 변경이 섞이지 않는다.
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree not clean — commit or stash first." >&2
  exit 1
fi

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

# 태그가 이미 있으면 푸시/커밋 전에 중단 (재실행 안전).
if git rev-parse "$NEW_VERSION" >/dev/null 2>&1; then
  echo "Tag $NEW_VERSION already exists." >&2
  exit 1
fi

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
