/**
 * 세션 저장소 (서버 전용).
 * - 운영: Upstash Redis (Vercel Marketplace 연동 시 환경 변수가 자동 주입된다)
 * - 로컬 개발 / E2E: 환경 변수가 없으면 서버 프로세스 메모리에 저장한다
 *
 * 세션(배정표)과 확인 기록을 다른 키에 두는 이유:
 * 세션은 사회자 한 사람만 바꾸지만, 확인 기록은 여러 참여자 휴대폰이 동시에 쓴다.
 * 확인 기록을 Redis 해시의 필드 단위로 쓰면 동시에 눌러도 서로 덮어쓰지 않는다.
 */

import { Redis } from "@upstash/redis";
import { parseSession, type Session, type ViewedMap } from "../logic";

export type StoredState = {
  session: Session | null;
  viewed: ViewedMap;
};

export interface SessionStore {
  read(): Promise<StoredState>;
  writeSession(session: Session): Promise<void>;
  /** 세션과 확인 기록을 모두 지운다 (시작 전 상태로) */
  clear(): Promise<void>;
  markViewed(name: string): Promise<void>;
  unmarkViewed(name: string): Promise<void>;
  clearViewed(): Promise<void>;
}

const SESSION_KEY = "yos-game:manito-mission:session";
const VIEWED_KEY = "yos-game:manito-mission:viewed";

class UpstashStore implements SessionStore {
  constructor(private readonly redis: Redis) {}

  async read(): Promise<StoredState> {
    const [raw, viewedHash] = await this.redis
      .pipeline()
      .get<string | null>(SESSION_KEY)
      .hgetall<Record<string, string>>(VIEWED_KEY)
      .exec();
    const viewed: ViewedMap = {};
    for (const name of Object.keys(viewedHash ?? {})) viewed[name] = true;
    return { session: parseSession(raw), viewed };
  }

  async writeSession(session: Session) {
    await this.redis.set(SESSION_KEY, JSON.stringify(session));
  }

  async clear() {
    await this.redis.del(SESSION_KEY, VIEWED_KEY);
  }

  async markViewed(name: string) {
    await this.redis.hset(VIEWED_KEY, { [name]: String(Date.now()) });
  }

  async unmarkViewed(name: string) {
    await this.redis.hdel(VIEWED_KEY, name);
  }

  async clearViewed() {
    await this.redis.del(VIEWED_KEY);
  }
}

class MemoryStore implements SessionStore {
  private session: Session | null = null;
  private viewed: ViewedMap = {};

  async read(): Promise<StoredState> {
    return { session: this.session, viewed: { ...this.viewed } };
  }
  async writeSession(session: Session) {
    this.session = session;
  }
  async clear() {
    this.session = null;
    this.viewed = {};
  }
  async markViewed(name: string) {
    this.viewed[name] = true;
  }
  async unmarkViewed(name: string) {
    delete this.viewed[name];
  }
  async clearViewed() {
    this.viewed = {};
  }
}

function readRedisEnv(): { url: string; token: string } | null {
  // Vercel Marketplace 연동은 KV_* 이름으로, Upstash 콘솔 직접 연결은 UPSTASH_* 이름으로 주입된다
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/** 개발 서버의 HMR 로 모듈이 다시 로드되어도 메모리 저장소가 유지되도록 globalThis 에 보관한다 */
const globalStore = globalThis as unknown as { __manitoMissionStore?: SessionStore };

export function getSessionStore(): SessionStore {
  if (globalStore.__manitoMissionStore) return globalStore.__manitoMissionStore;

  const env = readRedisEnv();
  let store: SessionStore;
  if (env) {
    store = new UpstashStore(new Redis({ ...env, automaticDeserialization: false }));
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[manito-mission] Redis 환경 변수가 없어 메모리 저장소를 사용합니다. 서버가 재시작되면 게임 상태가 사라집니다.",
      );
    }
    store = new MemoryStore();
  }
  globalStore.__manitoMissionStore = store;
  return store;
}
