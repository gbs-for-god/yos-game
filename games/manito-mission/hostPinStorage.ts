/**
 * 사회자 비밀번호를 이 탭(sessionStorage)에 보관한다.
 * 공개 화면 중 새로고침해도 비밀번호를 다시 묻지 않기 위한 것으로, 탭을 닫으면 사라진다.
 * React 의 useSyncExternalStore 와 함께 쓰도록 subscribe/getSnapshot 형태로 노출한다.
 */

const KEY = "yos-game:manito-mission:host-pin";

/** 서버 렌더링 시점의 스냅샷. "아직 모름"을 뜻하며 null(저장된 값 없음)과 구분한다 */
export const LOADING = undefined;

const listeners = new Set<() => void>();
let memoryFallback: string | null = null;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return memoryFallback;
  }
}

export function getServerSnapshot(): string | null | undefined {
  return LOADING;
}

export function saveHostPin(pin: string | null): void {
  memoryFallback = pin;
  try {
    if (pin === null) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, pin);
  } catch {
    // 저장이 막힌 환경에서는 메모리 값으로만 진행한다
  }
  listeners.forEach((listener) => listener());
}
