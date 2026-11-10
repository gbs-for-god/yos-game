import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import missions from "../games/manito-mission/data/missions.json";
import {
  fillJoinForm,
  HOST_HEADERS,
  HOST_PIN,
  registerViaApi,
  resetParticipants,
  seedIdentity,
  type Identity,
} from "./helpers";

/**
 * 이 게임의 상태(배정·확인·참가자 등록)는 서버(메모리 저장소)에 있어 테스트끼리 공유된다.
 * 그래서 직렬로 실행하고, 각 테스트 시작 때 사회자 권한으로 서버 상태를 초기화한다.
 * 게임 멤버는 "시작할 때 등록된 참가자 전체"이므로 참가자를 먼저 등록한 뒤 시작한다.
 */
test.describe.configure({ mode: "serial" });

const GAME_URL = "/games/manito-mission";
const API = "/api/manito-mission/session";
/** 사회자 노트북(프로젝터)에 등록하는 이름. 공개 순서 맨 마지막이 된다 */
const HOST_NAME = "진행자";
/** 미리 등록해 두는 참가자(휴대폰). 공개 순서는 가나다순 */
const PLAYERS = ["홍길동", "김은혜", "이믿음", "박소망", "최사랑"];
const MEMBER_NAMES = [...[...PLAYERS].sort((a, b) => a.localeCompare(b, "ko")), HOST_NAME];
const MEMBER_COUNT = MEMBER_NAMES.length;
const MISSIONS_PER_MEMBER = 3;
/** 다른 기기의 변화는 폴링(평소 10초, 공개 단계 5초)으로 반영되므로 넉넉히 기다린다 */
const SYNC_TIMEOUT = 20_000;
/** 두구두구 연출(3초)보다 넉넉하게 */
const REVEAL_TIMEOUT = 10_000;

/** 테스트마다 새로 등록한 참가자들의 신원 (휴대폰 역할 컨텍스트에 심는다) */
let players: Record<string, Identity> = {};

async function resetServer(request: APIRequestContext) {
  const response = await request.delete(API, { headers: HOST_HEADERS });
  expect(response.status()).toBe(204);
  await resetParticipants(request);
}

async function registerPlayers(request: APIRequestContext) {
  players = {};
  for (const name of PLAYERS) players[name] = await registerViaApi(request, name);
}

async function enterPin(page: Page, pin = HOST_PIN) {
  await page.getByLabel("사회자 비밀번호").fill(pin);
  await page.getByRole("button", { name: "들어가기" }).click();
}

/** 사회자 노트북이 게임 주소로 들어와 참가자명(진행자)을 등록한다 */
async function openLaptop(page: Page) {
  await page.goto(GAME_URL);
  await expect(page).toHaveURL(/\/join\?next=/);
  await fillJoinForm(page, HOST_NAME, GAME_URL);
}

/** 사회자 노트북(프로젝터)에서 게임을 시작하고 참여자 쪽 화면으로 돌아온다 */
async function startGame(page: Page) {
  await openLaptop(page);
  await page.getByRole("button", { name: "🔒 사회자 확인하고 시작하기" }).click();
  await enterPin(page);
  await page.getByRole("button", { name: "마니또 게임 시작" }).click();
  await expect(page.getByRole("heading", { name: "🔒 사회자 화면" })).toBeVisible();
  await page.getByRole("button", { name: "참여자 화면으로" }).click();
  // 노트북도 진행자 이름으로 참가자 등록을 했으므로 참여자 화면이 보인다
  await expect(page.getByRole("heading", { name: `${HOST_NAME}님, 반가워요!` })).toBeVisible();
}

async function openHostScreen(page: Page) {
  await page.getByRole("button", { name: "🔒 사회자 화면" }).click();
  if (await page.getByLabel("사회자 비밀번호").isVisible()) await enterPin(page);
  await expect(page.getByRole("heading", { name: "🔒 사회자 화면" })).toBeVisible();
}

