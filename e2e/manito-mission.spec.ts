import { expect, test } from "@playwright/test";

const MISSION_COUNT = 10;

test.describe("마니또 미션", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/games/manito-mission");
  });

  test("미션 뽑기를 누르면 미션 하나가 화면에 표시된다", async ({ page }) => {
    await expect(page.getByText("버튼을 눌러 마니또 미션을 뽑으세요!")).toBeVisible();
    await expect(page.getByTestId("mission-title")).toHaveCount(0);

    await page.getByRole("button", { name: "미션 뽑기!" }).click();

    await expect(page.getByTestId("mission-title")).not.toBeEmpty();
    await expect(page.getByTestId("mission-card")).toContainText("기한:");
    await expect(page.getByText(`뽑은 미션 1 / ${MISSION_COUNT}`)).toBeVisible();
  });

  test("10개를 모두 뽑으면 중복이 없고, 처음부터를 누르면 다시 뽑을 수 있다", async ({ page }) => {
    const drawButton = page.getByRole("button", { name: "미션 뽑기!" });
    const titles: string[] = [];

    for (let i = 1; i <= MISSION_COUNT; i++) {
      await drawButton.click();
      await expect(page.getByText(`뽑은 미션 ${i} / ${MISSION_COUNT}`)).toBeVisible();
      titles.push(await page.getByTestId("mission-title").innerText());
    }

    expect(new Set(titles).size).toBe(MISSION_COUNT);
    await expect(page.getByRole("button", { name: "모든 미션을 뽑았어요" })).toBeDisabled();

    await page.getByRole("button", { name: "처음부터" }).click();
    await expect(page.getByText(`뽑은 미션 0 / ${MISSION_COUNT}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "미션 뽑기!" })).toBeEnabled();
  });
});
