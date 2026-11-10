# 참여자 신원 (`participant-identity`, 사이트 공용)

## 2026-11-10 — 이름 등록 + 기기 토큰으로 로그인 없이 참여자 기억

### 요청 프롬프트

> 마니또만이 아니라 저 웹 사이트를 접속할 때 참여자의 이름을 등록하여 사이트 전체에서 사용할 수 있도록 하고 토큰을 저장하여 웹사이트를 재접속해도 로그인 없이도 참여자의 상태를 기억할 수 있게 바꿔

(배경) 직전 질문: "화면이 꺼지거나 다른 앱으로 넘어가거나 다시 재접속해도 이전 상태를 기억할 수 있는 거지? 꼭 같은 사람이 같은 정보를 읽어야만 해" → 기기에 이름을 고정하는 방식을 제안했고, 이를 사이트 전체로 확장해 달라는 요청.

### 구현 결정

- **명단을 사이트 공용으로 승격**: `games/manito-mission/data/members.json` → `lib/members/members.json`. 모든 게임이 `@/lib/members`의 명단과 헬퍼(`listMemberNames`, `validateMembers`)를 쓴다. 사회자 비밀번호 기본값도 여기 있고, 운영에서는 `HOST_PIN` 환경 변수로 덮어쓴다(기존 `MANITO_HOST_PIN`은 폐기).
- **등록 = 이름 + 기기 토큰**: `/join`에서 이름을 고르면 `crypto.randomUUID()` 토큰을 만들어 localStorage(`yos-game:participant`)에 저장하고, 서버 Redis 해시(`yos-game:participants`)에 이름 → 토큰을 기록한다. `HSETNX`로 기록해 두 기기가 동시에 눌러도 한 기기만 성공한다.
- **"같은 사람만 같은 정보"**: 게임 API 는 `x-participant-token` 헤더로 이름을 확정하고 본인 배정만 내려 준다. 이름을 URL 이나 본문으로 보내는 경로(`?name=`)는 없앴다. 다른 기기는 이미 등록된 이름을 고를 수 없다(409).
- **해제 경로**: 등록한 기기 스스로는 다른 이름으로 바꿀 수 있고(자기 토큰으로 DELETE), 휴대폰 교체·데이터 삭제 때는 사회자가 마니또 사회자 화면의 "기기 초기화"로 푼다. 해제된 기기는 다음 폴링에서 `me: null`을 받아 안내 화면을 보고 다시 등록한다.
- **상단 신원 띠**: 루트 레이아웃에 `ParticipantBar`를 두어 모든 페이지에서 "OOO님으로 참여 중 · 변경" 또는 "참여자 등록하기"를 보여 준다. `/join` 자체에서는 숨긴다.
- **공용 훅 승격**: 게임 폴더의 sessionStorage 스토어와 새 localStorage 스토어가 같은 패턴이라 `lib/hooks/useStoredValue.ts`(`createStorageStore`, `useStoredValue`)로 뽑았다. Redis 클라이언트와 사회자 비밀번호 확인도 `lib/server/`로 올려 두 저장소가 공유한다.
- **Next.js 16 상태 보존 대응**: cacheComponents 환경에서는 방문했던 페이지가 `<Activity>`로 숨겨졌다가 복원되어 React 상태가 살아난다. `/join`의 "등록 중..." 상태가 복원되어 버튼이 모두 비활성인 채 돌아오는 문제가 있어, 등록 성공 직후 진행 중 표시를 해제하도록 했다(`docs/01-app/02-guides/preserving-ui-state.md` 참고).
- **사회자 화면 진입 시 즉시 재조회**: 등록·확인 상태가 폴링 주기(10초)만큼 늦게 보이지 않도록 사회자 화면을 열 때 한 번 더 읽는다.
- **폴링 주기 조정(동시 요청)**: 평소 10초, 공개 단계 5초. 20명 × 5시간 기준 Redis 명령 약 7만 개로 무료 한도(월 50만)의 14% 수준.
- **범위 밖**: 비밀번호 같은 추가 인증, 방 코드(여러 모임), QR 코드, 참여자 자기 해제 이외의 관리 UI.

### 변경 파일

- `lib/members/members.json`, `lib/members/index.ts` — 사이트 공용 명단
- `lib/hooks/useStoredValue.ts` — 브라우저 저장소 훅
- `lib/server/redis.ts`, `lib/server/hostPin.ts` — 서버 공용(Redis, 비밀번호 확인)
- `lib/participants/shared.ts`, `client.ts`, `server/store.ts`, `server/handlers.ts` — 신원 타입·훅·API 호출·저장소·핸들러
- `app/api/participants/route.ts`, `app/join/page.tsx`, `app/layout.tsx`
- `components/participant/ParticipantBar.tsx`, `JoinScreen.tsx`
- `games/manito-mission/*` — 신원 기반으로 전환 (세부는 `docs/prompts/manito-mission.md`)
- `e2e/join.spec.ts` (신규), `e2e/manito-mission.spec.ts`
- `AGENTS.md`(규칙 3·11), `docs/ARCHITECTURE.md`("참여자 신원" 절), `docs/TESTING.md`, `docs/ADDING_A_GAME.md`, `.env.example`

### 검증

- `pnpm verify` 통과 (E2E 16개: 등록 3, 마니또 8, 홈 3, 번호 뽑기 2)
- 등록 → 새로고침/다른 페이지 이동 후 유지, 다른 기기의 중복 등록 차단, 사회자 해제 후 재등록, 이름 변경 시 이전 이름 해제를 E2E 로 확인
- 1920×1080 노트북 + 390×844 휴대폰 스크린샷으로 `/join`과 참여자 화면 확인
