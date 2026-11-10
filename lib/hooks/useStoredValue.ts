/**
 * localStorage / sessionStorage 의 문자열 값을 React 상태처럼 읽는 훅.
 *
 * 서버 렌더링 시점에는 값을 알 수 없으므로 LOADING(undefined)을 돌려주고,
 * 클라이언트에서 하이드레이션이 끝나면 실제 값(null = 없음)으로 바뀐다.
 * 저장이 막힌 환경(시크릿 모드 등)에서는 메모리 값으로 대신해 화면이 멈추지 않게 한다.
 */

import { useSyncExternalStore } from "react";

/** 아직 읽기 전 (서버 렌더링 / 하이드레이션 전) */
export const LOADING = undefined;

export type StoredValue = string | null | typeof LOADING;

export type StorageStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => string | null;
  getServerSnapshot: () => StoredValue;
  save: (value: string | null) => void;
};

export function createStorageStore(kind: "local" | "session", key: string): StorageStore {
  const listeners = new Set<() => void>();
  let memoryFallback: string | null = null;

  const storage = () => (kind === "local" ? window.localStorage : window.sessionStorage);

  return {
    subscribe(listener) {
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    getSnapshot() {
      try {
        return storage().getItem(key);
      } catch {
        return memoryFallback;
      }
    },
    getServerSnapshot() {
      return LOADING;
    },
    save(value) {
      memoryFallback = value;
      try {
        if (value === null) storage().removeItem(key);
        else storage().setItem(key, value);
      } catch {
        // 저장이 막힌 환경에서는 메모리 값으로만 진행한다
      }
      listeners.forEach((listener) => listener());
    },
  };
}

export function useStoredValue(store: StorageStore): StoredValue {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
