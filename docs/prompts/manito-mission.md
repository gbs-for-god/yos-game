# 마니또 미션 (`manito-mission`)

## 2026-11-09 — 역할(사회자/참여자) 기반 마니또 배정 + 미션 3개 + 공개 화면으로 재설계

### 요청 프롬프트

> 마니또 게임에 대해 아래 내용을 참고하여 검토 및 수정해
>
> - 역할은 사회자(관리자)와 참여자로 구분
> - 사회자는 1명, 참여자는 여러명
> - 게임은 사회자와 관리자 모두 참여
> - 사회자와 참여자는 명단이 있는 json 파일을 참고
> - 마니또 게임은 참여자 중 1명을 랜덤으로 뽑는다(단, 중복 불가)
> - 20개의 서로 다른 마니또 미션 중 3개를 랜덤으로 뽑아 참여저 화면에 보여준다.
> - 마니또 미션은 json 파일을 참고
> - 미션은 다시 뽑을 수 없다
> - 참여자들의 마니또와 미션은 사회자가 볼 수 있어야 한다.
> - 사회자가 게임 종료를 눌러 사회자만 볼 수 있는 화면에서 각 참여자들의 마니또와 미션을 긴장감있게 공개한다.
> - 주의할 점
>   - 웹 사이트를 껐다가 켜도 마니또와 미션을 다시 볼 수 있어야 한다
>   - 미션을 다시 뽑고 싶으면 관리자가 "다시뽑기" 버튼을 클릭해야 한다

### 구현 결정

- **기존 구현 폐기**: 기존 "버튼 누르면 미션 1개" 방식은 요구사항과 달라 게임 전체를 다시 설계했다. slug·폴더는 유지.
- **"사회자와 관리자 모두 참여"**는 사회자도 마니또를 뽑고 미션을 받는다는 뜻으로 해석했다. 사회자는 명단 마지막에 두어 공개 때 마지막 순서가 되게 했다.
- **마니또 배정**은 시작 시점에 전원 한 번에 정한다. 섞은 순서에서 "다음 사람"을 마니또로 삼는 단일 순환 방식이라 자기 자신·중복이 절대 나오지 않고, 한 명씩 뽑을 때 생기는 막다른 경우(마지막 사람이 자기만 남는 상황)가 없다. 참여자 화면의 "뽑기"는 미리 정해진 결과를 보여 주는 동작이다.
- **미션 배정**은 섞은 카드 더미에서 3장씩 나눠 주는 방식으로, 20개 미션 안에서 멤버끼리 최대한 겹치지 않게 했다. 6명 이하이면 전원 서로 다른 미션을 받는다.
- **"미션은 다시 뽑을 수 없다"**: 참여자에게는 다시 뽑기 버튼이 없다. 사회자 화면에만 멤버별 "미션 다시 뽑기"(마니또는 유지)와 "전체 다시 뽑기"(마니또·미션 모두 새로)를 두었고, 둘 다 확인 단계를 거친다.
- **사회자 전용 화면 보호**: 로그인이 없으므로 `data/members.json`의 `hostPin`으로 간단히 잠갔다. 기본값 `0000`. 참여자가 노트북 앞에서 실수로 전체 배정표를 보는 것을 막는 용도이며 보안 수단은 아니다.
- **공개 연출**: "공개!"를 누르면 3초간 "두구두구두구..." 애니메이션 후 마니또 이름을 `text-9xl`로 보여 준다. 공개 진행 상황(`revealedCount`)도 저장되어 새로고침해도 이어진다.
- **영속화**: `localStorage` 키 `yos-game:manito-mission:session`에 세션 전체를 저장한다. React 와의 동기화는 `useSyncExternalStore`를 사용해 effect 내 setState 없이 구현했다(react-hooks 7의 `set-state-in-effect` 규칙 준수). 저장소가 막힌 환경을 위해 메모리 폴백을 둔다.
- **명단 변경 감지**: 저장된 세션의 명단과 현재 `members.json`이 다르면 사회자 화면에 경고를 띄운다. 자동으로 재배정하지 않는다(진행 중인 게임이 날아가면 안 되므로).
- **범위 밖**: 참여자 기기 연동, 사회자 외 재뽑기, 미션 완료 체크 기능은 넣지 않았다.

