import { expect, test, type Page } from "@playwright/test";
import songs from "../games/kpop-quiz/data/songs.json";
import { HOST_PIN, randomName, seedIdentity } from "./helpers";

/**
 * 진짜 YouTube 를 쓰면 네트워크·영상 상태에 따라 테스트가 흔들리므로,
 * YouTube IFrame API 스크립트를 가짜 플레이어로 바꿔치기한다.
 * 가짜 플레이어는 받은 명령을 window.__yt.calls 에 기록하고 재생 시간을 시계로 흉내 낸다.
 */
const FAKE_YT_API = `
window.__yt = { calls: [] };
window.YT = {
  Player: function (el, opts) {
    var playing = false, base = 0, startedAt = 0, videoId = null, self = this;
    function now() { return base + (playing ? (Date.now() - startedAt) / 1000 : 0); }
    function emit(state) { opts.events.onStateChange({ data: state }); }
    this.cueVideoById = function (o) {
      window.__yt.calls.push(["cue", o.videoId, o.startSeconds]);
      videoId = o.videoId; base = o.startSeconds || 0; playing = false; emit(5);
    };
    this.playVideo = function () {
      window.__yt.calls.push(["play"]); if (!playing) { startedAt = Date.now(); playing = true; } emit(1);
    };
    this.pauseVideo = function () {
      window.__yt.calls.push(["pause"]); if (playing) { base = now(); playing = false; } emit(2);
    };
    this.seekTo = function (s) { window.__yt.calls.push(["seek", s]); base = s; startedAt = Date.now(); };
    this.getCurrentTime = now;
    this.destroy = function () {};
    var box = document.createElement("div");
    box.setAttribute("data-testid", "fake-player");
    el.replaceWith(box);
    setTimeout(function () { opts.events.onReady(); }, 0);
  },
};
setTimeout(function () { window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 0);
`;

type Call = [string, ...unknown[]];

async function setup(page: Page) {
  // 구간 듣기 타이머를 실제로 기다리지 않고 시계를 앞으로 돌려 검증한다
  await page.clock.install();
  await seedIdentity(page.context(), { name: randomName(), token: crypto.randomUUID() });
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({ contentType: "text/javascript", body: FAKE_YT_API }),
  );
}

const calls = (page: Page) =>
  page.evaluate(() => (window as never as { __yt: { calls: Call[] } }).__yt.calls);
const names = async (page: Page) => (await calls(page)).map((c) => c[0]);

async function login(page: Page) {
  await page.goto("/games/kpop-quiz");
  await page.getByLabel("사회자 비밀번호").fill(HOST_PIN);
  await page.getByRole("button", { name: "들어가기" }).click();
  await expect(page.getByTestId("progress")).toContainText(`문제 1 / ${songs.length}`);
  await expect(page.getByRole("button", { name: "▶ 재생" })).toBeEnabled();
}

