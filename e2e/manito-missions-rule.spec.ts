import { expect, test } from "@playwright/test";
import missionsData from "../games/manito-mission/data/missions.json";
import {
  MISSIONS_PER_MEMBER,
  createSession,
  dealMissions,
  pickMissions,
  redrawMissions,
} from "../games/manito-mission/logic";

/** 마니또 미션 배정 규칙 (서버·브라우저 없이 순수 함수만 검증한다) */

const MISSIONS = missionsData;
const IDS = new Set(MISSIONS.map((m) => m.id));

/** 시드 고정 난수 (mulberry32) — 같은 시드면 항상 같은 결과 */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test.describe("마니또 미션 배정 규칙", () => {
  test("미션은 20개이고, 한 사람은 전체 중 3개를 받는다", () => {
    expect(MISSIONS).toHaveLength(20);
    expect(MISSIONS_PER_MEMBER).toBe(3);
    const picked = pickMissions(MISSIONS, MISSIONS_PER_MEMBER, seeded(1));
    expect(picked).toHaveLength(3);
    for (const id of picked) expect(IDS.has(id)).toBe(true);
  });

  test("한 사람의 3개는 서로 중복되지 않는다 (여러 시드 반복)", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const picked = pickMissions(MISSIONS, 3, seeded(seed));
      expect(new Set(picked).size).toBe(3);
    }
  });

  test("사람마다 독립 시행이라 서로 다른 사람은 같은 미션을 받을 수 있다", () => {
    // 60명 × 3개 = 180번 뽑는데 미션은 20개뿐이라 사람 사이에 겹침이 반드시 생긴다
    const names = Array.from({ length: 60 }, (_, i) => `참가자${i}`);
    const dealt = dealMissions(names, MISSIONS, 3, seeded(7));
    const all = Object.values(dealt).flat();
    expect(all).toHaveLength(180);
    expect(new Set(all).size).toBeLessThanOrEqual(20);
    for (const hand of Object.values(dealt)) expect(new Set(hand).size).toBe(3);
  });

  test("한 사람의 배정은 다른 사람의 결과에 영향을 받지 않는다", () => {
    // 같은 난수열에서 사람 수가 달라도 첫 사람의 미션은 같다
    const few = dealMissions(["가"], MISSIONS, 3, seeded(3));
    const many = dealMissions(["가", "나", "다"], MISSIONS, 3, seeded(3));
    expect(many["가"]).toEqual(few["가"]);
  });

  test("미션이 3개보다 적으면 있는 만큼만 배정한다", () => {
    expect(pickMissions(MISSIONS.slice(0, 2), 3, seeded(1))).toHaveLength(2);
  });

  test("이전에 받은 미션은 제외하고 뽑는다 (여러 시드 반복)", () => {
    const previous = pickMissions(MISSIONS, 3, seeded(1));
    for (let seed = 1; seed <= 200; seed++) {
      const picked = pickMissions(MISSIONS, 3, seeded(seed), previous);
      expect(picked).toHaveLength(3);
      for (const id of picked) expect(previous).not.toContain(id);
    }
  });

  test("제외하고 남은 미션이 모자랄 때만 제외한 미션으로 채운다", () => {
    const three = MISSIONS.slice(0, 4);
    const exclude = [three[0].id, three[1].id];
    const picked = pickMissions(three, 3, seeded(2), exclude);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    // 남은 2개(three[2], three[3])는 반드시 포함된다
    expect(picked).toContain(three[2].id);
    expect(picked).toContain(three[3].id);
  });

  test("다시 뽑기는 기존 미션을 제외하고, 마니또와 다른 사람의 미션은 그대로 둔다", () => {
    const session = createSession(["가", "나", "다"], null, MISSIONS, { random: seeded(11) });
    const before = session.assignments["가"].missionIds;
    for (let seed = 1; seed <= 100; seed++) {
      const redrawn = redrawMissions(session, "가", MISSIONS, seeded(seed));
      const after = redrawn.assignments["가"].missionIds;
      expect(after).toHaveLength(3);
      for (const id of after) expect(before).not.toContain(id);
      expect(redrawn.assignments["가"].manito).toBe(session.assignments["가"].manito);
      expect(redrawn.assignments["나"]).toEqual(session.assignments["나"]);
    }
  });

  test("다시 뽑아도 한 사람 안에서는 중복이 없다 (여러 시드 반복)", () => {
    const session = createSession(["가", "나"], null, MISSIONS, { random: seeded(5) });
    for (let seed = 1; seed <= 100; seed++) {
      const redrawn = redrawMissions(session, "가", MISSIONS, seeded(seed));
      expect(new Set(redrawn.assignments["가"].missionIds).size).toBe(3);
    }
  });
});