### 변경 파일

- `games/manito-mission/logic.ts` — 세션 타입, 마니또/미션 배정, 상태 전이, 파싱 (순수 함수)
- `games/manito-mission/storage.ts` — localStorage 외부 저장소 (useSyncExternalStore 용)
- `games/manito-mission/Game.tsx` — 화면 분기 오케스트레이터
- `games/manito-mission/ParticipantScreen.tsx`, `HostGate.tsx`, `HostScreen.tsx`, `RevealScreen.tsx`, `MissionList.tsx`
- `games/manito-mission/data/members.json` (신규), `data/missions.json` (10 → 20개)
- `games/manito-mission/meta.ts`, `games/manito-mission/README.md` (신규, 데이터 수정 안내)
- `e2e/manito-mission.spec.ts` — 7개 시나리오로 재작성

### 검증

- `pnpm verify` 통과 (typecheck · lint · prettier · E2E 12개)
- 1920×1080 스크린샷으로 참여자 목록/결과, 사회자 표, 공개 화면 가독성 확인
- 개발 서버 오버레이의 `Could not validate instant` 경고는 번호 뽑기 페이지에서도 동일하게 나오는 기존 `cacheComponents` 개발 전용 진단으로, 이번 변경과 무관함을 확인

## 2026-11-09 — 참여자 휴대폰에서 확인한 상태를 모든 기기에 공유 (서버 상태 도입)

### 요청 프롬프트

> A 클라이언트가 자기 모바일에서 확인하면, 자기걸 확인했다는 걸 다른 클라이언트도 공유되었으면 좋겠어

(후속 확인) 저장소로 Vercel + Upstash Redis 를 쓰기로 함. 접속 방식은 별도 답이 없어 권장안(단일 모임, 참여자가 같은 주소로 접속해 이름 선택)으로 진행.

### 구현 결정

- **규칙 변경**: 기기 간 공유는 localStorage 로 불가능하므로 AGENTS.md 5번(백엔드 금지)을 "기기 간 공유가 꼭 필요한 게임만 Route Handler + Upstash Redis 허용"으로, 3번에 `app/api/<slug>/` 예외를 추가하고 ARCHITECTURE.md 에 "서버 상태" 절을 신설했다.
- **저장소 선택**: Vercel Marketplace 공식 연동이고 HTTP 기반이라 서버리스에 맞으며, 데이터가 세션 JSON 하나 + 확인 해시 하나라 Redis 로 충분하다. 환경 변수가 없으면 메모리 저장소로 대체해 로컬 개발·E2E 가 네트워크 없이 돌아간다.
- **동기화 방식**: 폴링 3초. 서버 푸시가 없는 Redis 의 한계이지만 이 게임 속도에는 충분하고 명령 수도 무료 티어 안이다. 동작(POST) 응답으로 자기 화면은 즉시 갱신한다.
- **동시 쓰기 안전**: 확인 여부는 여러 휴대폰이 동시에 쓰므로 Redis 해시 필드(HSET)로 기록해 덮어쓰기를 피했다. 배정표·단계는 사회자만 바꾸므로 JSON 하나로 저장한다.
- **권한과 노출 범위**: 사회자 동작은 `x-host-pin` 헤더로 서버에서 검증한다(`MANITO_HOST_PIN` 환경 변수, 없으면 members.json 값). 참여자 휴대폰에는 본인 배정(`?name=`)과 이미 공개된 사람의 배정만 내려 주어, 네트워크 탭을 봐도 남의 마니또를 알 수 없게 했다.
- **흐름 변경**: 게임 시작은 사회자 확인 후에만 가능하고, 시작 전 참여자에게는 대기 안내가 보인다. 공개 단계에서 사회자 노트북은 두구두구 연출 + 진행 버튼을, 참여자 휴대폰은 방금 공개된 결과와 다음 차례만 보여 준다. 사회자 비밀번호는 탭(sessionStorage)에 기억해 공개 중 새로고침해도 다시 묻지 않는다.
- **의존성 추가**: `@upstash/redis` 1개. QR 코드는 라이브러리를 더 늘리지 않기 위해 넣지 않고 사회자 화면에 접속 주소를 크게 표시했다(후속 과제).
- **범위 밖**: 방 코드(여러 모임 동시 운영), 실시간 푸시(SSE/WebSocket), QR 코드.