test.describe("K-pop 노래 맞추기", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test("사회자가 로그인해야만 진행할 수 있고, 로그인 전에는 곡 정보가 보이지 않는다", async ({
    page,
  }) => {
    await page.goto("/games/kpop-quiz");
    await expect(page.getByRole("heading", { name: "🔒 사회자 로그인" })).toBeVisible();
    await expect(page.getByTestId("progress")).toHaveCount(0);
    for (const song of songs) await expect(page.getByText(song.title)).toHaveCount(0);

    await page.getByLabel("사회자 비밀번호").fill("wrong-pin");
    await page.getByRole("button", { name: "들어가기" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "사회자 비밀번호가 틀렸어요." }),
    ).toBeVisible();
    await expect(page.getByTestId("progress")).toHaveCount(0);

    await page.getByLabel("사회자 비밀번호").fill(HOST_PIN);
    await page.getByRole("button", { name: "들어가기" }).click();
    await expect(page.getByTestId("progress")).toBeVisible();

    // 새로고침해도 로그인이 유지되고, 로그아웃하면 다시 잠긴다
    await page.reload();
    await expect(page.getByTestId("progress")).toBeVisible();
    await page.getByRole("button", { name: "🔒 로그아웃" }).click();
    await expect(page.getByRole("heading", { name: "🔒 사회자 로그인" })).toBeVisible();
  });

  test("정답 공개 전에는 곡 정보 없이 소리만 나오고, 공개하면 가수·곡명이 보인다", async ({
    page,
  }) => {
    await login(page);
    const first = songs[0];

    // 블라인드: 가리개가 덮여 있고 가수·곡명은 화면 어디에도 없다
    await expect(page.getByTestId("blind-cover")).toBeVisible();
    await expect(page.getByText(first.title)).toHaveCount(0);
    await expect(page.getByText(first.artist)).toHaveCount(0);
    await expect(page.getByTestId("answer-title")).toHaveCount(0);

    // 소리 재생은 정답 공개 전에도 된다
    await page.getByRole("button", { name: "▶ 재생" }).click();
    await expect(page.getByRole("button", { name: "⏸ 일시정지" })).toBeVisible();
    await expect(page.getByTestId("stage-status")).toHaveText("🔊 재생 중");
    expect(await names(page)).toContain("play");

    await page.getByRole("button", { name: "🎉 정답 공개" }).click();
    await expect(page.getByTestId("blind-cover")).toHaveCount(0);
    await expect(page.getByTestId("answer-title")).toHaveText(first.title);
    await expect(page.getByTestId("answer-artist")).toHaveText(first.artist);
    await expect(page.getByRole("button", { name: "✅ 정답 공개됨" })).toBeDisabled();
  });

  test("앞부분 1초·3초 듣기는 문제 시작 지점부터 정해진 시간만 재생하고 멈춘다", async ({
    page,
  }) => {
    await login(page);

    await page.getByRole("button", { name: "🎯 앞부분 1초 듣기" }).click();
    await expect(page.getByTestId("stage-status")).toHaveText("🔊 앞부분 1초 듣는 중");
    await page.clock.runFor(1200);
    const afterOne = await calls(page);
    expect(afterOne.slice(-3).map((c) => c[0])).toEqual(["seek", "play", "pause"]);
    expect(afterOne.slice(-3)[0][1]).toBe(songs[0].startTime ?? 0);
    await expect(page.getByTestId("stage-status")).toHaveText("⏸ 일시정지");

    await page.getByRole("button", { name: "🎯 앞부분 3초 듣기" }).click();
    await expect(page.getByTestId("stage-status")).toHaveText("🔊 앞부분 3초 듣는 중");
    // 3초가 지나기 전에는 멈추지 않고, 지나면 멈춘다
    await page.clock.runFor(1500);
    expect((await names(page)).filter((n) => n === "pause")).toHaveLength(1);
    await page.clock.runFor(2000);
    expect((await names(page)).filter((n) => n === "pause")).toHaveLength(2);
    await expect(page.getByTestId("stage-status")).toHaveText("⏸ 일시정지");

    // 전체 재생은 시작 지점부터 계속 재생한다 (스스로 멈추지 않는다)
    await page.getByRole("button", { name: "🎼 전체 재생" }).click();
    await expect(page.getByTestId("stage-status")).toHaveText("🔊 재생 중");
    await page.clock.runFor(10_000);
    expect((await names(page)).filter((n) => n === "pause")).toHaveLength(2);
    await expect(page.getByTestId("stage-status")).toHaveText("🔊 재생 중");
  });

  test("코러스 듣기는 곡마다 정해 둔 코러스 지점부터 15초만 재생하고 멈춘다", async ({ page }) => {
    await login(page);
    const chorusStart = songs[0].chorusStart;
    expect(chorusStart).toBeGreaterThan(0);
    const chorusButton = page.getByRole("button", { name: "🎤 코러스 15초 듣기" });
    await expect(chorusButton).toBeEnabled();

    await chorusButton.click();
    await expect(page.getByTestId("stage-status")).toHaveText("🔊 코러스 구간 듣는 중");
    // 문제 시작 지점이 아니라 코러스 지점으로 이동해서 재생한다
    expect((await calls(page)).slice(-2)).toEqual([["seek", chorusStart], ["play"]]);

    // 15초가 지나기 전에는 멈추지 않고, 지나면 멈춘다
    await page.clock.runFor(10_000);
    expect(await names(page)).not.toContain("pause");
    await page.clock.runFor(6000);
    expect((await names(page)).filter((n) => n === "pause")).toHaveLength(1);
    await expect(page.getByTestId("stage-status")).toHaveText("⏸ 일시정지");

    // 다른 곡으로 가면 그 곡의 코러스 지점을 쓴다
    await page.keyboard.press("ArrowRight");
    await chorusButton.click();
    expect((await calls(page)).slice(-2)).toEqual([["seek", songs[1].chorusStart], ["play"]]);
  });

  test("한 번 공개한 정답은 곡을 옮기거나 새로고침해도 계속 공개 상태로 유지된다", async ({
    page,
  }) => {
    await login(page);
    await expect(page.getByRole("button", { name: "⏮ 이전 곡" })).toBeDisabled();

    await page.getByRole("button", { name: "🎉 정답 공개" }).click();
    await expect(page.getByTestId("answer-title")).toHaveText(songs[0].title);
    await expect(page.getByTestId("progress")).toContainText("공개 1곡");

    // 다른 곡은 공개하지 않았으면 가려진 채로, 그 곡의 영상이 준비된다
    await page.getByRole("button", { name: "다음 곡 ⏭" }).click();
    await expect(page.getByTestId("progress")).toContainText(`문제 2 / ${songs.length}`);
    await expect(page.getByTestId("blind-cover")).toBeVisible();
    await expect(page.getByTestId("answer-title")).toHaveCount(0);
    expect((await calls(page)).filter((c) => c[0] === "cue").at(-1)?.[1]).toBe(songs[1].youtubeId);

    // 돌아오면 이미 공개한 곡은 계속 공개되어 있다
    await page.getByRole("button", { name: "⏮ 이전 곡" }).click();
    await expect(page.getByTestId("progress")).toContainText(`문제 1 / ${songs.length}`);
    await expect(page.getByTestId("blind-cover")).toHaveCount(0);
    await expect(page.getByTestId("answer-title")).toHaveText(songs[0].title);
    await expect(page.getByRole("button", { name: "✅ 정답 공개됨" })).toBeDisabled();

    // 새로고침(브라우저를 껐다 켜도)해도 공개 상태와 현재 곡이 그대로다
    await page.getByRole("button", { name: "다음 곡 ⏭" }).click();
    await page.getByRole("button", { name: "🎉 정답 공개" }).click();
    await page.reload();
    await expect(page.getByTestId("progress")).toContainText(`문제 2 / ${songs.length}`);
    await expect(page.getByTestId("progress")).toContainText("공개 2곡");
    await expect(page.getByTestId("answer-title")).toHaveText(songs[1].title);
    await page.getByRole("button", { name: "⏮ 이전 곡" }).click();
    await expect(page.getByTestId("answer-title")).toHaveText(songs[0].title);
  });

  test("사회자 메뉴의 게임 초기화는 공개한 정답을 모두 가리고 곡 순서를 섞는다", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: "🎉 정답 공개" }).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("progress")).toContainText("공개 2곡");

    const readState = () =>
      page.evaluate(
        () =>
          JSON.parse(window.localStorage.getItem("yos-game:kpop-quiz:state") ?? "null") as {
            order: string[];
            index: number;
            revealed: string[];
          },
      );
    const before = await readState();
    expect(before.revealed).toHaveLength(2);

    // 사회자 메뉴에서 초기화 (비밀번호는 이 탭에 기억되어 있어 바로 열린다)
    await page.goto("/host");
    await expect(page.getByTestId("kpop-host-status")).toHaveText(
      `전체 ${songs.length}곡 · 공개한 곡 2곡`,
    );
    await page.getByRole("button", { name: "K-pop 노래 맞추기 초기화" }).click();
    await expect(page.getByRole("status")).toContainText("공개했던 2곡을 다시 가리고");
    await expect(page.getByTestId("kpop-host-status")).toHaveText(
      `전체 ${songs.length}곡 · 공개한 곡 0곡`,
    );

    // 같은 곡들이 다른 순서로, 처음 곡부터, 공개 없이 저장된다
    const after = await readState();
    expect(after.revealed).toEqual([]);
    expect(after.index).toBe(0);
    expect([...after.order].sort()).toEqual([...before.order].sort());
    expect(after.order).not.toEqual(before.order);

    // 게임으로 돌아가면 모두 가려진 채 처음 곡이다
    await page.goto("/games/kpop-quiz");
    await expect(page.getByTestId("progress")).toContainText(`문제 1 / ${songs.length}`);
    await expect(page.getByTestId("progress")).toContainText("공개 0곡");
    await expect(page.getByTestId("blind-cover")).toBeVisible();
    await expect(page.getByTestId("answer-title")).toHaveCount(0);
    expect((await calls(page)).filter((c) => c[0] === "cue").at(-1)?.[1]).toBe(
      songs.find((song) => song.id === after.order[0])?.youtubeId,
    );
  });

  test("키보드 단축키: Space 재생/정지, Enter 정답 공개, 방향키 이전/다음 곡", async ({ page }) => {
    await login(page);

    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "⏸ 일시정지" })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "▶ 재생" })).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("progress")).toContainText(`문제 2 / ${songs.length}`);

    await page.keyboard.press("Enter");
    await expect(page.getByTestId("answer-title")).toHaveText(songs[1].title);

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("progress")).toContainText(`문제 1 / ${songs.length}`);
    await expect(page.getByTestId("answer-title")).toHaveCount(0);

    // 공개한 곡으로 돌아오면 계속 공개되어 있다
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("answer-title")).toHaveText(songs[1].title);
    await page.keyboard.press("ArrowLeft");

    // 단축키는 포커스된 버튼을 따로 누르지 않는다 (Space 로 재생/정지만 일어난다)
    await page.getByRole("button", { name: "🎉 정답 공개" }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "⏸ 일시정지" })).toBeVisible();
    await expect(page.getByTestId("answer-title")).toHaveCount(0);
  });

  test("순서 섞기는 처음 곡으로 돌아가고 같은 곡들을 모두 유지한다", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "다음 곡 ⏭" }).click();
    await expect(page.getByTestId("progress")).toContainText(`문제 2 / ${songs.length}`);

    await page.getByRole("button", { name: "🔀 순서 섞기" }).click();
    await expect(page.getByTestId("progress")).toContainText(`문제 1 / ${songs.length}`);
    await expect(page.getByTestId("blind-cover")).toBeVisible();

    // 모든 곡을 한 번씩 지나가며 중복 없이 정답이 나온다
    const seen: string[] = [];
    for (let i = 0; i < songs.length; i++) {
      await page.keyboard.press("Enter");
      seen.push(await page.getByTestId("answer-title").innerText());
      if (i < songs.length - 1) await page.keyboard.press("ArrowRight");
    }
    expect([...seen].sort()).toEqual(songs.map((s) => s.title).sort());
  });
});
