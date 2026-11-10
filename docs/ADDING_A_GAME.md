# 새 게임 추가하기

예시 구현: [`games/number-draw/`](../games/number-draw) — 새 게임을 만들 때 이 폴더 구조를 그대로 따른다.

## 체크리스트

- [ ] **1. slug 정하기** — kebab-case 영문 (예: `bible-quiz`). URL은 `/games/<slug>`가 된다.
- [ ] **2. 폴더 생성** — `games/<slug>/`
- [ ] **3. `meta.ts` 작성**

  ```ts
  import type { GameMeta } from "@/games/types";

  export const meta: GameMeta = {
    slug: "bible-quiz",
    title: "성경 퀴즈",
    description: "팀별로 성경 문제를 맞히는 퀴즈 게임",
    players: "2팀 이상",
    durationMinutes: 20,
    emoji: "📖",
  };
  ```

- [ ] **4. `logic.ts` 작성** — 상태 타입과 순수 함수(상태 전이). React/DOM 의존 금지. 무작위/시간은 인자로 주입.
- [ ] **5. `Game.tsx` 작성** — 첫 줄 `"use client"`, `export default function XxxGame()`. props 없이 동작해야 한다.
  - 게임 제목/뒤로가기 헤더는 공통 셸(`app/games/[slug]/page.tsx`)이 그리므로 넣지 않는다.
- [ ] **6. 레지스트리 등록** — `games/registry.ts`

  ```ts
  import BibleQuizGame from "@/games/bible-quiz/Game";
  import { meta as bibleQuizMeta } from "@/games/bible-quiz/meta";

  export const games: GameEntry[] = [
    // ...기존 게임
    { meta: bibleQuizMeta, Component: BibleQuizGame },
  ];
  ```

- [ ] **7. 게임 데이터/에셋** — 문제 목록 등 데이터는 `games/<slug>/data.ts` 또는 `games/<slug>/data/*.json` (예: [`games/manito-mission/data/`](../games/manito-mission/data)), 이미지·사운드는 `public/games/<slug>/`
- [ ] **8. E2E 테스트** — `e2e/<slug>.spec.ts`에 최소 1개의 핵심 플로우 테스트 (시작 → 한 번 진행 → 결과 확인)
- [ ] **9. 검증** — `pnpm verify` 통과
- [ ] **10. 브라우저 확인** — `pnpm dev` 후 1920×1080 전체화면에서 글자 크기·가독성 확인

## 자주 쓰는 패턴

- **팀 점수판 / 타이머 / 키보드 단축키** 가 두 번째 게임에서도 필요해지면 그때 `components/` 또는 `lib/hooks/`로 추출한다. 처음부터 공용으로 만들지 않는다.
- **새로고침 대비 저장**: `localStorage` 키는 `yos-game:<slug>:<key>`.
- **참가자가 누구인지 알아야 하면** `useParticipantIdentity()`(`@/lib/participants/client`)로 등록된 이름을 읽는다. 등록 전 기기는 사이트 공용 `ParticipantGate`가 `/join`으로 보내므로 게임 화면에서는 항상 등록된 신원이 있다고 봐도 된다(읽기 전 `undefined`만 처리). 미리 정한 명단은 없으니 참가자 목록이 필요하면 서버의 `getParticipantStore().readAll()`로 읽는다.
- **사회자만 진행하는 게임이면** `useVerifiedHostPin()`(`@/lib/host/client`)으로 로그인 상태를 읽고, 로그아웃 상태에서는 `HostPinForm`(`@/components/host/HostPinForm`)을 보여 준다. 비밀번호는 `/host`와 공유되어 탭에서 한 번만 입력한다. 예: [`games/kpop-quiz/`](../games/kpop-quiz)
- **참가자 휴대폰까지 같은 상태를 봐야 하면** 서버 상태가 필요하다. [`games/manito-mission/`](../games/manito-mission)의 `server/`·`client.ts`·`app/api/manito-mission/`을 본보기로 삼고, 규칙은 [ARCHITECTURE.md의 "서버 상태"](ARCHITECTURE.md#서버-상태-기기-간-공유가-필요한-게임만)를 따른다. 사용자에게 먼저 확인할 것.
