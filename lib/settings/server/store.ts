/**
 * 서버 전용: 사이트 설정 저장소. Redis 문자열 하나(JSON)에 저장하고, Redis 가 없으면 서버 메모리를 쓴다.
 */

import { getRedis, memoized } from "@/lib/server/redis";
import { DEFAULT_SETTINGS, type HostSettings } from "../shared";

export interface SettingsStore {
  read(): Promise<HostSettings>;
  write(settings: HostSettings): Promise<void>;
}

const KEY = "yos-game:settings";

/** 저장된 알 수 없는 값을 설정으로 안전하게 바꾼다. 빠진 항목은 기본값 */
function parseSettings(raw: unknown): HostSettings {
  try {
    const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (typeof value === "object" && value !== null && "allowRename" in value) {
      return {
        allowRename: value.allowRename === true,
        entryCode:
          "entryCode" in value && typeof value.entryCode === "string" ? value.entryCode : "",
      };
    }
  } catch {
    // 손상된 값은 기본값으로 취급한다
  }
  return { ...DEFAULT_SETTINGS, entryCode: "" };
}

class RedisSettingsStore implements SettingsStore {
  constructor(private readonly redis: NonNullable<ReturnType<typeof getRedis>>) {}
  async read() {
    return parseSettings(await this.redis.get<string>(KEY));
  }
  async write(settings: HostSettings) {
    await this.redis.set(KEY, JSON.stringify(settings));
  }
}

class MemorySettingsStore implements SettingsStore {
  private settings: HostSettings = { ...DEFAULT_SETTINGS, entryCode: "" };
  async read() {
    return { ...this.settings };
  }
  async write(settings: HostSettings) {
    this.settings = { ...settings };
  }
}

export function getSettingsStore(): SettingsStore {
  return memoized("__yosSettingsStore", () => {
    const redis = getRedis();
    return redis ? new RedisSettingsStore(redis) : new MemorySettingsStore();
  });
}
