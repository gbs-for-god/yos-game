import { expect, test, type Page } from "@playwright/test";
import { HOST_PIN, randomName, seedIdentity } from "./helpers";

// 참가자명을 등록해야 화면을 볼 수 있으므로 이미 등록한 기기로 시작한다
test.beforeEach(async ({ context }) => {
  await seedIdentity(context, { name: randomName(), token: crypto.randomUUID() });
});

test.describe("번호 뽑기", () => {
  async function login(page: Page) {
    await page.goto("/games/number-draw");
    await page.getByLabel("사회자 비밀번호").fill(HOST_PIN);
    await page.getByRole("button", { name: "들어가기" }).click();
    await expect(page.getByRole("button", { name: "뽑기!" })).toBeVisible();
  }

  test("사회자 로그인 전에는 뽑기 화면이 보이지 않는다", async ({ page }) => {
    await page.goto("/games/number-draw");
    await expect(page.getByRole("heading", { name: "🔒 사회자 로그인" })).toBeVisible();
    await expect(page.getByRole("button", { name: "뽑기!" })).toHaveCount(0);
  });

  test("틀린 비밀번호로는 들어갈 수 없다", async ({ page }) => {
    await page.goto("/games/number-draw");
    await page.getByLabel("사회자 비밀번호").fill("wrong-pin");
    await page.getByRole("button", { name: "들어가기" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /비밀번호/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "뽑기!" })).toHaveCount(0);
  });

  test("뽑기를 누르면 번호가 표시되고 목록에 쌓인다", async ({ page }) => {
    await login(page);
    await expect(page.getByTestId("current-number")).toHaveText("?");

    await page.getByRole("button", { name: "뽑기!" }).click();
    await expect(page.getByTestId("current-number")).toHaveText(/^\d+$/);
    await expect(page.getByTestId("drawn-list").getByRole("listitem")).toHaveCount(1);
  });

  test("모든 번호를 뽑으면 버튼이 비활성화되고 중복이 없다", async ({ page }) => {
    await login(page);
    await page.getByLabel("최대 번호").fill("3");
    await page.getByRole("button", { name: "새로 시작" }).click();

    const drawButton = page.getByRole("button", { name: "뽑기!" });
    for (let i = 0; i < 3; i++) await drawButton.click();

    await expect(page.getByRole("button", { name: "모두 뽑았어요" })).toBeDisabled();
    const drawn = await page.getByTestId("drawn-list").getByRole("listitem").allTextContents();
    expect([...drawn].sort()).toEqual(["1", "2", "3"]);
  });
});
