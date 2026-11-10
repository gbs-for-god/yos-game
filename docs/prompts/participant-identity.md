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

## 2026-11-10 — 기존 명단 제거 + 메인 화면 전에 참가자명 입력

### 요청 프롬프트

> 기존 정보의 참여자는 제거하고, 참여자가 메인 화면에 접속하기 전에 참가자명을 작성하게 해

### 구현 결정

- **명단 삭제**: `lib/members/`(members.json·헬퍼)를 지웠다. 참가자가 직접 입력한 이름이 곧 명단이다. 사회자 비밀번호 기본값은 `lib/server/hostPin.ts`의 `DEFAULT_HOST_PIN`("0000")으로 옮겼고 운영은 `HOST_PIN` 환경 변수로 덮어쓴다.
- **직접 입력 + 검증**: `/join`은 이름 선택 목록 대신 입력창이다. 서버(`registerParticipant`)가 `normalizeName`(앞뒤 공백 제거, 연속 공백 하나로)·`validateName`(비어 있음/12자 초과 거부)으로 검증한다. 이미 쓰는 이름이면 409.
- **등록 전 접근 차단**: 루트 레이아웃에 `ParticipantGate`를 둬, 신원이 없는 기기는 `/`를 포함한 모든 주소에서 `/join?next=<원래 주소>`로 보낸다. 신원이 localStorage 에만 있어 브라우저에서 판단한다. `ParticipantBar`는 등록된 경우에만 표시한다.
- **이름 변경 순서**: 새 이름을 먼저 등록하고 성공하면 이전 이름을 푼다(실패 시 이전 이름 유지). 서버 응답의 `me`는 두 이름이 같은 토큰을 가진 순간 이전 이름을 돌려줄 수 있어 신원 저장에는 입력값을 쓴다.
- **마니또 멤버 = 시작 시점의 등록자 전체**: `createSession(names, hostName, missions)`로 바뀌었다. 시작한 기기의 이름이 공개 순서 맨 마지막(사회자), 나머지는 가나다순. 최소 2명 미만이면 시작 버튼 비활성 + 서버도 400. 시작 뒤 등록·해제가 있으면 사회자 화면에 경고하고, 늦게 등록한 사람은 "이번 배정에 없음" 안내를 받는다. 전체 다시 뽑기로 반영한다.
- **E2E 구성**: 마니또 멤버가 "등록자 전체"라서 `join`·`manito-mission` spec 이 동시에 돌면 인원이 달라진다. `playwright.config.ts`를 프로젝트로 나눠 `join → manito-mission` 순서로 실행하고 홈·번호 뽑기는 병렬로 둔다. 공용 도우미는 `e2e/helpers.ts`(`seedIdentity`, `registerViaApi`, `fillJoinForm`).

### 변경 파일

- 삭제: `lib/members/index.ts`, `lib/members/members.json`
- `lib/participants/shared.ts`(이름 검증), `lib/participants/server/handlers.ts`, `lib/server/hostPin.ts`
- `components/participant/ParticipantGate.tsx`(신규), `JoinScreen.tsx`, `ParticipantBar.tsx`, `app/layout.tsx`, `app/join/page.tsx`
- `games/manito-mission/{logic.ts,Game.tsx,HostScreen.tsx,ParticipantScreen.tsx,server/handlers.ts,README.md}`
- `e2e/{helpers.ts(신규),join,manito-mission,home,number-draw}.spec.ts`, `playwright.config.ts`
- `AGENTS.md`(규칙 11), `docs/{ARCHITECTURE,TESTING,ADDING_A_GAME}.md`, `.env.example`

### 검증

- `pnpm check` 통과, `pnpm test:e2e` 19개 통과 (등록 5, 마니또 9, 홈 3, 번호 뽑기 2)
- 배포 시 주의: 이미 서버(Redis)에 남은 이전 참가자 등록·마니또 세션은 명단 이름 기준이므로, 배포 직후 사회자가 마니또 "전체 다시 뽑기"(또는 세션 초기화)와 참가자 초기화를 한 번 해 주는 것이 안전하다.

## 2026-11-10 — 이름 변경은 사회자가 켜야 가능 + 사회자 전용 메뉴

### 요청 프롬프트

