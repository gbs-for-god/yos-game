/**
 * 브라우저에서 세션 API(/api/manito-mission/session)를 호출하는 함수와 폴링 훅.
 * 서버가 밀어주는 실시간 기능이 없으므로 일정 간격으로 다시 읽어 다른 기기의 변화를 반영한다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Action } from "./logic";
import type { StateResponse } from "./server/handlers";

export type { StateResponse };

export const API_URL = "/api/manito-mission/session";
export const HOST_PIN_HEADER = "x-host-pin";
/** 다른 기기의 변화(확인 완료, 공개 진행 등)를 다시 읽는 간격 */
export const POLL_INTERVAL_MS = 3000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

type RequestOptions = {
  /** 본인 배정(mine)을 함께 받고 싶은 멤버 이름 */
  name?: string;
  /** 사회자 비밀번호. 맞으면 전체 배정표(assignments)를 받는다 */
  hostPin?: string;
};

function buildUrl({ name }: RequestOptions): string {
  return name ? `${API_URL}?name=${encodeURIComponent(name)}` : API_URL;
}

function buildHeaders({ hostPin }: RequestOptions, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) headers["content-type"] = "application/json";
  if (hostPin !== undefined) headers[HOST_PIN_HEADER] = hostPin;
  return headers;
}

async function parse(response: Response): Promise<StateResponse> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `서버 오류 (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return body as StateResponse;
}

export async function fetchState(options: RequestOptions = {}): Promise<StateResponse> {
  const response = await fetch(buildUrl(options), {
    headers: buildHeaders(options, false),
    cache: "no-store",
  });
  return parse(response);
}

export async function sendAction(action: Action, options: RequestOptions = {}) {
  const response = await fetch(buildUrl(options), {
    method: "POST",
    headers: buildHeaders(options, true),
    body: JSON.stringify(action),
  });
  return parse(response);
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "서버에 연결할 수 없어요. 네트워크를 확인해 주세요.";
}

export type PolledState = {
  /** 아직 한 번도 못 받았으면 undefined */
  data: StateResponse | undefined;
  /** 마지막 요청의 오류 메시지. 성공하면 null */
  error: string | null;
  refresh: () => Promise<void>;
  /** 동작을 보내고 응답으로 상태를 바로 갱신한다. 실패하면 ApiError 를 던진다 */
  act: (action: Action, options?: { name?: string }) => Promise<StateResponse>;
};

/**
 * 세션 상태를 주기적으로 읽어 오는 훅.
 * 오래된 응답이 최신 응답을 덮어쓰지 않도록 요청 순번을 기록한다.
 */
export function usePolledState(
  options: RequestOptions,
  onUnauthorized?: () => void,
  intervalMs: number = POLL_INTERVAL_MS,
): PolledState {
  const [data, setData] = useState<StateResponse | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const { name, hostPin } = options;

  const run = useCallback(
    async (request: () => Promise<StateResponse>) => {
      const seq = ++latestRequest.current;
      try {
        const result = await request();
        if (seq !== latestRequest.current) return result;
        setData(result);
        setError(null);
        return result;
      } catch (err) {
        if (seq === latestRequest.current) setError(describeError(err));
        if (err instanceof ApiError && err.status === 401) onUnauthorized?.();
        throw err;
      }
    },
    [onUnauthorized],
  );

  const refresh = useCallback(async () => {
    await run(() => fetchState({ name, hostPin })).catch(() => undefined);
  }, [run, name, hostPin]);

  const act = useCallback(
    (action: Action, actOptions: { name?: string } = {}) =>
      run(() => sendAction(action, { name: actOptions.name ?? name, hostPin })),
    [run, name, hostPin],
  );

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { data, error, refresh, act };
}
