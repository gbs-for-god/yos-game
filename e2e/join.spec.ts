import { expect, test } from "@playwright/test";
import { fillJoinForm, HOST_HEADERS, resetParticipants, setAllowRename } from "./helpers";

/** 참가자 등록은 서버(메모리 저장소)에 남아 테스트끼리 공유되므로 직렬로 실행하고 매번 초기화한다. */
test.describe.configure({ mode: "serial" });

test.describe("참가자 등록", () => {
  test.beforeEach(async ({ request }) => {
    await resetParticipants(request);
    await setAllowRename(request, false);
  });

  test("등록하지 않으면 메인 화면 대신 참가자명 입력 화면이 나오고, 등록하면 유지된다", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/join");
    await expect(page.getByRole("heading", { name: "👋 참가자명을 입력해 주세요" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /교회 레크레이션 게임/ })).toHaveCount(0);

    await fillJoinForm(page, "  홍길동  ", "/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("교회 레크레이션 게임");
    // 앞뒤 공백은 지워서 저장한다
    await expect(page.getByTestId("participant-name")).toHaveText("👤 홍길동님으로 참여 중");

    await page.reload();
    await expect(page.getByTestId("participant-name")).toContainText("홍길동");

    // 게임 페이지에서도 같은 신원이 보인다
    await page.goto("/games/number-draw");
    await expect(page.getByTestId("participant-name")).toContainText("홍길동");
  });

  test("게임 주소로 바로 들어와도 먼저 등록하고, 등록 후 그 게임으로 이동한다", async ({
    page,
  }) => {
    await page.goto("/games/number-draw");
    await expect(page).toHaveURL("/join?next=%2Fgames%2Fnumber-draw");
    await fillJoinForm(page, "김은혜", "/games/number-draw");
    await expect(page.getByTestId("participant-name")).toContainText("김은혜");
  });

  test("빈 이름이나 너무 긴 이름은 등록할 수 없다", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: "참여하기" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "이름을 입력해 주세요." }),
    ).toBeVisible();

    await page.getByLabel("참가자명").fill("가".repeat(13));
    await page.getByRole("button", { name: "참여하기" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "이름은 12자 이하로 입력해 주세요." }),
    ).toBeVisible();
    await expect(page).toHaveURL("/join");
  });

  test("다른 기기는 이미 등록된 이름을 쓸 수 없고, 사회자가 해제하면 쓸 수 있다", async ({
    page,
    browser,
    request,
  }) => {
    await page.goto("/");
    await fillJoinForm(page, "이믿음", "/");

    const other = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const otherPage = await other.newPage();
    await otherPage.goto("/");
    await otherPage.getByLabel("참가자명").fill("이믿음");
    await otherPage.getByRole("button", { name: "참여하기" }).click();
    await expect(
      otherPage.getByRole("alert").filter({ hasText: "이미 다른 기기에서 등록한 이름이에요." }),
    ).toBeVisible();
    await expect(otherPage).toHaveURL("/join");

    const released = await request.delete("/api/participants", {
      headers: HOST_HEADERS,
      data: { name: "이믿음" },
    });
    expect(released.ok()).toBeTruthy();

    await otherPage.getByRole("button", { name: "참여하기" }).click();
    await expect(otherPage).toHaveURL("/");
    await expect(otherPage.getByTestId("participant-name")).toContainText("이믿음");
    await other.close();
  });

  test("이름 변경이 꺼져 있으면 상단에 변경 링크가 없고 /join 과 API 모두 막힌다", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await fillJoinForm(page, "정기쁨", "/");
    await expect(page.getByTestId("participant-name")).toContainText("정기쁨");
    await expect(page.getByRole("link", { name: "변경" })).toHaveCount(0);

    await page.goto("/join");
    await expect(page.getByRole("heading", { name: "이름은 바꿀 수 없어요" })).toBeVisible();
    await expect(page.getByLabel("참가자명")).toHaveCount(0);
    await page.getByRole("button", { name: "돌아가기" }).click();
    await expect(page).toHaveURL("/");

    // 화면을 우회해 같은 토큰으로 다른 이름을 등록하려 해도 서버가 거부한다
    const token = await page.evaluate(
      () => JSON.parse(window.localStorage.getItem("yos-game:participant") ?? "{}").token,
    );
    const attempt = await request.post("/api/participants", { data: { name: "다른이름", token } });
    expect(attempt.status()).toBe(403);
  });

  test("등록된 기기가 이름을 바꾸면 이전 이름은 풀린다", async ({ page, browser, request }) => {
    await setAllowRename(request, true);
    await page.goto("/");
    await fillJoinForm(page, "박소망", "/");

    await page.getByRole("link", { name: "변경" }).click();
    await expect(page.getByText("지금은 박소망님으로 등록되어 있어요.")).toBeVisible();
    await fillJoinForm(page, "최사랑", "/");
    await expect(page.getByTestId("participant-name")).toContainText("최사랑");

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto("/join");
    // 풀린 이전 이름은 다른 기기가 쓸 수 있다
    await fillJoinForm(otherPage, "박소망", "/");

    await otherPage.getByRole("link", { name: "변경" }).click();
    await otherPage.getByLabel("참가자명").fill("최사랑");
    await otherPage.getByRole("button", { name: "이 이름으로 바꾸기" }).click();
    await expect(
      otherPage.getByRole("alert").filter({ hasText: "이미 다른 기기에서 등록한 이름이에요." }),
    ).toBeVisible();
    // 바꾸기에 실패하면 원래 이름이 그대로 남는다
    await expect(otherPage.getByText("지금은 박소망님으로 등록되어 있어요.")).toBeVisible();
    await other.close();
  });
});
