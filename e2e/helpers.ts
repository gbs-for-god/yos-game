import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

/**
 * 여러 spec 이 함께 쓰는 E2E 도우미.
 * 파일 이름이 *.spec.ts 가 아니므로 Playwright 가 테스트로 실행하지 않는다.
 */

/** 사회자 비밀번호. 서버와 같은 규칙으로 HOST_PIN 환경 변수가 없으면 기본값(lib/server/hostPin.ts)을 쓴다 */
export const HOST_PIN = process.env.HOST_PIN || "0000";
export const ENTRY_CODE = "교회2026";
export const HOST_HEADERS = { "x-host-pin": HOST_PIN };

/** lib/participants/client.ts 의 신원 저장 키 */
const IDENTITY_KEY = "yos-game:participant";

export type Identity = { name: string; token: string };

/** 서버의 참가자 등록을 모두 지운다 (사회자 권한) */
export async function resetParticipants(request: APIRequestContext) {
  const response = await request.delete("/api/participants", { headers: HOST_HEADERS });
  expect(response.status()).toBe(204);
  const settings = await request.put("/api/settings", {
    headers: HOST_HEADERS,
    data: { entryCode: ENTRY_CODE },
  });
  expect(settings.ok()).toBeTruthy();
}

/** 화면을 거치지 않고 서버에 참가자를 등록한다 (미리 등록해 둔 휴대폰 역할) */
export async function registerViaApi(request: APIRequestContext, name: string): Promise<Identity> {
  const identity = { name, token: randomUUID() };
  const response = await request.post("/api/participants", {
    data: { ...identity, entryCode: ENTRY_CODE },
  });
  expect(response.ok()).toBeTruthy();
  return identity;
}

/**
 * 브라우저에 신원을 심어 "이미 등록한 기기"로 만든다. 서버에는 기록하지 않으므로
 * 서버 상태를 쓰지 않는 테스트(홈, 번호 뽑기)가 참가자 목록을 어지럽히지 않는다.
 */
export async function seedIdentity(context: BrowserContext, identity: Identity) {
  await context.addInitScript(
    ([key, value]) => {
      // 테스트 중 이름을 바꾸면 그 값을 유지해야 하므로 비어 있을 때만 심는다
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    },
    [IDENTITY_KEY, JSON.stringify(identity)] as const,
  );
}

/** 테스트용 임의 이름 (12자 이하) */
export function randomName(prefix = "테스트"): string {
  return `${prefix}${randomUUID().slice(0, 6)}`;
}

/** /join 화면에서 참가자명을 입력해 등록하고, 원래 가려던 화면에 도착할 때까지 기다린다 */
export async function fillJoinForm(page: Page, name: string, expectedUrl: string | RegExp) {
  await page.getByLabel("참가자명").fill(name);
  await page.getByLabel("입장코드", { exact: true }).fill(ENTRY_CODE);
  await page.getByRole("button", { name: /^(참여하기|이 이름으로 바꾸기)$/ }).click();
  await expect(page).toHaveURL(expectedUrl);
}

/** 사회자 권한으로 "참가자 이름 변경 허용" 설정을 바꾼다 (화면을 거치지 않음) */
export async function setAllowRename(request: APIRequestContext, allowRename: boolean) {
  const response = await request.put("/api/settings", {
    headers: HOST_HEADERS,
    data: { allowRename },
  });
  expect(response.ok()).toBeTruthy();
}