### 변경 파일

- `games/manito-mission/logic.ts` — 세션/확인 분리, PublicSession, Action 파싱
- `games/manito-mission/server/store.ts`, `server/handlers.ts` (신규) — Upstash/메모리 저장소, 요청 처리
- `app/api/manito-mission/session/route.ts` (신규) — GET/POST/DELETE
- `games/manito-mission/client.ts`, `hostPinStorage.ts` (신규) — API 호출·폴링 훅, 비밀번호 보관. `storage.ts`(localStorage) 삭제
- `games/manito-mission/Game.tsx`, `ParticipantScreen.tsx`, `HostGate.tsx`, `HostScreen.tsx`, `RevealScreen.tsx` — 서버 상태 기반으로 수정, 휴대폰 반응형
- `e2e/manito-mission.spec.ts` — 직렬 실행 + 휴대폰 컨텍스트로 기기 간 공유 검증
- `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/ADDING_A_GAME.md`, `games/manito-mission/README.md`, `.env.example`, `.gitignore`
- `package.json` — `@upstash/redis` 추가

### 검증

- `pnpm verify` 통과 (E2E 12개, 그중 휴대폰 컨텍스트 ↔ 노트북 동기화 3개)
- 개발 서버에서 노트북(1920×1080)·휴대폰(390×844) 스크린샷으로 레이아웃과 "확인 완료" 동기화 확인
- Upstash 실연결은 Vercel 배포 후 확인 필요 (로컬은 메모리 저장소)

## 2026-11-10 — 참여자 신원(사이트 공용) 기반으로 전환, 폴링 10초/5초

### 요청 프롬프트

> 화면이 꺼지거나 다른 앱으로 넘어가거나 다시 재접속해도 이전 상태를 기억할 수 있는 거지? 꼭 같은 사람이 같은 정보를 읽어야만 해

> 마니또만이 아니라 저 웹 사이트를 접속할 때 참여자의 이름을 등록하여 사이트 전체에서 사용할 수 있도록 하고 토큰을 저장하여 웹사이트를 재접속해도 로그인 없이도 참여자의 상태를 기억할 수 있게 바꿔

(함께 반영) "20명이서 5시간 정도 사용할 건데 10초면 괜찮아?" → 폴링 평소 10초, 공개 단계 5초.

### 구현 결정

- 신원 계층 자체는 사이트 공용으로 만들었다 → [participant-identity.md](participant-identity.md). 여기서는 게임 쪽 변화만 적는다.
- **참여자 화면**: 명단에서 이름을 고르는 UI 를 없애고, 등록된 기기(`useParticipantIdentity`)의 이름으로 "OOO님, 반가워요! → 내 마니또 뽑기!"만 보여 준다. 미등록 기기에는 `/join` 안내와 확인 현황판만 보인다. 서버는 `x-participant-token`으로 본인을 확정하므로 남의 결과를 볼 수 없다.
- **`viewed` 동작**은 이름을 받지 않고 토큰으로 판단한다. 응답에 `me`(토큰의 이름, 해제되면 null)와 `registered`(등록된 이름 목록)를 추가했다.
- **사회자 화면**에 "기기" 열(등록됨/미등록)과 "기기 초기화" 버튼을 추가했다. 접속 주소는 `/join`으로 바뀌었다.
- **공개 화면**은 등록 여부와 무관하게 모든 기기에 보인다(공개 결과는 모두가 봐야 하므로).
- 명단 파일이 `lib/members/`로 이동해 게임의 `data/members.json`은 삭제했다. 사회자 비밀번호 저장(sessionStorage)은 공용 훅 `useStoredValue`로 바꿨다.

### 변경 파일

