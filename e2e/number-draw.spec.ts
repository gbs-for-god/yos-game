import { expect, test } from "@playwright/test";

test.describe("번호 뽑기", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/games/number-draw");
  });

  test("뽑기를 누르면 번호가 표시되고 목록에 쌓인다", async ({ page }) => {
    await expect(page.getByTestId("current-number")).toHaveText("?");

    await page.getByRole("button", { name: "뽑기!" }).click();
    await expect(page.getByTestId("current-number")).toHaveText(/^\d+$/);
    await expect(page.getByTestId("drawn-list").getByRole("listitem")).toHaveCount(1);
  });

  test("모든 번호를 뽑으면 버튼이 비활성화되고 중복이 없다", async ({ page }) => {
    await page.getByLabel("최대 번호").fill("3");
    await page.getByRole("button", { name: "새로 시작" }).click();

    const drawButton = page.getByRole("button", { name: "뽑기!" });
    for (let i = 0; i < 3; i++) await drawButton.click();

    await expect(page.getByRole("button", { name: "모두 뽑았어요" })).toBeDisabled();
    const drawn = await page.getByTestId("drawn-list").getByRole("listitem").allTextContents();
    expect([...drawn].sort()).toEqual(["1", "2", "3"]);
  });
});
