# 테스트

현재 단계에서는 **Playwright E2E 테스트**만 사용한다. 게임 로직은 순수 함수로 작성해두어, 필요해지면 Vitest 단위 테스트를 쉽게 추가할 수 있게 한다.

## 실행

```bash
pnpm test:e2e        # 헤드리스 실행 (프로덕션 빌드 → 3100 포트에서 start → 테스트)
pnpm test:e2e:ui     # Playwright UI 모드 (디버깅)
pnpm exec playwright test e2e/number-draw.spec.ts   # 파일 단위 실행
pnpm exec playwright show-report                     # 마지막 리포트 보기
```

- 최초 1회 브라우저 설치 필요: `pnpm exec playwright install chromium`
- 설정: [`playwright.config.ts`](../playwright.config.ts) — Desktop Chrome, 1920×1080 (프로젝터 해상도)
- 로컬에서는 3100 포트에 이미 서버가 떠 있으면 재사용한다 (코드 변경 후에는 서버를 내리고 다시 실행)

## 작성 규칙

- 파일: `e2e/<slug>.spec.ts` (홈/공통은 `e2e/home.spec.ts`)
- 셀렉터 우선순위: `getByRole(name)` → `getByLabel` → `getByText` → `getByTestId`
- CSS 클래스·DOM 구조에 의존하는 셀렉터 금지
- 무작위 결과는 값 자체가 아니라 **성질**을 검증 (예: 숫자 형식, 중복 없음, 개수)
- `waitForTimeout` 대신 `expect(...).toHaveText` 같은 자동 대기 assertion 사용
- 타이머가 있는 게임은 `page.clock` API로 시간을 제어한다
- HTTP 상태 코드(404 등)는 검증하지 않는다 — `cacheComponents` 스트리밍 때문에 200으로 응답할 수 있으므로 화면 내용으로 검증
- 서버 상태를 쓰는 테스트(참여자 등록, 마니또 미션)는 테스트끼리 상태를 공유하므로 `test.describe.configure({ mode: "serial" })`로 직렬 실행하고, `beforeEach`에서 사회자 권한으로 `DELETE /api/participants`·`DELETE /api/<slug>/session`을 호출해 초기화한다
- 등록하지 않은 기기는 모든 화면에서 `/join`으로 가므로, 서버 상태를 쓰지 않는 테스트(홈·번호 뽑기)는 `e2e/helpers.ts`의 `seedIdentity`로 브라우저에 신원을 심어 시작한다
- 참여자로 행동하는 테스트는 `registerViaApi`로 서버에 미리 등록하고 `seedIdentity`로 그 신원을 휴대폰 컨텍스트에 심는다. 입력 화면 자체를 검증할 때만 `fillJoinForm`을 쓴다 (`e2e/manito-mission.spec.ts` 참고)
- 이름 변경 허용 설정은 서버에 남으므로 `setAllowRename`(`e2e/helpers.ts`)으로 테스트마다 명시해 둔다
- 서버 상태를 공유하는 spec(`join`, `host`, `manito-mission`)은 `playwright.config.ts`의 프로젝트로 나뉘어 차례로 실행된다. 새 spec 이 참가자 등록을 서버에 남기면 `SERVER_STATE_SPECS`에 추가한다
- Next.js 라우트 안내자(`#__next-route-announcer__`)도 `role="alert"`이므로 오류 문구는 `getByRole("alert").filter({ hasText })`로 찾는다
- 기기 간 공유는 `browser.newContext()`로 두 번째 브라우저(휴대폰 뷰포트)를 열어 검증한다. 다른 기기의 변화는 폴링(3초)으로 반영되므로 assertion 에 10초 정도의 timeout 을 준다

## 샌드박스/CI 환경 메모

- `next build`(Turbopack)는 Tailwind 로더용 Node 워커 프로세스를 띄워 로컬 소켓으로 통신한다. 프로세스 간 통신이 막힌 샌드박스에서는 `node process exited before we could connect to it` 오류로 빌드가 실패하므로, 샌드박스 밖에서 실행해야 한다.
