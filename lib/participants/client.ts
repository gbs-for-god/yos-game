/**
 * 브라우저에서 참여자 신원을 다루는 훅과 API 호출.
 * 신원({ name, token })은 localStorage 에 저장되어 브라우저를 닫았다 열어도 유지된다.
 */

import { useCallback, useMemo } from "react";
import { createStorageStore, LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import {
  HOST_PIN_HEADER,
  PARTICIPANT_TOKEN_HEADER,
  type ParticipantIdentity,
  type ParticipantsResponse,
} from "./shared";

export { PARTICIPANT_TOKEN_HEADER };
export type { ParticipantIdentity, ParticipantsResponse };

export const PARTICIPANTS_API = "/api/participants";

const identityStore = createStorageStore("local", "yos-game:participant");

function parseIdentity(raw: string | null): ParticipantIdentity | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "token" in value &&
      typeof value.name === "string" &&
      typeof value.token === "string"
    ) {
      return { name: value.name, token: value.token };
    }
  } catch {
    // 손상된 값은 없는 것으로 취급한다
  }
  return null;
}

export type ParticipantIdentityState = {
  /** undefined = 아직 읽기 전, null = 등록 안 됨 */
  identity: ParticipantIdentity | null | undefined;
  save: (identity: ParticipantIdentity) => void;
  clear: () => void;
};

export function useParticipantIdentity(): ParticipantIdentityState {
  const raw = useStoredValue(identityStore);
  const identity = useMemo(() => (raw === LOADING ? undefined : parseIdentity(raw)), [raw]);
  const save = useCallback(
    (value: ParticipantIdentity) => identityStore.save(JSON.stringify(value)),
    [],
  );
  const clear = useCallback(() => identityStore.save(null), []);
  return { identity, save, clear };
}

export function createToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export class ParticipantApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response): Promise<ParticipantsResponse> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `서버 오류 (${response.status})`;
    throw new ParticipantApiError(message, response.status);
  }
  return body as ParticipantsResponse;
}

export async function fetchParticipants(token?: string): Promise<ParticipantsResponse> {
  const headers: Record<string, string> = {};
  if (token) headers[PARTICIPANT_TOKEN_HEADER] = token;
  return parse(await fetch(PARTICIPANTS_API, { headers, cache: "no-store" }));
}

export async function registerParticipant(identity: ParticipantIdentity) {
  return parse(
    await fetch(PARTICIPANTS_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(identity),
    }),
  );
}

/** 내 기기가 차지한 이름을 해제한다 (다른 이름으로 바꿀 때) */
export async function releaseParticipant(identity: ParticipantIdentity) {
  return parse(
    await fetch(PARTICIPANTS_API, {
      method: "DELETE",
      headers: { "content-type": "application/json", [PARTICIPANT_TOKEN_HEADER]: identity.token },
      body: JSON.stringify({ name: identity.name }),
    }),
  );
}

/** 사회자가 특정 이름의 기기 등록을 풀어 준다 (휴대폰 교체 등) */
export async function releaseParticipantByHost(name: string, hostPin: string) {
  return parse(
    await fetch(PARTICIPANTS_API, {
      method: "DELETE",
      headers: { "content-type": "application/json", [HOST_PIN_HEADER]: hostPin },
      body: JSON.stringify({ name }),
    }),
  );
}

export function describeParticipantError(error: unknown): string {
  if (error instanceof ParticipantApiError) return error.message;
  return "서버에 연결할 수 없어요. 네트워크를 확인해 주세요.";
}
