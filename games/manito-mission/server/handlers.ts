/**
 * Route Handler 가 호출하는 서버 로직 (서버 전용).
 * 요청 → 검증 → logic.ts 의 순수 함수로 상태 전이 → 저장소 기록 → 응답.
 *
 * 응답 형식(StateResponse)은 client.ts 와 공유한다.
 * - session: 모든 기기에 공개 가능한 정보 (없으면 null = 게임 시작 전)
 * - mine: ?name= 으로 요청한 사람의 배정 (본인 확인용)
 * - assignments: 올바른 사회자 비밀번호(x-host-pin 헤더)를 보낸 경우에만 전체 배정표
 */

import membersData from "../data/members.json";
import missionsData from "../data/missions.json";
import {
  createSession,
  isHostAction,
  parseAction,
  redrawMissions,
  revealNext,
  startReveal,
  toPublicSession,
  validateMembers,
  type Assignment,
  type Members,
  type Mission,
  type PublicSession,
} from "../logic";
import { getSessionStore, type StoredState } from "./store";

export const HOST_PIN_HEADER = "x-host-pin";

export type StateResponse = {
  session: PublicSession | null;
  mine?: Assignment | null;
  assignments?: Record<string, Assignment>;
};

const MEMBERS: Members = membersData;
const MISSIONS: readonly Mission[] = missionsData;

function hostPin(): string {
  return process.env.MANITO_HOST_PIN ?? MEMBERS.hostPin;
}

/** 헤더가 없으면 null(일반 참여자), 있으면 일치 여부 */
function checkPin(request: Request): "none" | "ok" | "wrong" {
  const pin = request.headers.get(HOST_PIN_HEADER);
  if (pin === null) return "none";
  return pin === hostPin() ? "ok" : "wrong";
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

function buildResponse(state: StoredState, options: { name?: string | null; isHost: boolean }) {
  const { session, viewed } = state;
  const body: StateResponse = { session: session ? toPublicSession(session, viewed) : null };
  if (options.name && session) body.mine = session.assignments[options.name] ?? null;
  if (options.isHost && session) body.assignments = session.assignments;
  return json(body);
}

export async function getState(request: Request): Promise<Response> {
  const pin = checkPin(request);
  if (pin === "wrong") return error("사회자 비밀번호가 틀렸어요.", 401);

  const name = new URL(request.url).searchParams.get("name");
  const state = await getSessionStore().read();
  return buildResponse(state, { name, isHost: pin === "ok" });
}

export async function postAction(request: Request): Promise<Response> {
  let action;
  try {
    action = parseAction(await request.json());
  } catch {
    action = null;
  }
  if (!action) return error("알 수 없는 요청이에요.", 400);

  const pin = checkPin(request);
  if (pin === "wrong") return error("사회자 비밀번호가 틀렸어요.", 401);
  if (isHostAction(action) && pin !== "ok") return error("사회자만 할 수 있는 동작이에요.", 401);

  const store = getSessionStore();
  const state = await store.read();
  const name = new URL(request.url).searchParams.get("name");

  switch (action.type) {
    case "verify":
      break;

    case "start": {
      if (state.session) break; // 이미 시작된 게임은 그대로 둔다 (두 번 눌러도 안전)
      const invalid = validateMembers(MEMBERS);
      if (invalid) return error(invalid, 400);
      await store.clearViewed();
      await store.writeSession(createSession(MEMBERS, MISSIONS));
      break;
    }

    case "redrawAll": {
      const invalid = validateMembers(MEMBERS);
      if (invalid) return error(invalid, 400);
      await store.clearViewed();
      await store.writeSession(createSession(MEMBERS, MISSIONS));
      break;
    }

    case "redrawMissions": {
      if (!state.session) return error("아직 게임이 시작되지 않았어요.", 409);
      if (state.session.phase === "reveal")
        return error("공개가 시작된 뒤에는 바꿀 수 없어요.", 409);
      if (!state.session.assignments[action.name]) return error("명단에 없는 이름이에요.", 400);
      await store.writeSession(redrawMissions(state.session, action.name, MISSIONS));
      await store.unmarkViewed(action.name);
      break;
    }

    case "startReveal": {
      if (!state.session) return error("아직 게임이 시작되지 않았어요.", 409);
      await store.writeSession(startReveal(state.session));
      break;
    }

    case "revealNext": {
      if (!state.session) return error("아직 게임이 시작되지 않았어요.", 409);
      await store.writeSession(revealNext(state.session));
      break;
    }

    case "viewed": {
      if (!state.session) return error("아직 게임이 시작되지 않았어요.", 409);
      if (!state.session.assignments[action.name]) return error("명단에 없는 이름이에요.", 400);
      await store.markViewed(action.name);
      break;
    }
  }

  return buildResponse(await store.read(), { name, isHost: pin === "ok" });
}

/** 세션과 확인 기록을 모두 지워 시작 전 상태로 되돌린다 (사회자 전용). */
export async function clearState(request: Request): Promise<Response> {
  if (checkPin(request) !== "ok") return error("사회자만 할 수 있는 동작이에요.", 401);
  await getSessionStore().clear();
  return new Response(null, { status: 204 });
}
