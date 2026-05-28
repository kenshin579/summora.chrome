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
