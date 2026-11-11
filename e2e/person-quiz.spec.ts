import { expect, test, type Page } from "@playwright/test";
import people from "../games/person-quiz/data/people.json";
import { GROUP_SIZE, resetAll, shuffle, validatePeople } from "../games/person-quiz/logic";
import { HOST_PIN, randomName, seedIdentity } from "./helpers";

const STATE_KEY = "yos-game:person-quiz:state";

type Stored = { open: number | null; groups: { ids: string[]; checked: boolean }[] };

async function stored(page: Page): Promise<Stored> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "null"), STATE_KEY);
}

async function login(page: Page) {
  await page.goto("/games/person-quiz");
  await page.getByLabel("사회자 비밀번호").fill(HOST_PIN);
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page.getByRole("heading", { name: "🧑‍🤝‍🧑 제자를 선택하세요" })).toBeVisible();
}

test.describe("인물 맞추기", () => {
  test.beforeEach(async ({ page }) => {
    await seedIdentity(page.context(), { name: randomName(), token: crypto.randomUUID() });
  });

  test("인물 데이터는 120명이고 사진이 없어도 자리표시 이미지가 나온다", async ({ page }) => {
    expect(validatePeople(people)).toBeNull();
    expect(validatePeople(people.slice(1))).not.toBeNull();

    await login(page);
    await page.getByTestId("disciple-peter").click();
    const image = page.getByRole("img").first();
    await expect(image).toBeVisible();
    // 실제 사진 파일이 없는 환경에서도 자리표시 이미지(SVG)로 바뀐다
    await expect(image).toHaveAttribute("src", /^data:image\/svg\+xml/);
  });

  test("사회자 로그인 전에는 게임이 보이지 않는다", async ({ page }) => {
    await page.goto("/games/person-quiz");
    await expect(page.getByRole("heading", { name: "🔒 사회자 로그인" })).toBeVisible();
    await expect(page.getByTestId("disciple-peter")).toHaveCount(0);
  });

  test("12제자 카드를 고르고 단축키로 10장을 넘기며 이름을 공개/가리고, 결과 확인까지 하면 카드에 표시된다", async ({
    page,
  }) => {
    await login(page);
    await expect(page.locator("[data-testid^='disciple-']")).toHaveCount(12);
    await expect(page.getByTestId("checked-count")).toContainText("0 / 12");

    await page.getByTestId("disciple-john").click();
    await expect(page.getByTestId("group-name")).toContainText("요한");
    await expect(page.getByTestId("progress")).toHaveText("1 / 10");
    await expect(page.getByTestId("answer-name")).toHaveText("? ? ?");

    const ids = (await stored(page)).groups[3].ids;
    const nameOf = (id: string) => people.find((p) => p.id === id)!.name;

    // Space: 공개/가리기 토글 (버튼에 포커스가 있어도 한 번만 바뀐다)
    await page.keyboard.press("Space");
    await expect(page.getByTestId("answer-name")).toHaveText(nameOf(ids[0]));
    await page.keyboard.press("Space");
    await expect(page.getByTestId("answer-name")).toHaveText("? ? ?");
    await page.getByRole("button", { name: /이름 공개/ }).click();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("answer-name")).toHaveText("? ? ?");

    // →/Enter 다음, ← 이전. 사진마다 공개 여부가 따로 기억된다
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("progress")).toHaveText("2 / 10");
    await expect(page.getByTestId("answer-name")).toHaveText("? ? ?");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("progress")).toHaveText("1 / 10");
    await expect(page.getByTestId("answer-name")).toHaveText(nameOf(ids[0]));
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("progress")).toHaveText("1 / 10");

    // 새로고침해도 같은 자리에서 이어진다
    await page.keyboard.press("Enter");
    await page.reload();
    await expect(page.getByTestId("progress")).toHaveText("2 / 10");

    // Esc: 메인으로. 진행 중 표시가 보이고 다시 들어가면 이어서 한다
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("disciple-john")).toContainText("진행 중 · 2 / 10");
    await page.getByTestId("disciple-john").click();
    await expect(page.getByTestId("progress")).toHaveText("2 / 10");

    // 끝까지 넘기면 게임 종료 안내
    for (let i = 0; i < GROUP_SIZE - 1; i++) await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "🏁 게임 종료" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("progress")).toHaveText("10 / 10");
    await page.keyboard.press("ArrowRight");

    // 결과 확인: 10장의 사진과 정답 이름을 한눈에 본다
    await page.getByRole("button", { name: "📋 결과 확인" }).click();
    const grid = page.getByTestId("results-grid");
    await expect(grid.getByRole("listitem")).toHaveCount(10);
    for (const [i, id] of ids.entries())
      await expect(grid.getByRole("listitem").nth(i)).toContainText(nameOf(id));

    await page.getByRole("button", { name: "🏠 목록으로 돌아가기" }).click();
    await expect(page.getByTestId("disciple-john")).toHaveAttribute("data-checked", "true");
    await expect(page.getByTestId("disciple-john")).toContainText("결과 확인 완료");
    await expect(page.getByTestId("disciple-peter")).toHaveAttribute("data-checked", "false");
    await expect(page.getByTestId("checked-count")).toContainText("1 / 12");
  });

  test("전체 리셋은 확인을 거쳐 120장을 다시 섞어 재분배하고 진행을 모두 지운다", async ({
    page,
  }) => {
    await login(page);
    // 한 제자를 끝까지 진행해 결과 확인 표시를 만든다 (저장은 첫 조작부터 시작된다)
    await page.getByTestId("disciple-peter").click();
    const before = await stored(page);
    // 처음에는 데이터 순서대로 10장씩
    expect(before.groups[0].ids).toEqual(people.slice(0, 10).map((p) => p.id));
    for (let i = 0; i < GROUP_SIZE; i++) await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "📋 결과 확인" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("checked-count")).toContainText("1 / 12");

    await page.getByRole("button", { name: "🔀 전체 데이터 리셋(셔플)" }).click();
    await page.getByRole("button", { name: "취소" }).click();
    expect((await stored(page)).groups[0].checked).toBe(true);

    await page.getByRole("button", { name: "🔀 전체 데이터 리셋(셔플)" }).click();
    await page.getByRole("button", { name: "정말 리셋" }).click();
    await expect(page.getByTestId("checked-count")).toContainText("0 / 12");

    const after = await stored(page);
    const flat = after.groups.flatMap((g) => g.ids);
    expect(flat).toHaveLength(120);
    expect(new Set(flat).size).toBe(120);
    expect(after.groups.every((g) => g.ids.length === GROUP_SIZE && !g.checked)).toBe(true);
    expect(flat).not.toEqual(before.groups.flatMap((g) => g.ids));
  });

  test("셔플은 모든 원소를 그대로 유지하고, 같은 난수면 같은 결과다", () => {
    const seq = () => {
      let n = 0;
      return () => (n = (n * 9301 + 49297) % 233280 || 7) / 233280;
    };
    const items = Array.from({ length: 120 }, (_, i) => i);
    const a = shuffle(items, seq());
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(a).toEqual(shuffle(items, seq()));
    expect(items[0]).toBe(0);

    const state = resetAll(people, seq());
    expect(state.groups.flatMap((g) => g.ids).sort()).toEqual(people.map((p) => p.id).sort());
  });
});
