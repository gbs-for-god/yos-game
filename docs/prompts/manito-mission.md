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
