# yos-game ⛪

교회 레크레이션 게임 모음. 진행자가 노트북을 프로젝터/TV에 연결해 진행하는 **클라이언트 전용** 웹앱입니다.

## 시작하기

```bash
pnpm install
pnpm exec playwright install chromium   # E2E 테스트용 (최초 1회)
pnpm dev                                # http://localhost:3000
# 휴대폰: 같은 Wi-Fi에서 http://<노트북의 로컬 IP>:3000 접속
```

## 스크립트

| 명령            | 설명                                     |
| --------------- | ---------------------------------------- |
| `pnpm dev`      | 개발 서버                                |
| `pnpm build`    | 프로덕션 빌드                            |
| `pnpm check`    | 타입 체크 + ESLint + Prettier 검사       |
| `pnpm test:e2e` | Playwright E2E 테스트                    |
| `pnpm verify`   | `check` + `test:e2e` (작업 완료 전 실행) |
| `pnpm format`   | Prettier 자동 포맷                       |

커밋 시 Husky pre-commit 훅이 lint-staged(ESLint + Prettier)와 타입 체크를 자동 실행합니다.

## 문서

- [AGENTS.md](AGENTS.md) — AI 에이전트/기여자 작업 규칙
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 구조와 설계 원칙
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md) — 코드 컨벤션
- [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md) — 새 게임 추가 방법
- [docs/TESTING.md](docs/TESTING.md) — 테스트 가이드

## 배포

Vercel에 GitHub 저장소를 연결하면 `main` 브랜치 푸시 시 자동 배포됩니다.