- `games/manito-mission/logic.ts`, `client.ts`, `Game.tsx`, `ParticipantScreen.tsx`, `HostScreen.tsx`, `server/store.ts`, `server/handlers.ts`, `README.md`
- 삭제: `games/manito-mission/data/members.json`, `games/manito-mission/hostPinStorage.ts`
- `e2e/manito-mission.spec.ts` — 휴대폰 컨텍스트가 `/join`으로 등록한 뒤 진행하도록 재작성

### 검증

- `pnpm verify` 통과 (마니또 E2E 8개 포함 16개)

## 2026-11-13 — 운영에서 참가자 이름이 "0", "1"(인덱스)로 보이는 문제 수정

### 요청 프롬프트

> https://yos-game.vercel.app/games/manito-mission 접속하면 이름에 index가 나오는데 무슨 문제일까

> 1. 수정하고 verify 돌려
> 2. docs/prompts 에 기록 남겨
> 3. redis 응답 형태를 흉내 내는 테스트를 추가해

### 구현 결정

- **원인**: `lib/server/redis.ts` 가 Redis 클라이언트를 `automaticDeserialization: false` 로 만든다. 설치된 `@upstash/redis` 는 이 옵션에서 `hgetall` 결과를 객체로 바꾸지 않고 `[필드, 값, 필드, 값, …]` 평평한 배열 그대로 돌려준다. 코드가 이를 `{이름: 토큰}` 객체로 가정하고 `Object.keys()` 로 읽어 이름 자리에 "0", "1" 인덱스가 들어갔다. 운영 API(`/api/participants`, `/api/manito-mission/session`)가 `["0","1"]` 을 돌려주는 것으로 확인했다.
- **왜 못 잡았나**: 로컬·E2E 는 Redis 환경 변수가 없어 메모리 저장소를 쓰고, 메모리 저장소는 진짜 객체를 돌려주므로 차이가 드러나지 않았다.
- **수정**: 의존성 없는 변환 함수 `toHashRecord`(`lib/server/redisHash.ts`)를 만들어 배열·객체·null 응답을 모두 `{필드: 값}` 로 바꾼다. `hgetall` 을 쓰는 두 곳(참여자 저장소 `readAll`, 마니또 확인 기록 `read`)이 이 함수를 거친다. 저장(`hsetnx`/`hset`)은 원래 정상이어서 Redis 에 쌓인 데이터는 그대로 쓸 수 있다.
- **테스트**: 운영과 같은 응답 형태의 가짜 Redis 로 두 저장소를 직접 호출하는 `e2e/redis-hash.spec.ts` 를 추가했다. 브라우저·서버 없이 돌아가며, 두 저장소 클래스(`RedisParticipantStore`, `UpstashStore`)를 테스트에서 쓰도록 export 했다.
- **배포 후 조치**: 이미 시작된 마니또 세션에는 "0", "1" 이름이 저장되어 있으므로, 배포 뒤 사회자 화면에서 세션을 초기화하고 다시 시작해야 한다.
- **함께 고친 기존 E2E 실패**: 최근 커밋(`ParticipantGate` 가 서버에 토큰을 확인해 모르는 토큰이면 `/join` 으로 보냄)부터 서버에 없는 신원을 브라우저에만 심는 테스트(홈·번호 뽑기·노래 맞추기·인물 맞추기)가 모두 실패하고 있었다. `seedIdentity` 가 서버에도 신원을 등록하도록 바꾸고, 참가자 목록을 지우는 spec 과 겹치지 않게 `chromium` 프로젝트가 `manito-mission` 프로젝트 뒤에 실행되도록 했다. 마니또 "기기 초기화" 테스트는 해제된 휴대폰이 안내 화면 대신 `/join` 으로 이동하는 현재 동작에 맞췄다.

### 변경 파일

- `lib/server/redisHash.ts` (신규), `lib/participants/server/store.ts`, `games/manito-mission/server/store.ts`
- `e2e/redis-hash.spec.ts` (신규), `e2e/helpers.ts`, `e2e/manito-mission.spec.ts`, `playwright.config.ts`
- `docs/TESTING.md`

### 검증

