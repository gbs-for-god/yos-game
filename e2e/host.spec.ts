import { expect, test } from "@playwright/test";
import {
  fillJoinForm,
  HOST_PIN,
  randomName,
  registerViaApi,
  resetParticipants,
  seedIdentity,
  setAllowRename,
} from "./helpers";

/** 사이트 설정과 참가자 등록은 서버를 공유하므로 직렬로 실행하고 매번 초기화한다. */
test.describe.configure({ mode: "serial" });

test.describe("사회자 메뉴", () => {
  test.beforeEach(async ({ request }) => {
    await resetParticipants(request);
    await setAllowRename(request, false);
  });

  test("상단 링크로 들어가 비밀번호를 확인하고 이름 변경을 켜면 참가자에게 변경 링크가 생긴다", async ({
    page,
    browser,
    request,
  }) => {
    const me = await registerViaApi(request, randomName("참가"));
    await seedIdentity(page.context(), me);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "변경" })).toHaveCount(0);

    await page.getByRole("link", { name: "🔒 사회자 메뉴" }).click();
    await expect(page).toHaveURL("/host");

    await page.getByLabel("사회자 비밀번호").fill("wrong-pin");
    await page.getByRole("button", { name: "들어가기" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "사회자 비밀번호가 틀렸어요." }),
    ).toBeVisible();

    await page.getByLabel("사회자 비밀번호").fill(HOST_PIN);
    await page.getByRole("button", { name: "들어가기" }).click();
    const toggle = page.getByRole("switch", { name: "참가자 이름 변경 허용" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    // 설정은 서버에 저장되어 새로고침해도, 다른 기기에서도 반영된다
    await page.reload();
    await expect(page.getByRole("switch", { name: "참가자 이름 변경 허용" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    const other = await browser.newContext();
    const phone = await registerViaApi(request, randomName("폰"));
    await seedIdentity(other, phone);
    const otherPage = await other.newPage();
    await otherPage.goto("/");
    await expect(otherPage.getByRole("link", { name: "변경" })).toBeVisible();
    await otherPage.getByRole("link", { name: "변경" }).click();
    await fillJoinForm(otherPage, randomName("새이름"), "/");

    // 다시 끄면 변경 링크가 사라진다
    await page.getByRole("switch", { name: "참가자 이름 변경 허용" }).click();
    await expect(page.getByRole("switch", { name: "참가자 이름 변경 허용" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await otherPage.reload();
    await expect(otherPage.getByRole("link", { name: "변경" })).toHaveCount(0);
    await other.close();
  });

  test("비밀번호 없이는 설정을 바꿀 수 없고, 잠그면 다시 비밀번호를 묻는다", async ({
    page,
    request,
  }) => {
    const denied = await request.put("/api/settings", { data: { allowRename: true } });
    expect(denied.status()).toBe(401);
    const wrong = await request.put("/api/settings", {
      headers: { "x-host-pin": "wrong-pin" },
      data: { allowRename: true },
    });
    expect(wrong.status()).toBe(401);
    const read = await request.get("/api/settings");
    expect(await read.json()).toEqual({ allowRename: false });

    const me = await registerViaApi(request, randomName("참가"));
    await seedIdentity(page.context(), me);
    await page.goto("/host");
    await page.getByLabel("사회자 비밀번호").fill(HOST_PIN);
    await page.getByRole("button", { name: "들어가기" }).click();
    await expect(page.getByRole("switch", { name: "참가자 이름 변경 허용" })).toBeVisible();

    await page.getByRole("button", { name: "잠그기" }).click();
    await expect(page.getByLabel("사회자 비밀번호")).toBeVisible();
  });
});
