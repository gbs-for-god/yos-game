import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import members from "../games/manito-mission/data/members.json";
import missions from "../games/manito-mission/data/missions.json";

/**
 * 이 게임의 상태는 서버(메모리 저장소)에 있어 테스트끼리 공유된다.
 * 그래서 직렬로 실행하고, 각 테스트 시작 때 사회자 권한으로 서버 상태를 초기화한다.
 */
test.describe.configure({ mode: "serial" });

const API = "/api/manito-mission/session";
const HOST_HEADERS = { "x-host-pin": members.hostPin };
const MEMBER_NAMES = [...members.participants, members.host];
const MEMBER_COUNT = MEMBER_NAMES.length;
const MISSIONS_PER_MEMBER = 3;
/** 다른 기기의 변화는 폴링(3초)으로 반영되므로 넉넉히 기다린다 */
const SYNC_TIMEOUT = 10_000;
/** 두구두구 연출(3초)보다 넉넉하게 */
const REVEAL_TIMEOUT = 10_000;

async function resetServer(request: APIRequestContext) {
  const response = await request.delete(API, { headers: HOST_HEADERS });
  expect(response.status()).toBe(204);
}

async function enterPin(page: Page, pin = members.hostPin) {
  await page.getByLabel("사회자 비밀번호").fill(pin);
  await page.getByRole("button", { name: "들어가기" }).click();
}

/** 사회자 노트북에서 게임을 시작하고 참여자 목록 화면까지 이동한다 */
async function startGame(page: Page) {
  await page.goto("/games/manito-mission");
  await page.getByRole("button", { name: "🔒 사회자 확인하고 시작하기" }).click();
  await enterPin(page);
  await page.getByRole("button", { name: "마니또 게임 시작" }).click();
  await expect(page.getByRole("heading", { name: "🔒 사회자 화면" })).toBeVisible();
  await page.getByRole("button", { name: "참여자 화면으로" }).click();
  await expect(page.getByText("이름을 눌러 내 마니또를 확인하세요")).toBeVisible();
}

async function openResult(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByText(`${name}님 맞나요?`)).toBeVisible();
  await page.getByRole("button", { name: /내 마니또 (뽑기!|다시 보기)/ }).click();
  await expect(page.getByTestId("participant-result")).toBeVisible();
}

async function openHostScreen(page: Page) {
  await page.getByRole("button", { name: "🔒 사회자 화면" }).click();
  if (await page.getByLabel("사회자 비밀번호").isVisible()) await enterPin(page);
  await expect(page.getByRole("heading", { name: "🔒 사회자 화면" })).toBeVisible();
}

/** 참여자 휴대폰 역할의 별도 브라우저 컨텍스트 */
async function openPhone(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/games/manito-mission");
  return { context, page };
}

function missionTitles(page: Page) {
  return page.getByTestId("mission-item").getByRole("heading").allInnerTexts();
}

