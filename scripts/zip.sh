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
  src/url.js src/api.js src/i18n.js \
  _locales \
  icons \
  -x '*.DS_Store' >&2

echo "Created: $ZIP_FILE" >&2
echo "$ZIP_FILE"
