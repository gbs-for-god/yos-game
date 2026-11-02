import { expect, test } from "@playwright/test";

test("홈 화면에 등록된 게임 목록이 보인다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("교회 레크레이션 게임");
  await expect(page.getByRole("link", { name: /번호 뽑기/ })).toBeVisible();
});

test("게임 카드를 누르면 게임 화면으로 이동하고, 목록으로 돌아올 수 있다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /번호 뽑기/ }).click();
  await expect(page).toHaveURL("/games/number-draw");

  await page.getByRole("link", { name: /게임 목록/ }).click();
  await expect(page).toHaveURL("/");
});

/**
 * cacheComponents 환경에서는 스트리밍이 먼저 시작되어 상태 코드가 200으로 남을 수 있으므로
 * (Next.js not-found 문서 참고) 상태 코드 대신 화면에 표시되는 not-found UI를 검증한다.
 */
test("등록되지 않은 게임 주소는 '찾을 수 없음' 화면을 보여준다", async ({ page }) => {
  await page.goto("/games/does-not-exist");
  await expect(page.getByRole("heading", { name: /게임을 찾을 수 없어요/ })).toBeVisible();
  await page.getByRole("link", { name: /게임 목록으로/ }).click();
  await expect(page).toHaveURL("/");
});