/** 참여자 휴대폰 역할의 별도 브라우저 컨텍스트. 미리 등록해 둔 신원으로 게임 화면에 들어간다 */
async function openPhone(browser: Browser, identity?: Identity) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  if (identity) await seedIdentity(context, identity);
  const page = await context.newPage();
  await page.goto(GAME_URL);
  return { context, page };
}

async function viewMine(page: Page) {
  await page.getByRole("button", { name: /내 마니또 (뽑기!|다시 보기)/ }).click();
  await expect(page.getByTestId("participant-result")).toBeVisible();
}

function missionTitles(page: Page) {
  return page.getByTestId("mission-item").getByRole("heading").allInnerTexts();
}

function hostRow(page: Page, name: string) {
  return page.getByTestId("host-row").filter({
    has: page.getByTestId("host-row-name").getByText(new RegExp(`^${name}(\\(사회자\\))?$`)),
  });
}

test.describe("마니또 미션", () => {
  test.beforeEach(async ({ request }) => {
    await resetServer(request);
  });

  test("시작 전에는 등록 인원이 보이고, 2명 이상 등록되어야 사회자가 시작할 수 있다", async ({
    page,
    request,
  }) => {
    expect(missions.length).toBe(20);
    await openLaptop(page);
    await expect(page.getByText("아직 게임이 시작되지 않았어요")).toBeVisible();
    await expect(page.getByText(`등록 1명 · 미션 ${missions.length}개`)).toBeVisible();

    await page.getByRole("button", { name: "🔒 사회자 확인하고 시작하기" }).click();
    await enterPin(page, "wrong-pin");
    await expect(page.getByText("사회자 비밀번호가 틀렸어요.")).toBeVisible();

    await enterPin(page);
    await expect(page.getByText("참가자가 최소 2명 등록되어야 시작할 수 있어요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "마니또 게임 시작" })).toBeDisabled();

    // 참가자가 등록되면 (새로고침해도 사회자 권한은 유지) 시작할 수 있다
    await registerPlayers(request);
    await page.reload();
    await expect(page.getByText(`등록 ${MEMBER_COUNT}명 · 미션`)).toBeVisible();
    await expect(page.getByTestId("registered-names")).toContainText(PLAYERS[0]);
    await page.getByRole("button", { name: "마니또 게임 시작" }).click();
    // 새로고침으로 사회자 화면 모드는 풀렸지만 비밀번호는 탭에 남아 있어 바로 참여자 화면이 보인다
    await expect(page.getByRole("heading", { name: `${HOST_NAME}님, 반가워요!` })).toBeVisible();
    await openHostScreen(page);
    await expect(page.getByText("참여자 등록 주소:")).toBeVisible();
  });

  test("등록한 휴대폰에서 확인하면 노트북에도 확인 완료가 공유되고, 미등록 기기는 볼 수 없다", async ({
    page,
    browser,
    request,
  }) => {
    await registerPlayers(request);
    await startGame(page);
    const me = PLAYERS[0];
    await expect(page.getByText(`참여 ${MEMBER_COUNT}명 · 확인 완료 0명`)).toBeVisible();

    const phone = await openPhone(browser, players[me]);
    await expect(phone.page.getByRole("heading", { name: `${me}님, 반가워요!` })).toBeVisible();
    await viewMine(phone.page);

    const manito = await phone.page.getByTestId("manito-name").innerText();
    expect(manito).not.toBe(me);
    expect(MEMBER_NAMES).toContain(manito);
    await expect(phone.page.getByTestId("mission-item")).toHaveCount(MISSIONS_PER_MEMBER);
    expect(new Set(await missionTitles(phone.page)).size).toBe(MISSIONS_PER_MEMBER);

    // 노트북 화면은 아무 조작 없이 폴링만으로 갱신되어야 한다
    await expect(page.getByText("확인 완료 1명")).toBeVisible({ timeout: SYNC_TIMEOUT });

    // 등록하지 않은 기기는 게임 화면 대신 참가자명 입력 화면으로 간다
    const stranger = await openPhone(browser);
    await expect(stranger.page).toHaveURL(/\/join\?next=/);
    await expect(stranger.page.getByRole("button", { name: /내 마니또/ })).toHaveCount(0);

    await stranger.context.close();
    await phone.context.close();
  });

  test("휴대폰을 껐다 켜거나(새로고침) 다시 접속해도 같은 사람의 같은 결과가 나온다", async ({
    page,
    browser,
    request,
  }) => {
    await registerPlayers(request);
    await startGame(page);
    const me = PLAYERS[1];

    const phone = await openPhone(browser, players[me]);
    await viewMine(phone.page);
    const manito = await phone.page.getByTestId("manito-name").innerText();
    const titles = await missionTitles(phone.page);

    await phone.page.reload();
    await expect(phone.page.getByTestId("participant-name")).toContainText(me);
    await expect(phone.page.getByRole("button", { name: "내 마니또 다시 보기" })).toBeVisible();
    await viewMine(phone.page);
    await expect(phone.page.getByTestId("manito-name")).toHaveText(manito);
    expect(await missionTitles(phone.page)).toEqual(titles);

    // 다른 기기는 같은 이름으로 등록할 수 없다
    const other = await openPhone(browser);
    await other.page.getByLabel("참가자명").fill(me);
    await other.page.getByRole("button", { name: "참여하기" }).click();
    await expect(
      other.page.getByRole("alert").filter({ hasText: "이미 다른 기기에서 등록한 이름이에요." }),
    ).toBeVisible();

    await other.context.close();
    await phone.context.close();
  });

  test("사회자 화면에는 등록된 모든 사람의 배정이 중복·자기 자신 없이 표시된다", async ({
    page,
    request,
  }) => {
    await registerPlayers(request);
    await startGame(page);

    await openHostScreen(page);
    await expect(page.getByTestId("host-row")).toHaveCount(MEMBER_COUNT);
    const names = await page.getByTestId("host-row-name").allInnerTexts();
    expect(names.map((name) => name.replace("(사회자)", "").trim())).toEqual(MEMBER_NAMES);
    // 사회자는 공개 순서 맨 마지막이고 "(사회자)" 표시가 붙는다
    await expect(page.getByTestId("host-row").last()).toContainText(`${HOST_NAME}(사회자)`);

    const manitos = await page.getByTestId("host-row-manito").allInnerTexts();
    expect(new Set(manitos).size).toBe(MEMBER_COUNT);
    names.forEach((name, i) => {
      expect(manitos[i]).not.toBe(name.replace("(사회자)", "").trim());
    });
    for (const name of MEMBER_NAMES) {
      await expect(hostRow(page, name).getByTestId("host-row-device")).toHaveText("📱 등록됨");
    }
  });

  test("게임 시작 뒤 등록한 사람은 배정이 없고, 전체 다시 뽑기를 하면 포함된다", async ({
    page,
    browser,
    request,
  }) => {
    await registerPlayers(request);
    await startGame(page);

    const late = await openPhone(browser);
    await fillJoinForm(late.page, "늦은사람", GAME_URL);
    await expect(
      late.page.getByText("게임이 시작된 뒤에 등록해서 이번 배정에 없어요."),
    ).toBeVisible();
    await expect(late.page.getByRole("button", { name: "내 마니또 뽑기!" })).toBeDisabled();

    await openHostScreen(page);
    await expect(page.getByText("게임을 시작한 뒤 참가자 등록이 바뀌었어요.")).toBeVisible();
    await page.getByRole("button", { name: "🔄 전체 다시 뽑기" }).click();
    await page.getByRole("button", { name: "네, 전체 다시 뽑기" }).click();
    await expect(page.getByText(`참여 ${MEMBER_COUNT + 1}명 · 확인 완료 0명`)).toBeVisible();

    await expect(late.page.getByRole("button", { name: "내 마니또 뽑기!" })).toBeEnabled({
      timeout: SYNC_TIMEOUT,
    });
    await late.context.close();
  });

  test("사회자가 기기 초기화를 누르면 그 휴대폰은 같은 이름을 다시 입력해 이어서 참여한다", async ({
    page,
    browser,
    request,
  }) => {
    await registerPlayers(request);
    await startGame(page);
    const me = PLAYERS[2];
    const phone = await openPhone(browser, players[me]);
    await viewMine(phone.page);
    const manito = await phone.page.getByTestId("manito-name").innerText();
    await phone.page.getByRole("button", { name: "확인했어요 (화면 닫기)" }).click();

    await openHostScreen(page);
    await page.getByRole("button", { name: `${me} 기기 초기화` }).click();
    await expect(hostRow(page, me).getByTestId("host-row-device")).toHaveText("⬜ 미등록");

    await expect(
      phone.page.getByRole("heading", { name: "이 기기의 등록이 해제되었어요" }),
    ).toBeVisible({ timeout: SYNC_TIMEOUT });
    await phone.page.getByRole("link", { name: "👋 참여자 등록", exact: true }).click();
    await fillJoinForm(phone.page, me, GAME_URL);
    await viewMine(phone.page);
    await expect(phone.page.getByTestId("manito-name")).toHaveText(manito);
    await phone.context.close();
  });

  test("사회자가 미션 다시 뽑기를 누르면 해당 참여자의 확인 표시가 초기화된다", async ({
    page,
    browser,
    request,
  }) => {
    await registerPlayers(request);
    await startGame(page);
    const me = PLAYERS[2];
    const phone = await openPhone(browser, players[me]);
    await viewMine(phone.page);
    await phone.context.close();

    await openHostScreen(page);
    const row = hostRow(page, me);
    await expect(row).toContainText("확인 완료");

    await page.getByRole("button", { name: `${me} 미션 다시 뽑기` }).click();
    await expect(row).toContainText("미확인");
    await expect(row.getByRole("listitem")).toHaveCount(MISSIONS_PER_MEMBER);
  });

  test("전체 다시 뽑기는 확인을 거쳐야 하고, 모든 확인 표시가 초기화된다", async ({
    page,
    browser,
    request,
  }) => {
    await registerPlayers(request);
    await startGame(page);
    const phone = await openPhone(browser, players[PLAYERS[0]]);
    await viewMine(phone.page);
    await phone.context.close();
    await expect(page.getByText("확인 완료 1명")).toBeVisible({ timeout: SYNC_TIMEOUT });

    await openHostScreen(page);
    await page.getByRole("button", { name: "🔄 전체 다시 뽑기" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("정말 전체를 다시 뽑을까요?");
    await page.getByRole("button", { name: "취소" }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    await page.getByRole("button", { name: "🔄 전체 다시 뽑기" }).click();
    await page.getByRole("button", { name: "네, 전체 다시 뽑기" }).click();
    await expect(page.getByText("확인 완료 0명")).toBeVisible();
  });

  test("게임 종료 후 사회자 노트북에서 한 명씩 공개되고, 참여자 휴대폰에도 공개 결과가 공유된다", async ({
    page,
    browser,
    request,
  }) => {
    // 인원수 × (두구두구 3초 + 휴대폰 동기화 대기) 만큼 걸리므로 기본 제한(30초)을 늘린다
    test.setTimeout(MEMBER_COUNT * 20_000);

    await registerPlayers(request);
    await startGame(page);
    await openHostScreen(page);
    await page.getByRole("button", { name: "🎉 게임 종료하고 공개하기" }).click();
    await page.getByRole("button", { name: "네, 게임 종료" }).click();
    await expect(page.getByText(`마니또 공개 0 / ${MEMBER_COUNT}`)).toBeVisible();

    // 공개 화면은 사회자가 아닌 모든 기기에 보이지만 공개 버튼은 없다
    const phone = await openPhone(browser, players[PLAYERS[0]]);
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