> 1. 상단에 이름을 변경할 수 있는 기능은 사회자가 기능을 on 해야 작동할 수 있도록 한다.
> 2. 이름 변경 가능 on/off 기능은 사회자 전용 메뉴를 만들어 넣는다

### 구현 결정

- **기본은 꺼짐**: 설정 `allowRename`(기본 false)이 꺼져 있으면 상단 "변경" 링크가 없고, `/join`에 이미 등록된 기기로 들어가면 "이름은 바꿀 수 없어요" 안내만 보인다.
- **서버에서도 막음**: 링크만 숨기면 API 로 우회할 수 있어, 이미 이름이 있는 토큰이 다른 이름을 등록(POST)하거나 참가자가 스스로 이름을 푸는(DELETE) 요청은 설정이 꺼져 있으면 403. 사회자 비밀번호로 하는 해제와 최초 등록은 영향 없음.
- **사회자 전용 메뉴 `/host`**: 사이트 공통 페이지로 추가(규칙 3의 예외 목록에 `/host` 포함). 비밀번호 확인 후 ON/OFF 스위치를 보여 주고 "잠그기"로 다시 잠근다. 상단 띠의 "🔒 사회자 메뉴" 링크로 들어간다(등록 후에만 보임).
- **설정 저장**: `lib/settings/`(shared·client·server). 읽기는 누구나, 쓰기(`PUT /api/settings`)는 `x-host-pin` 필요. Redis 문자열 `yos-game:settings`, 없으면 메모리. 손상되거나 없는 값은 기본값(꺼짐).
- **설정 반영 시점**: 상단 띠가 페이지를 옮길 때마다 설정을 다시 읽는다(별도 폴링 없음 → Redis 사용량 증가 미미).
- **사회자 비밀번호 공유**: 탭 저장소를 `lib/host/client.ts`로 올려 `/host`와 마니또 사회자 화면이 같은 값을 쓴다(한 번만 입력). 이전에 마니또가 쓰던 키(`yos-game:manito-mission:host-pin`)는 새 키로 바뀌었다.

### 변경 파일

- `lib/settings/{shared,client}.ts`, `lib/settings/server/{store,handlers}.ts`, `app/api/settings/route.ts`
- `lib/host/client.ts`, `components/host/HostMenu.tsx`, `app/host/page.tsx`
- `components/participant/{ParticipantBar,JoinScreen}.tsx`, `lib/participants/server/handlers.ts`
- `games/manito-mission/client.ts`(비밀번호 저장소 공유)
- `e2e/host.spec.ts`(신규), `e2e/join.spec.ts`, `e2e/helpers.ts`, `playwright.config.ts`(join → host-menu → manito 순서)
- `AGENTS.md`(규칙 3), `docs/ARCHITECTURE.md`, `docs/TESTING.md`

### 검증

- `pnpm check` 통과, `pnpm test:e2e` 22개 통과 (등록 6, 사회자 메뉴 2, 마니또 9, 홈 3, 번호 뽑기 2)
- 꺼짐 상태: 변경 링크 없음, `/join` 안내, 화면 우회 POST 403 확인. 켬: 다른 기기에서도 링크가 보이고 이름 변경 성공. 비밀번호 없이/틀린 비밀번호로 PUT 401 확인.

## 2026-11-10 — 사회자 비밀번호 기본값 변경

### 요청 프롬프트

> 비밀번호 기본 값은 9409로 변경해

### 구현 결정

- `lib/server/hostPin.ts`의 `DEFAULT_HOST_PIN`을 `"0000"` → `"9409"`로 바꿨다. `HOST_PIN` 환경 변수가 있으면 여전히 그 값이 우선한다.
- 기본값을 쓰는 `e2e/helpers.ts`, `.env.example`, `docs/ARCHITECTURE.md`, `games/manito-mission/README.md`도 함께 갱신했다. 과거 기록(`docs/prompts/manito-mission.md` 등)의 `0000`은 당시 사실이라 그대로 둔다.
- 기본값은 소스에 들어 있어 저장소를 볼 수 있는 사람에게는 알려진 값이다. 운영에서는 `HOST_PIN` 환경 변수로 별도 값을 설정하는 것이 안전하다.

### 변경 파일

- `lib/server/hostPin.ts`, `e2e/helpers.ts`, `.env.example`, `docs/ARCHITECTURE.md`, `games/manito-mission/README.md`

### 검증

- `pnpm verify` 통과
