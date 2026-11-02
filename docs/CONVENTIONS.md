# 코드 컨벤션

포맷은 Prettier, 정적 규칙은 ESLint가 강제한다. 여기에는 **도구가 잡아주지 못하는 규칙**만 적는다.

## 파일·네이밍

| 대상             | 규칙                    | 예시                         |
| ---------------- | ----------------------- | ---------------------------- |
| 게임 폴더 / slug | kebab-case              | `games/bible-quiz/`          |
| React 컴포넌트   | PascalCase 파일·이름    | `Game.tsx`, `ScoreBoard.tsx` |
| 그 외 TS 모듈    | camelCase               | `logic.ts`, `useTimer.ts`    |
| 훅               | `use` 접두사            | `useCountdown`               |
| 타입             | PascalCase, `type` 선호 | `type QuizState = {...}`     |
| 상수             | UPPER_SNAKE_CASE        | `DEFAULT_ROUND_SECONDS`      |

## TypeScript

- `any` 금지 — 불가피하면 `unknown` 후 좁히기
- 공용 컴포넌트는 named export, 게임 진입 컴포넌트(`Game.tsx`)만 default export
- Next.js 페이지/레이아웃 props는 전역 헬퍼 타입 `PageProps<"/route">`, `LayoutProps<"/route">` 사용
- `params`는 Promise이므로 `await params`로 꺼낸다

## React

- 컴포넌트는 함수 선언식(`export function Foo()`) 사용
- 파생 가능한 값은 state로 두지 않는다 (렌더 중 계산)
- 무작위(`Math.random`)·시간(`Date.now`) 의존 로직은 인자로 주입 가능하게 작성 → 테스트 용이성
- `useEffect`는 외부 시스템 동기화(타이머, 키보드 이벤트, localStorage)에만 사용

## 스타일 (Tailwind v4)

- 인라인 Tailwind 유틸리티 클래스 사용, 조건부 클래스는 `cn()` (`@/lib/cn`)
- 클래스 정렬은 `prettier-plugin-tailwindcss`가 자동 처리
- 테마 토큰은 `app/globals.css`의 `@theme`에 추가

## UI / 접근성 (프로젝터 환경)

- 본문 최소 `text-xl`, 핵심 정보(점수·타이머·정답)는 `text-6xl` 이상
- 색만으로 정보를 구분하지 않는다 (텍스트/아이콘 병기), 고대비 유지
- 모든 조작은 클릭 가능한 `<button>`/`<a>`로 — div에 onClick 금지
- 진행자 편의를 위해 주요 조작에 키보드 단축키(Space, ←/→ 등)를 추가하는 것을 권장
- E2E에서 쓸 요소는 접근 가능한 이름(role + name) 우선, 불가하면 `data-testid`

## 커밋

- 한국어, 형식: `<type>: <요약>` — type은 `feat` `fix` `refactor` `docs` `test` `chore` `style`
- 예: `feat: 성경 퀴즈 게임 추가`, `fix: 번호 뽑기 중복 버그 수정`
- pre-commit 훅(lint-staged + typecheck)을 `--no-verify`로 우회하지 않는다