test.describe("마니또 미션", () => {
  test.beforeEach(async ({ request }) => {
    await resetServer(request);
  });

  test("시작 전에는 대기 안내가 보이고, 사회자가 확인 후 시작하면 명단이 나타난다", async ({
    page,
  }) => {
    await page.goto("/games/manito-mission");
    await expect(page.getByText("아직 게임이 시작되지 않았어요")).toBeVisible();
    await expect(
      page.getByText(`사회자 포함 ${MEMBER_COUNT}명 · 미션 ${missions.length}개`),
    ).toBeVisible();
    expect(missions.length).toBe(20);

    await page.getByRole("button", { name: "🔒 사회자 확인하고 시작하기" }).click();
    await enterPin(page, "wrong-pin");
    await expect(page.getByText("사회자 비밀번호가 틀렸어요.")).toBeVisible();

    await enterPin(page);
    await page.getByRole("button", { name: "마니또 게임 시작" }).click();
    await expect(page.getByRole("heading", { name: "🔒 사회자 화면" })).toBeVisible();
    await expect(page.getByText("참여자 휴대폰 접속 주소:")).toBeVisible();
  });

  test("참여자가 휴대폰에서 확인하면 다른 기기(사회자 노트북)에도 확인 완료가 공유된다", async ({
    page,
    browser,
  }) => {
    await startGame(page);
    const me = members.participants[0];
    await expect(page.getByText("확인 완료 0명")).toBeVisible();

    const phone = await openPhone(browser);
    await openResult(phone.page, me);

    const manito = await phone.page.getByTestId("manito-name").innerText();
    expect(manito).not.toBe(me);
    expect(MEMBER_NAMES).toContain(manito);
    await expect(phone.page.getByTestId("mission-item")).toHaveCount(MISSIONS_PER_MEMBER);
    expect(new Set(await missionTitles(phone.page)).size).toBe(MISSIONS_PER_MEMBER);

    // 노트북 화면은 아무 조작 없이 폴링만으로 갱신되어야 한다
    await expect(page.getByText("확인 완료 1명")).toBeVisible({ timeout: SYNC_TIMEOUT });
    await expect(page.getByRole("button", { name: new RegExp(`^${me}`) })).toContainText(
      "확인 완료",
    );

    await phone.context.close();
  });

  test("다른 기기에서 같은 이름으로 보면 같은 마니또와 미션이 나오고, 새로고침해도 유지된다", async ({
    page,
    browser,
  }) => {
    await startGame(page);
    const me = members.participants[1];

    const phone = await openPhone(browser);
    await openResult(phone.page, me);
    const manitoOnPhone = await phone.page.getByTestId("manito-name").innerText();
    const titlesOnPhone = await missionTitles(phone.page);
    await phone.context.close();

    await openResult(page, me);
    await expect(page.getByTestId("manito-name")).toHaveText(manitoOnPhone);
    expect(await missionTitles(page)).toEqual(titlesOnPhone);

    await page.reload();
    await expect(page.getByText("이름을 눌러 내 마니또를 확인하세요")).toBeVisible();
    await openResult(page, me);
    await expect(page.getByTestId("manito-name")).toHaveText(manitoOnPhone);
  });

  test("사회자 화면에는 모든 배정이 중복·자기 자신 없이 표시된다", async ({ page }) => {
    await startGame(page);
    await openHostScreen(page);

    await expect(page.getByTestId("host-row")).toHaveCount(MEMBER_COUNT);
    const names = await page.getByTestId("host-row-name").allInnerTexts();
    const manitos = await page.getByTestId("host-row-manito").allInnerTexts();

    expect(new Set(manitos).size).toBe(MEMBER_COUNT);
    names.forEach((name, i) => {
      expect(manitos[i]).not.toBe(name.replace("(사회자)", "").trim());
    });
  });

  test("사회자가 미션 다시 뽑기를 누르면 해당 참여자의 확인 표시가 초기화된다", async ({
    page,
  }) => {
    await startGame(page);
    const me = members.participants[2];

    await openResult(page, me);
    await page.getByRole("button", { name: "확인했어요 (화면 닫기)" }).click();

    await openHostScreen(page);
    const row = page
      .getByTestId("host-row")
      .filter({ has: page.getByTestId("host-row-name").getByText(me, { exact: true }) });
    await expect(row).toContainText("확인 완료");

    await page.getByRole("button", { name: `${me} 미션 다시 뽑기` }).click();
    await expect(row).toContainText("미확인");
    await expect(row.getByRole("listitem")).toHaveCount(MISSIONS_PER_MEMBER);
  });

  test("전체 다시 뽑기는 확인을 거쳐야 하고, 모든 확인 표시가 초기화된다", async ({ page }) => {
    await startGame(page);
    const me = members.participants[0];

    await openResult(page, me);
    await page.getByRole("button", { name: "확인했어요 (화면 닫기)" }).click();
    await expect(page.getByText("확인 완료 1명")).toBeVisible();

    await openHostScreen(page);
    await page.getByRole("button", { name: "🔄 전체 다시 뽑기" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("정말 전체를 다시 뽑을까요?");
    await page.getByRole("button", { name: "취소" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    await page.getByRole("button", { name: "🔄 전체 다시 뽑기" }).click();
    await page.getByRole("button", { name: "네, 전체 다시 뽑기" }).click();

    await expect(page.getByText("이름을 눌러 내 마니또를 확인하세요")).toBeVisible();
    await expect(page.getByText("확인 완료 0명")).toBeVisible();
  });

  test("게임 종료 후 사회자 노트북에서 한 명씩 공개되고, 참여자 휴대폰에도 공개 결과가 공유된다", async ({
    page,
    browser,
  }) => {
    // 인원수 × (두구두구 3초 + 휴대폰 동기화 대기) 만큼 걸리므로 기본 제한(30초)을 늘린다
    test.setTimeout(MEMBER_COUNT * 15_000);

    await startGame(page);
    await openHostScreen(page);
    await page.getByRole("button", { name: "🎉 게임 종료하고 공개하기" }).click();
    await page.getByRole("button", { name: "네, 게임 종료" }).click();
    await expect(page.getByText(`마니또 공개 0 / ${MEMBER_COUNT}`)).toBeVisible();

    const phone = await openPhone(browser);
    await expect(phone.page.getByText("🎉 마니또 공개가 시작됐어요!")).toBeVisible();
    await expect(phone.page.getByRole("button", { name: "🥁 공개!" })).toHaveCount(0);

    const revealed: string[] = [];
    for (let i = 0; i < MEMBER_COUNT; i++) {
      const name = MEMBER_NAMES[i];
      await expect(page.getByRole("heading", { name: `${name}님의 마니또는?` })).toBeVisible();
      await page.getByRole("button", { name: "🥁 공개!" }).click();
      await expect(page.getByText("두구두구두구...")).toBeVisible();
      await expect(page.getByTestId("revealed-manito")).toBeVisible({ timeout: REVEAL_TIMEOUT });

      const manito = await page.getByTestId("revealed-manito").innerText();
      expect(manito).not.toBe(name);
      revealed.push(manito);

      if (i === 1) {
        // 중간에 새로고침해도 공개 단계·진행 상황·사회자 권한이 유지되어야 한다
        await page.reload();
        await expect(page.getByText(`마니또 공개 ${i} / ${MEMBER_COUNT}`)).toBeVisible();
        await page.getByRole("button", { name: "🥁 공개!" }).click();
        await expect(page.getByTestId("revealed-manito")).toHaveText(manito, {
          timeout: REVEAL_TIMEOUT,
        });
      }

      const isLast = i === MEMBER_COUNT - 1;
      await page.getByRole("button", { name: isLast ? "공개 마치기" : "다음 사람 →" }).click();

      if (!isLast) {
        // 휴대폰은 방금 공개된 결과를 폴링으로 받아 보여 준다
        await expect(phone.page.getByTestId("last-revealed-manito")).toHaveText(manito, {
          timeout: SYNC_TIMEOUT,
        });
      }
    }

    expect(new Set(revealed).size).toBe(MEMBER_COUNT);
    await expect(page.getByRole("heading", { name: "🎉 모두 공개했어요!" })).toBeVisible();
    await expect(phone.page.getByRole("heading", { name: "🎉 모두 공개했어요!" })).toBeVisible({
      timeout: SYNC_TIMEOUT,
    });

    await phone.context.close();
  });
});
