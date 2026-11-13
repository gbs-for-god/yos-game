import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } };
/** 서버 상태(참가자 등록 등)를 공유해 서로 동시에 돌면 안 되는 spec */
const SERVER_STATE_SPECS = ["join.spec.ts", "host.spec.ts", "manito-mission.spec.ts"];

/**
 * E2E 테스트는 프로덕션 빌드(`next build && next start`)를 대상으로 실행한다.
 * 진행자가 노트북 + 프로젝터로 사용하는 환경이므로 데스크톱 Chromium만 대상으로 한다.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  /**
   * 참가자 등록·마니또 세션은 서버 한 곳에 저장되어 spec 끼리 공유된다. 특히 마니또 멤버는
   * "시작할 때 등록된 참가자 전체"라서 다른 spec 이 동시에 등록하면 인원이 달라진다.
   * 그래서 서버 상태를 쓰는 spec 은 프로젝트로 나눠 차례로(join → host → manito) 실행하고,
   * 나머지(홈·번호 뽑기 등)는 신원을 서버에 등록해 두고 시작하므로 위 spec 들이 모두 끝난 뒤에 돌린다.
   */
  projects: [
    {
      name: "chromium",
      testIgnore: SERVER_STATE_SPECS,
      // seedIdentity 가 서버에 신원을 등록하므로, 참가자 목록을 지우는 spec 들이 끝난 뒤에 돌린다
      dependencies: ["manito-mission"],
      use: desktop,
    },
    {
      name: "participants",
      testMatch: "join.spec.ts",
      use: desktop,
    },
    {
      name: "host-menu",
      testMatch: "host.spec.ts",
      dependencies: ["participants"],
      use: desktop,
    },
    {
      name: "manito-mission",
      testMatch: "manito-mission.spec.ts",
      dependencies: ["host-menu"],
      use: desktop,
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
