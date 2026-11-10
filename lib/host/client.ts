/** 사회자 비밀번호를 이 탭(sessionStorage)에만 기억하는 저장소와, 사회자 로그인 상태 훅 */

import { useEffect, useState } from "react";
import { createStorageStore, LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import { fetchSettings, SettingsApiError } from "@/lib/settings/client";

export const hostPinStore = createStorageStore("session", "yos-game:host-pin");

/**
 * 사회자 로그인 상태.
 * - undefined: 아직 읽는 중이거나 서버에 비밀번호를 확인하는 중
 * - null: 로그아웃 상태 (또는 기억해 둔 비밀번호가 더 이상 맞지 않음)
 * - string: 서버가 확인한 사회자 비밀번호
 * 서버에 연결할 수 없을 때는 기억해 둔 비밀번호를 그대로 믿는다 (비밀번호가 틀렸다는 응답일 때만 로그아웃).
 */
export function useVerifiedHostPin(): string | null | undefined {
  const stored = useStoredValue(hostPinStore);
  const [verified, setVerified] = useState<string | null>(null);

  useEffect(() => {
    if (typeof stored !== "string") return;
    let cancelled = false;
    fetchSettings(stored)
      .then(() => {
        if (!cancelled) setVerified(stored);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SettingsApiError && err.status === 401) hostPinStore.save(null);
        else setVerified(stored);
      });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  if (stored === LOADING) return undefined;
  if (stored === null) return null;
  return verified === stored ? stored : undefined;
}
