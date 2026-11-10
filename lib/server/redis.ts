/**
 * 서버 전용: Upstash Redis 클라이언트.
 * Vercel Marketplace 연동(KV_*) 또는 Upstash 콘솔(UPSTASH_*) 환경 변수가 있을 때만 만들어지고,
 * 없으면 null 을 돌려주어 각 저장소가 메모리 폴백을 쓰게 한다 (로컬 개발·E2E).
 */

import { Redis } from "@upstash/redis";

const globalRef = globalThis as unknown as { __yosRedis?: Redis | null };

export function getRedis(): Redis | null {
  if (globalRef.__yosRedis !== undefined) return globalRef.__yosRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) {
    globalRef.__yosRedis = new Redis({ url, token, automaticDeserialization: false });
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[yos-game] Redis 환경 변수가 없어 메모리 저장소를 사용합니다. 서버가 재시작되면 상태가 사라집니다.",
      );
    }
    globalRef.__yosRedis = null;
  }
  return globalRef.__yosRedis;
}

/** 개발 서버 HMR 로 모듈이 다시 로드되어도 메모리 저장소가 유지되도록 globalThis 에 보관한다 */
export function memoized<T>(key: string, create: () => T): T {
  const ref = globalThis as unknown as Record<string, T | undefined>;
  if (ref[key] === undefined) ref[key] = create();
  return ref[key] as T;
}