- 새 테스트 7개 통과, `pnpm check` 통과
- `pnpm verify`: 51개 통과, 4개 실패 — 모두 인물 맞추기 480장 확장 작업(미커밋)이 아직 `people.json`·사진 120개 상태라서 생긴 실패이며 이번 수정과 무관하다.
- 실제 Upstash 연결은 Vercel 배포 후 `/api/participants` 응답이 실제 이름으로 나오는지 확인해야 한다.

## 2026-11-13 — 미션 뽑기 규칙 재정의 (사람마다 독립 시행)

### 요청 프롬프트

> 마니또 미션지 뽑는 규칙을 다시 정할게.
>
> 1. 게임 시작 시 배정 (dealMissions)
>
> - 한 사람의 미션은 20개의 미션 중 3개 선택 (중복 불가)
> - 각 사람마다 독립 시행
>
> 2. 사회자가 한 사람의 미션만 다시 뽑을 때 (pickMissions)
>
> - dealMissions와 동일한 작동

### 구현 결정

- **이전 규칙**: 섞은 카드 더미에서 차례로 나눠 줘서 멤버끼리 최대한 겹치지 않았고(7명까지 전원 다름), 다시 뽑기는 기존 미션을 제외하고 뽑았다.
- **새 규칙**: `pickMissions(missions, count, random)` 가 전체 미션을 섞어 앞에서 `count`개를 고른다. `dealMissions` 는 사람마다 이 함수를 한 번씩 부른다. 한 사람 안에서는 중복이 없고, 사람 사이에는 같은 미션이 나올 수 있다(참가자 8명부터 겹칠 수 있고, 20명이면 대부분 겹친다).
- **다시 뽑기**: `redrawMissions` 도 `pickMissions` 를 쓴다(아래 같은 날 추가 요청으로 이전 미션 제외 규칙이 붙었다). 마니또와 다른 사람의 미션은 그대로다.
- 미션이 `count`개보다 적으면 있는 만큼만 배정하는 기존 동작은 유지했다.
- 이미 시작된 세션은 저장된 배정을 그대로 쓰므로, 새 규칙은 다음 시작·전체 다시 뽑기·미션 다시 뽑기부터 적용된다.

### 변경 파일

- `games/manito-mission/logic.ts`, `games/manito-mission/README.md`
- `e2e/manito-missions-rule.spec.ts` (신규, 서버 없이 순수 함수 7개)
- `docs/prompts/manito-mission.md`

### 검증

- 새 규칙 테스트 7개 통과(한 사람 3개·중복 없음, 사람 간 겹침 허용, 사람별 독립, 다시 뽑기 동일 방식), `pnpm check` 통과

## 2026-11-13 — 미션 다시 뽑기에서 이전에 받은 미션 제외

### 요청 프롬프트

> pickMissions의 규칙을 추가할게. 이전에 받은 미션은 제외

### 구현 결정

- `pickMissions(missions, count, random, exclude = [])` 에 `exclude` 를 되살려, 그 사람이 이전에 받은 미션은 뽑지 않는다. `redrawMissions` 는 현재 `missionIds` 를 `exclude` 로 넘긴다. `dealMissions`(게임 시작)는 이전 미션이 없으므로 제외 없이 호출한다.
- 나머지 규칙은 그대로다: 사람마다 독립 시행, 한 사람 안에서 중복 없음, 다른 사람과는 겹칠 수 있음.
- 제외하고 남은 미션이 `count`개보다 적을 때(현재 20개에서 3개 제외면 17개라 해당 없음)만 제외한 미션으로 채운다. 미션이 크게 줄어도 동작이 멈추지 않게 하려는 안전장치다.
- 직전 항목(독립 시행)에서 "다시 뽑기는 기존 미션을 피하지 않는다"고 적은 부분은 이 요청으로 바뀌었다.

### 변경 파일

- `games/manito-mission/logic.ts`, `games/manito-mission/README.md`
- `e2e/manito-missions-rule.spec.ts`, `docs/prompts/manito-mission.md`

### 검증

- 이전 미션 제외(200회 반복), 남은 미션 부족 시 채우기, 다시 뽑기 시 마니또·다른 사람 불변 테스트 통과
