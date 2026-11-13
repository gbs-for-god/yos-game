# 입장코드 (`entry-code`)

## 2026-11-13 — 참가자 등록과 이름 변경에 입장코드 추가

### 요청 프롬프트

> "입장코드 기능"을 추가할 거야. 아래 내용을 확인 해서 개발해.
> ---
>
> 1. 사회자가 사회자 페이지에서 입장코드를 정할 수 있다.
> 2. 참여자는 참가자명 작성과 함께 입장코드를 작성해야 접속할 수 있다.
> 3. 참가자명을 변경할 때도 입장코드는 작성해야 한다.

### 구현 결정

- 기존 사이트 설정 Redis JSON에 입장코드를 저장한다. 앞뒤 공백을 제거하고 1~32자로 제한한다.
- 사회자 인증 응답에만 코드를 포함하며 공개 설정 API에서는 제외한다.
- 신규 등록과 이름 변경은 등록 API에서 현재 코드를 검사한다. 미설정·누락·불일치는 거부한다.
- 기존 참가자는 코드를 바꿔도 접속을 유지한다. 코드는 브라우저 저장소에 저장하지 않는다.
- 최초 코드 설정을 위해 `/host`는 참가자 등록 게이트에서 제외하고 기존 사회자 비밀번호로 보호한다. 등록 화면에 사회자 메뉴 링크를 추가한다.
- 기존 이름 변경 허용 설정은 그대로 적용한다. 새 의존성은 없다.
- 기존 인물 맞추기 수정은 보존하며 검증 진행을 위해 기존 두 파일의 포맷만 정리한다.

### 변경 파일

- `components/host/HostMenu.tsx`
- `components/participant/JoinScreen.tsx`
- `components/participant/ParticipantGate.tsx`
- `lib/settings/shared.ts`, `lib/settings/client.ts`
- `lib/settings/server/store.ts`, `lib/settings/server/handlers.ts`
- `lib/participants/client.ts`, `lib/participants/server/handlers.ts`
- `e2e/helpers.ts`, `e2e/join.spec.ts`, `e2e/host.spec.ts`, `e2e/manito-mission.spec.ts`
- `docs/ARCHITECTURE.md`
- 포맷만 정리: `e2e/person-quiz.spec.ts`, `games/person-quiz/GroupScreen.tsx`

### 검증

- 타입 검사·ESLint·Prettier 통과.
- `pnpm build` 통과. `pnpm verify` 내부 빌드는 샌드박스 포트 제한으로 실패하여, 허용된 직접 빌드와 프로덕션 서버를 사용해 전체 검증을 재실행했다.
- 입장코드 누락·오류 차단, 이름 변경 시 코드 재검증, 사회자 설정 저장·새로고침 유지, 공개 API의 코드 비노출, 설정 권한·길이 검증 테스트 통과.
- Playwright의 1920×1080 및 기존 모바일 컨텍스트로 등록·이름 변경 흐름을 검증했다.

- 최종 `pnpm verify`: 정적 검사 통과, E2E 48개 중 44개 통과·4개 실패. 실패는 모두 기존 인물 맞추기의 480명 요구와 실제 120명 데이터 불일치로 발생했다. 테스트 삭제·skip 없이 결과를 기록하며 전체 검증 통과는 보류한다.
