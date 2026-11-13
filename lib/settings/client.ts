/** 브라우저에서 사이트 설정을 읽고(누구나) 바꾸는(사회자) 함수와 훅 */

import { useCallback, useEffect, useState } from "react";
import { HOST_PIN_HEADER } from "@/lib/participants/shared";
import type { HostSettings, SiteSettings } from "./shared";

export const SETTINGS_API = "/api/settings";

export class SettingsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response): Promise<HostSettings> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `서버 오류 (${response.status})`;
    throw new SettingsApiError(message, response.status);
  }
  return body as HostSettings;
}

/** 설정을 읽는다. hostPin 을 함께 보내면 비밀번호가 맞는지도 확인된다(틀리면 SettingsApiError 401) */
export function fetchSettings(hostPin: string): Promise<HostSettings>;
export function fetchSettings(): Promise<SiteSettings>;
export async function fetchSettings(hostPin?: string): Promise<SiteSettings> {
  const headers: Record<string, string> = {};
  if (hostPin !== undefined) headers[HOST_PIN_HEADER] = hostPin;
  return parse(await fetch(SETTINGS_API, { headers, cache: "no-store" }));
}

export async function saveSettings(
  patch: Partial<HostSettings>,
  hostPin: string,
): Promise<HostSettings> {
  return parse(
    await fetch(SETTINGS_API, {
      method: "PUT",
      headers: { "content-type": "application/json", [HOST_PIN_HEADER]: hostPin },
      body: JSON.stringify(patch),
    }),
  );
}

export function describeSettingsError(error: unknown): string {
  if (error instanceof SettingsApiError) return error.message;
  return "서버에 연결할 수 없어요. 네트워크를 확인해 주세요.";
}

/**
 * 현재 설정을 읽는 훅. 아직 읽기 전이면 undefined.
 * `refreshKey` 가 바뀔 때마다 다시 읽는다 (페이지를 옮길 때 최신 설정을 반영하기 위함).
 */
export function useSiteSettings(refreshKey?: string): SiteSettings | undefined {
  const [settings, setSettings] = useState<SiteSettings | undefined>(undefined);
  const load = useCallback(() => {
    let cancelled = false;
    fetchSettings()
      .then((value) => {
        if (!cancelled) setSettings(value);
      })
      .catch(() => undefined); // 읽지 못하면 안전하게 "꺼짐"으로 취급한다
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load, refreshKey]);
  return settings;
}
