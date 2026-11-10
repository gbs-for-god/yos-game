/**
 * /api/participants 의 처리 (서버 전용).
 * - GET    등록된 이름 목록 (+ 토큰을 보냈으면 내 이름)
 * - POST   { name, token } 으로 등록. 이름은 정리(normalizeName) 후 저장하고, 다른 기기가 이미 차지한 이름이면 409
 * - DELETE { name } 등록 해제. 사회자 비밀번호 또는 그 이름을 차지한 토큰이 필요(토큰은 이름 변경 허용 설정이 켜진 때만). 본문이 없으면 사회자가 전체 해제
 *
 * 이름 변경(이미 등록한 기기가 다른 이름으로 등록)은 사이트 설정 allowRename 이 켜져 있을 때만 허용한다.
 */

import { checkHostPin, errorResponse, jsonResponse } from "@/lib/server/hostPin";
import { getSettingsStore } from "@/lib/settings/server/store";
import {
  normalizeName,
  PARTICIPANT_TOKEN_HEADER,
  validateName,
  type ParticipantsResponse,
} from "../shared";
import { getParticipantStore } from "./store";

const RENAME_BLOCKED = "이름 변경은 사회자가 허용했을 때만 할 수 있어요.";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function buildResponse(claims: Record<string, string>, token: string | null): Response {
  const body: ParticipantsResponse = { claimed: Object.keys(claims) };
  if (token !== null) {
    body.me = Object.entries(claims).find(([, t]) => t === token)?.[0] ?? null;
  }
  return jsonResponse(body);
}

export async function getParticipants(request: Request): Promise<Response> {
  const token = request.headers.get(PARTICIPANT_TOKEN_HEADER);
  return buildResponse(await getParticipantStore().readAll(), token);
}

export async function registerParticipant(request: Request): Promise<Response> {
  const body = await readBody(request);
  const rawName = body?.name;
  const token = body?.token;
  if (typeof rawName !== "string" || typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    return errorResponse("알 수 없는 요청이에요.", 400);
  }
  const name = normalizeName(rawName);
  const invalid = validateName(name);
  if (invalid) return errorResponse(invalid, 400);

  const store = getParticipantStore();

  // 이미 다른 이름을 등록한 기기가 이름을 바꾸려는 경우는 사회자가 허용했을 때만 가능하다
  const current = Object.entries(await store.readAll()).find(([, t]) => t === token)?.[0];
  if (current !== undefined && current !== name && !(await getSettingsStore().read()).allowRename) {
    return errorResponse(RENAME_BLOCKED, 403);
  }

  const ok = await store.claim(name, token);
  if (!ok) {
    return errorResponse(
      "이미 다른 기기에서 등록한 이름이에요. 다른 이름(예: 홍길동2)을 쓰거나, 본인이라면 사회자에게 말씀해 주세요.",
      409,
    );
  }
  return buildResponse(await store.readAll(), token);
}

export async function releaseParticipant(request: Request): Promise<Response> {
  const pin = checkHostPin(request);
  if (pin === "wrong") return errorResponse("사회자 비밀번호가 틀렸어요.", 401);

  const store = getParticipantStore();
  const body = await readBody(request);
  const name = body?.name;

  if (typeof name !== "string") {
    if (pin !== "ok") return errorResponse("사회자만 할 수 있는 동작이에요.", 401);
    await store.clear();
    return new Response(null, { status: 204 });
  }

  if (pin !== "ok") {
    const token = request.headers.get(PARTICIPANT_TOKEN_HEADER);
    const claims = await store.readAll();
    if (!token || claims[name] !== token)
      return errorResponse("이 이름을 해제할 권한이 없어요.", 401);
    // 참가자 스스로 이름을 푸는 것은 이름 변경의 일부이므로 같은 설정을 따른다
    if (!(await getSettingsStore().read()).allowRename) return errorResponse(RENAME_BLOCKED, 403);
  }
  await store.release(name);
  return buildResponse(await store.readAll(), request.headers.get(PARTICIPANT_TOKEN_HEADER));
}
