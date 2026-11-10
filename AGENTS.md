<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# yos-game — 에이전트 작업 가이드

교회 레크레이션 게임 모음 웹앱. **진행자 1명이 노트북을 프로젝터/TV에 연결해 진행**하는 방식이며,
백엔드·DB·로그인 없이 **클라이언트 전용**으로 동작한다. 배포 대상은 Vercel.

## 기술 스택

- Next.js 16 (App Router, `cacheComponents` 활성화) · React 19 · TypeScript (strict)
- Tailwind CSS v4 · ESLint 9 (flat config) · Prettier
- Playwright (E2E) · Husky + lint-staged (pre-commit)
- 패키지 매니저: **pnpm** (npm/yarn 사용 금지)

## 먼저 읽을 문서

| 문서                                           | 내용                                     |
| ---------------------------------------------- | ---------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | 디렉터리 구조, 레이어 규칙, 데이터 흐름  |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md)     | 코드 스타일, 네이밍, UI/접근성 규칙      |
| [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md) | 새 게임 추가 체크리스트 (가장 흔한 작업) |
| [docs/TESTING.md](docs/TESTING.md)             | E2E 테스트 작성/실행 방법                |
| [docs/prompts/](docs/prompts/README.md)        | 기능별 요청 프롬프트 기록                |

## 명령어

```bash
pnpm dev            # 개발 서버 (http://localhost:3000)
pnpm check          # typecheck + lint + format:check  ← 모든 작업 후 필수
pnpm test:e2e       # Playwright E2E (프로덕션 빌드 후 실행)
pnpm verify         # check + test:e2e  ← 작업 완료 선언 전 실행
pnpm format         # Prettier 자동 수정
pnpm lint:fix       # ESLint 자동 수정
```

## 작업 규칙 (반드시 지킬 것)

1. **완료 기준**: 변경 후 `pnpm verify`가 통과해야 작업 완료로 간주한다. 실패를 무시하거나 테스트를 삭제/skip 하지 않는다.
2. **새 게임 = 새 폴더**: 게임 코드는 `games/<slug>/` 안에만 둔다. 다른 게임 폴더를 import 하지 않는다. 공용이 필요하면 `components/` 또는 `lib/`로 승격한다.
3. **레지스트리가 SSOT**: 게임 목록/화면 라우트는 `games/registry.ts`에서만 관리한다. `app/` 아래에 게임별 페이지 폴더를 만들지 않는다(사이트 공통 페이지인 `/join`, `/host`는 예외). 서버 상태가 필요한 게임의 Route Handler만 `app/api/<slug>/`에 두되, 처리 로직은 `games/<slug>/server/`에 둔다.
4. **로직과 UI 분리**: 게임 규칙·상태 전이는 `logic.ts`의 순수 함수로 작성하고, `Game.tsx`는 상태 보관과 렌더링만 담당한다.
5. **백엔드는 최소한으로**: 기기 간 상태 공유가 꼭 필요한 게임만 Route Handler + Upstash Redis(`docs/ARCHITECTURE.md` "서버 상태" 참고)를 쓴다. 한 기기에서만 쓰는 값은 `localStorage`로 충분하다. Server Action, 다른 외부 API·DB·인증을 추가하려면 먼저 사용자에게 확인한다.
6. **의존성 추가는 신중히**: 새 npm 패키지는 꼭 필요할 때만, 이유를 설명하고 추가한다.
7. **Next.js API 사용 전 문서 확인**: `node_modules/next/dist/docs/`의 해당 가이드를 먼저 읽는다 (위 블록 참고).
8. **프로젝터 가독성**: 글자는 크게(본문 `text-xl` 이상), 고대비, 마우스 클릭만으로 조작 가능하게 만든다.
9. **언어**: UI 텍스트·주석·문서·커밋 메시지는 한국어를 기본으로 한다. 식별자(변수/함수명)는 영어.
10. **작업 전 문서 확인**: 기능을 만들거나 고치기 전에 `docs/CONVENTIONS.md`와 `docs/ARCHITECTURE.md`를 읽고, 새 게임이면 `docs/ADDING_A_GAME.md` 체크리스트를 순서대로 따른다. 기존 게임(`games/number-draw/`, `games/manito-mission/`)의 구조·네이밍을 그대로 따르고, 요청이 규칙과 충돌하면 임의로 바꾸지 말고 먼저 사용자에게 알린다.
11. **참여자 신원은 공용 계층 사용**: 참가자는 사이트에 들어오면 먼저 `/join`에서 이름을 직접 입력해 등록하며(미리 정한 명단 없음), 이름이 필요하면 `lib/participants/client`의 `useParticipantIdentity()`를 쓴다. 게임마다 이름 입력·선택 UI를 따로 만들지 않는다.
12. **프롬프트 기록**: 새 기능 또는 기존 기능 수정 작업이 끝나면 `docs/prompts/<slug>.md`에 사용자의 요청 원문·구현 결정·변경 파일·검증 결과를 기록한다. 같은 slug에 대한 추가 요청은 같은 파일에 날짜 순으로 섹션을 덧붙인다. 형식은 [docs/prompts/README.md](docs/prompts/README.md)를 따른다.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
