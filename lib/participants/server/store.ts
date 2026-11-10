/**
 * 서버 전용: 이름 → 기기 토큰 등록 저장소.
 * Redis 해시 하나에 이름을 필드로 두어, 여러 기기가 동시에 등록해도 서로 덮어쓰지 않는다.
 */

import { getRedis, memoized } from "@/lib/server/redis";

export interface ParticipantStore {
  /** 이름 → 토큰 전체 */
  readAll(): Promise<Record<string, string>>;
  /** 등록되어 있지 않거나 같은 토큰이면 true, 다른 기기가 차지했으면 false */
  claim(name: string, token: string): Promise<boolean>;
  release(name: string): Promise<void>;
  clear(): Promise<void>;
}

const KEY = "yos-game:participants";

class RedisParticipantStore implements ParticipantStore {
  constructor(private readonly redis: NonNullable<ReturnType<typeof getRedis>>) {}

  async readAll() {
    return (await this.redis.hgetall<Record<string, string>>(KEY)) ?? {};
  }
  async claim(name: string, token: string) {
    // HSETNX: 필드가 없을 때만 기록한다 → 두 기기가 동시에 눌러도 한 기기만 성공
    const created = await this.redis.hsetnx(KEY, name, token);
    if (created === 1) return true;
    return (await this.redis.hget<string>(KEY, name)) === token;
  }
  async release(name: string) {
    await this.redis.hdel(KEY, name);
  }
  async clear() {
    await this.redis.del(KEY);
  }
}

class MemoryParticipantStore implements ParticipantStore {
  private claims: Record<string, string> = {};

  async readAll() {
    return { ...this.claims };
  }
  async claim(name: string, token: string) {
    const current = this.claims[name];
    if (current === undefined) {
      this.claims[name] = token;
      return true;
    }
    return current === token;
  }
  async release(name: string) {
    delete this.claims[name];
  }
  async clear() {
    this.claims = {};
  }
}

export function getParticipantStore(): ParticipantStore {
  return memoized("__yosParticipantStore", () => {
    const redis = getRedis();
    return redis ? new RedisParticipantStore(redis) : new MemoryParticipantStore();
  });
}

/** 토큰으로 등록된 이름을 찾는다. 없으면 null */
export async function resolveParticipant(token: string | null): Promise<string | null> {
  if (!token) return null;
  const all = await getParticipantStore().readAll();
  for (const [name, t] of Object.entries(all)) if (t === token) return name;
  return null;
}
