import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import members from "../lib/members/members.json";

/** 참여자 등록은 서버(메모리 저장소)에 남아 테스트끼리 공유되므로 직렬로 실행하고 매번 초기화한다. */
test.describe.configure({ mode: "serial" });

const HOST_HEADERS = { "x-host-pin": members.hostPin };

async function resetParticipants(request: APIRequestContext) {
  const response = await request.delete("/api/participants", { headers: HOST_HEADERS });
  expect(response.status()).toBe(204);
}

async function registerAs(page: Page, name: string, next = "/") {
  await page.goto(`/join?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await expect(page).toHaveURL(next);
}

test.describe("참여자 등록", () => {
  test.beforeEach(async ({ request }) => {
    await resetParticipants(request);
  });

  test("홈에서 등록하러 가서 이름을 고르면 상단에 표시되고 새로고침해도 유지된다", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "👋 참여자 등록하기" }).click();
    await expect(page).toHaveURL("/join");
    await expect(page.getByRole("heading", { name: "👋 이름을 선택해 주세요" })).toBeVisible();

    const me = members.participants[0];
    await page.getByRole("button", { name: new RegExp(`^${me}`) }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("participant-name")).toContainText(me);

    await page.reload();
    await expect(page.getByTestId("participant-name")).toContainText(me);

    // 게임 페이지에서도 같은 신원이 보인다
    await page.goto("/games/number-draw");
    await expect(page.getByTestId("participant-name")).toContainText(me);
  });

  test("다른 기기는 이미 등록된 이름을 고를 수 없고, 사회자가 해제하면 고를 수 있다", async ({
    page,
    browser,
    request,
  }) => {
    const me = members.participants[1];
    await registerAs(page, me);

    const other = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const otherPage = await other.newPage();
    await otherPage.goto("/join");
    const taken = otherPage.getByRole("button", { name: new RegExp(`^${me}`) });
    await expect(taken).toBeDisabled();
    await expect(taken).toContainText("다른 기기에서 등록됨");

    const released = await request.delete("/api/participants", {
      headers: HOST_HEADERS,
      data: { name: me },
    });
    expect(released.ok()).toBeTruthy();

    await otherPage.reload();
    await expect(otherPage.getByRole("button", { name: new RegExp(`^${me}`) })).toBeEnabled();
    await other.close();
  });

  test("등록된 기기가 다른 이름을 고르면 이전 이름은 풀린다", async ({ page, browser }) => {
    const first = members.participants[2];
    const second = members.participants[3];
    await registerAs(page, first);

    await page.getByRole("link", { name: "변경" }).click();
    await expect(page.getByText(`지금은 ${first}님으로 등록되어 있어요.`)).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`^${second}`) }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("participant-name")).toContainText(second);

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto("/join");
    await expect(otherPage.getByRole("button", { name: new RegExp(`^${first}`) })).toBeEnabled();
    await expect(otherPage.getByRole("button", { name: new RegExp(`^${second}`) })).toBeDisabled();
    await other.close();
  });
});
