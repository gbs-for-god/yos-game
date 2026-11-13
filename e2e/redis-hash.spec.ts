import { expect, test } from "@playwright/test";
import { UpstashStore } from "../games/manito-mission/server/store";
import { RedisParticipantStore } from "../lib/participants/server/store";
import { toHashRecord } from "../lib/server/redisHash";

/**
 * 운영 Redis(`automaticDeserialization: false`)의 hgetall 은 객체가 아니라
 * [필드, 값, 필드, 값, …] 평평한 배열을 돌려준다. 로컬은 메모리 저장소라 이 차이가 드러나지 않으므로,
 * 운영과 같은 응답 형태의 가짜 Redis 로 저장소가 이름을 제대로 읽는지 확인한다.
 */

test.describe("Redis 해시 응답 변환", () => {
  test("평평한 배열을 필드/값 객체로 바꾼다", () => {
    expect(toHashRecord(["철수", "token-a", "영희", "token-b"])).toEqual({
      철수: "token-a",
      영희: "token-b",
    });
  });

  test("인덱스 문자열이 이름으로 나오지 않는다", () => {
    expect(Object.keys(toHashRecord(["철수", "token-a"]))).toEqual(["철수"]);
  });

  test("없는 해시(null · 빈 배열)는 빈 객체다", () => {
    expect(toHashRecord(null)).toEqual({});
    expect(toHashRecord(undefined)).toEqual({});
    expect(toHashRecord([])).toEqual({});
  });

  test("이미 객체인 응답도 그대로 받아 준다", () => {
    expect(toHashRecord({ 철수: "token-a" })).toEqual({ 철수: "token-a" });
  });

  test("짝이 맞지 않는 마지막 항목은 버리고, __proto__ 도 일반 이름으로 다룬다", () => {
    expect(toHashRecord(["철수", "token-a", "남은필드"])).toEqual({ 철수: "token-a" });
    const record = toHashRecord(["__proto__", "x"]);
    expect(Object.keys(record)).toEqual(["__proto__"]);
  });
});

test.describe("운영 응답 형태를 흉내 낸 저장소", () => {
  test("참여자 저장소가 이름을 인덱스가 아닌 실제 이름으로 읽는다", async () => {
    const fake = { hgetall: async () => ["철수", "token-a", "영희", "token-b"] };
    const store = new RedisParticipantStore(fake as never);
    expect(await store.readAll()).toEqual({ 철수: "token-a", 영희: "token-b" });
  });

  test("마니또 저장소가 확인 기록의 이름을 실제 이름으로 읽는다", async () => {
    const pipeline = {
      get: () => pipeline,
      hgetall: () => pipeline,
      exec: async () => [null, ["철수", "1700000000000", "영희", "1700000000001"]],
    };
    const store = new UpstashStore({ pipeline: () => pipeline } as never);
    const { viewed } = await store.read();
    expect(viewed).toEqual({ 철수: true, 영희: true });
  });
});
