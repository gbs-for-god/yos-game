/**
 * 브라우저에서 세션 API(/api/manito-mission/session)를 호출하는 함수와 폴링 훅.
 * 서버가 밀어주는 실시간 기능이 없으므로 일정 간격으로 다시 읽어 다른 기기의 변화를 반영한다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createStorageStore } from "@/lib/hooks/useStoredValue";
import { HOST_PIN_HEADER, PARTICIPANT_TOKEN_HEADER } from "@/lib/participants/shared";
import type { Action } from "./logic";
import type { StateResponse } from "./server/handlers";

export type { StateResponse };

export const API_URL = "/api/manito-mission/session";

/** 평소: 다른 기기의 확인 완료 등은 10초 안에만 보이면 충분하다 (Redis 무료 한도 절약) */
export const POLL_INTERVAL_MS = 10_000;
/** 공개 단계: 참여자 휴대폰이 프로젝터 공개를 더 빨리 따라오도록 */
export const REVEAL_POLL_INTERVAL_MS = 5_000;

/** 사회자 비밀번호는 이 탭(sessionStorage)에만 기억한다. 공개 중 새로고침해도 다시 묻지 않기 위한 것 */
export const hostPinStore = createStorageStore("session", "yos-game:manito-mission:host-pin");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export type RequestOptions = {
  /** 사회자 비밀번호. 맞으면 전체 배정표(assignments)를 받는다 */
  hostPin?: string;
  /** 참여자 기기 토큰. 보내면 내 이름(me)과 내 배정(mine)을 받는다 */
  participantToken?: string;
};

function buildHeaders(
  { hostPin, participantToken }: RequestOptions,
  hasBody: boolean,
): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) headers["content-type"] = "application/json";
  if (hostPin !== undefined) headers[HOST_PIN_HEADER] = hostPin;
  if (participantToken !== undefined) headers[PARTICIPANT_TOKEN_HEADER] = participantToken;
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
  const response = await fetch(API_URL, {
    headers: buildHeaders(options, false),
    cache: "no-store",
  });
  return parse(response);
}

export async function sendAction(action: Action, options: RequestOptions = {}) {
  const response = await fetch(API_URL, {
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
  act: (action: Action) => Promise<StateResponse>;
};

/**
 * 세션 상태를 주기적으로 읽어 오는 훅.
 * 오래된 응답이 최신 응답을 덮어쓰지 않도록 요청 순번을 기록하고, 탭이 숨겨져 있으면 읽지 않는다.
 */
export function usePolledState(
  options: RequestOptions,
  intervalMs: number,
  onUnauthorized?: () => void,
): PolledState {
  const [data, setData] = useState<StateResponse | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  const { hostPin, participantToken } = options;

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
    await run(() => fetchState({ hostPin, participantToken })).catch(() => undefined);
  }, [run, hostPin, participantToken]);

  const act = useCallback(
    (action: Action) => run(() => sendAction(action, { hostPin, participantToken })),
    [run, hostPin, participantToken],
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
