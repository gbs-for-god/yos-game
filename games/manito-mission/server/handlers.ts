/**
 * Route Handler 가 호출하는 서버 로직 (서버 전용).
 * 요청 → 검증 → logic.ts 의 순수 함수로 상태 전이 → 저장소 기록 → 응답.
 *
 * 응답 형식(StateResponse)은 client.ts 와 공유한다.
 * - session: 모든 기기에 공개 가능한 정보 (없으면 null = 게임 시작 전)
 * - registered: 기기가 등록된 이름 목록
 * - me / mine: x-participant-token 헤더를 보낸 기기가 누구인지와 그 사람의 배정 (등록이 풀렸으면 me = null)
 * - assignments: 올바른 사회자 비밀번호(x-host-pin 헤더)를 보낸 경우에만 전체 배정표
 */

import { MEMBERS, validateMembers } from "@/lib/members";
import { getParticipantStore } from "@/lib/participants/server/store";
import { PARTICIPANT_TOKEN_HEADER } from "@/lib/participants/shared";
import { checkHostPin, errorResponse, jsonResponse } from "@/lib/server/hostPin";
import missionsData from "../data/missions.json";
import {
  createSession,
  isHostAction,
  parseAction,
  redrawMissions,
  revealNext,
  startReveal,
  toPublicSession,
  type Assignment,
  type Mission,
  type PublicSession,
} from "../logic";
import { getSessionStore, type StoredState } from "./store";

export type StateResponse = {
  session: PublicSession | null;
  registered: string[];
  me?: string | null;
  mine?: Assignment | null;
  assignments?: Record<string, Assignment>;
};

const MISSIONS: readonly Mission[] = missionsData;

type Requester = {
  isHost: boolean;
  /** 토큰을 보냈으면 그 토큰의 이름(해제되었으면 null), 안 보냈으면 undefined */
  me: string | null | undefined;
  claims: Record<string, string>;
};

async function identify(request: Request, isHost: boolean): Promise<Requester> {
  const claims = await getParticipantStore().readAll();
  const token = request.headers.get(PARTICIPANT_TOKEN_HEADER);
  const me =
    token === null ? undefined : (Object.entries(claims).find(([, t]) => t === token)?.[0] ?? null);
  return { isHost, me, claims };
}

function buildResponse(state: StoredState, requester: Requester): Response {
  const { session, viewed } = state;
  const body: StateResponse = {
    session: session ? toPublicSession(session, viewed) : null,
    registered: Object.keys(requester.claims),
  };
  if (requester.me !== undefined) {
    body.me = requester.me;
    if (requester.me && session) body.mine = session.assignments[requester.me] ?? null;
  }
  if (requester.isHost && session) body.assignments = session.assignments;
  return jsonResponse(body);
}

export async function getState(request: Request): Promise<Response> {
  const pin = checkHostPin(request);
  if (pin === "wrong") return errorResponse("사회자 비밀번호가 틀렸어요.", 401);

  const [state, requester] = await Promise.all([
    getSessionStore().read(),
    identify(request, pin === "ok"),
  ]);
  return buildResponse(state, requester);
}

export async function postAction(request: Request): Promise<Response> {
  let action;
  try {
    action = parseAction(await request.json());
  } catch {
    action = null;
  }
  if (!action) return errorResponse("알 수 없는 요청이에요.", 400);

  const pin = checkHostPin(request);
  if (pin === "wrong") return errorResponse("사회자 비밀번호가 틀렸어요.", 401);
  if (isHostAction(action) && pin !== "ok")
    return errorResponse("사회자만 할 수 있는 동작이에요.", 401);

  const store = getSessionStore();
  const [state, requester] = await Promise.all([store.read(), identify(request, pin === "ok")]);

  switch (action.type) {
    case "verify":
      break;

    case "start": {
      if (state.session) break; // 이미 시작된 게임은 그대로 둔다 (두 번 눌러도 안전)
      const invalid = validateMembers(MEMBERS);
      if (invalid) return errorResponse(invalid, 400);
      await store.clearViewed();
      await store.writeSession(createSession(MEMBERS, MISSIONS));
      break;
    }

    case "redrawAll": {
      const invalid = validateMembers(MEMBERS);
      if (invalid) return errorResponse(invalid, 400);
      await store.clearViewed();
      await store.writeSession(createSession(MEMBERS, MISSIONS));
      break;
    }

    case "redrawMissions": {
      if (!state.session) return errorResponse("아직 게임이 시작되지 않았어요.", 409);
      if (state.session.phase === "reveal")
        return errorResponse("공개가 시작된 뒤에는 바꿀 수 없어요.", 409);
      if (!state.session.assignments[action.name])
        return errorResponse("명단에 없는 이름이에요.", 400);
      await store.writeSession(redrawMissions(state.session, action.name, MISSIONS));
      await store.unmarkViewed(action.name);
      break;
    }

    case "startReveal": {
      if (!state.session) return errorResponse("아직 게임이 시작되지 않았어요.", 409);
      await store.writeSession(startReveal(state.session));
      break;
    }

    case "revealNext": {
      if (!state.session) return errorResponse("아직 게임이 시작되지 않았어요.", 409);
      await store.writeSession(revealNext(state.session));
      break;
    }

    case "viewed": {
      if (!state.session) return errorResponse("아직 게임이 시작되지 않았어요.", 409);
      if (!requester.me) return errorResponse("먼저 참여자 등록을 해 주세요.", 401);
      if (!state.session.assignments[requester.me])
        return errorResponse("명단에 없는 이름이에요.", 400);
      await store.markViewed(requester.me);
      break;
    }
  }

  return buildResponse(await store.read(), requester);
}

/** 세션과 확인 기록을 모두 지워 시작 전 상태로 되돌린다 (사회자 전용). */
export async function clearState(request: Request): Promise<Response> {
  if (checkHostPin(request) !== "ok") return errorResponse("사회자만 할 수 있는 동작이에요.", 401);
  await getSessionStore().clear();
  return new Response(null, { status: 204 });
}
