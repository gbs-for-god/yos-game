/**
 * 마니또 미션 게임의 순수 로직.
 * React/브라우저/서버 API에 의존하지 않도록 유지한다 (UI는 화면 컴포넌트, 저장은 server/ 가 담당).
 *
 * 용어
 * - 멤버(member): 게임에 참여하는 모든 사람 = 사회자 1명 + 참여자 여러 명
 * - 마니또(manito): 내가 몰래 섬겨야 하는 상대. 모든 멤버가 서로 다른 한 사람을 마니또로 갖는다
 * - 세션(session): 한 번의 게임 전체 배정. 서버(Redis)에 저장되어 모든 기기가 같은 세션을 본다
 * - 확인(viewed): 멤버가 자기 결과를 봤는지. 세션과 별도로 저장해 여러 기기가 동시에 기록해도 안전하다
 */

export type Mission = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** 미션 수행 기한 (예: "오늘 모임 끝까지") */
  timeLimit: string;
};

/** data/members.json 의 형태 */
export type Members = {
  /** 사회자 비밀번호 기본값. 운영 환경에서는 MANITO_HOST_PIN 환경 변수로 덮어쓴다 */
  hostPin: string;
  /** 사회자(관리자) 이름. 사회자도 게임에 참여한다 */
  host: string;
  /** 참여자 이름 목록 (사회자 제외) */
  participants: string[];
};

export type Assignment = {
  /** 이 멤버가 섬겨야 할 마니또 이름 */
  manito: string;
  /** 이 멤버에게 배정된 미션 id 목록 (MISSIONS_PER_MEMBER 개) */
  missionIds: string[];
};

export type Phase = "playing" | "reveal";

/** 서버에 저장되는 배정 전체. 사회자 동작으로만 바뀐다 */
export type Session = {
  version: 2;
  createdAt: number;
  hostName: string;
  /** 사회자 포함 전체 멤버 이름. 공개 순서로도 쓰인다 (사회자가 맨 마지막) */
  memberNames: string[];
  assignments: Record<string, Assignment>;
  phase: Phase;
  /** 공개 화면에서 지금까지 공개한 인원 수 */
  revealedCount: number;
};

/** 멤버 이름 → 확인 여부 */
export type ViewedMap = Record<string, boolean>;

/** 모든 기기(참여자 휴대폰 포함)에 내려줘도 되는 정보. 남의 마니또는 공개된 것만 포함한다 */
export type PublicSession = {
  createdAt: number;
  hostName: string;
  memberNames: string[];
  phase: Phase;
  revealedCount: number;
  viewed: ViewedMap;
  /** 공개 단계에서 이미 공개된 멤버들의 배정. 그 외에는 빈 객체 */
  revealed: Record<string, Assignment>;
};

/** 사회자가 비밀번호와 함께 보내는 동작 */
export type HostAction =
  | { type: "verify" }
  | { type: "start" }
  | { type: "redrawAll" }
  | { type: "redrawMissions"; name: string }
  | { type: "startReveal" }
  | { type: "revealNext" };

/** 누구나 보낼 수 있는 동작 */
export type ParticipantAction = { type: "viewed"; name: string };

export type Action = HostAction | ParticipantAction;

export const MISSIONS_PER_MEMBER = 3;
export const MIN_MEMBERS = 2;

/** 사회자를 마지막에 두어 공개 때 가장 큰 긴장감을 만든다. */
export function listMemberNames(members: Members): string[] {
  return [...members.participants, members.host];
}

/** 명단 유효성 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지를 돌려준다. */
export function validateMembers(members: Members): string | null {
  const names = listMemberNames(members).map((n) => n.trim());
  if (names.some((n) => n.length === 0)) return "이름이 비어 있는 항목이 있어요.";
  if (new Set(names).size !== names.length) return "같은 이름이 두 번 이상 있어요.";
  if (names.length < MIN_MEMBERS) return `게임을 하려면 최소 ${MIN_MEMBERS}명이 필요해요.`;
  return null;
}

/** Fisher–Yates 셔플. 원본은 바꾸지 않는다. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 마니또 배정: 아무도 자기 자신을 뽑지 않고, 모든 사람이 정확히 한 번씩 마니또가 된다.
 * 섞은 순서대로 "다음 사람"을 마니또로 삼는 하나의 큰 원을 만들면 조건이 항상 만족된다.
 */
export function assignManitos(
  names: readonly string[],
  random: () => number,
): Record<string, string> {
  const order = shuffle(names, random);
  const result: Record<string, string> = {};
  order.forEach((name, i) => {
    result[name] = order[(i + 1) % order.length];
  });
  return result;
}

/**
 * 멤버마다 서로 다른 미션 `count`개를 나눠준다.
 * 섞은 카드 더미에서 차례로 꺼내 주고, 더미가 떨어지면 다시 섞어 채운다
 * → 미션 수가 충분할 때는 멤버끼리 겹치지 않고, 부족할 때도 최대한 고르게 분배된다.
 */
export function dealMissions(
  names: readonly string[],
  missions: readonly Mission[],
  count: number,
  random: () => number,
): Record<string, string[]> {
  const perMember = Math.min(count, missions.length);
  let deck: string[] = [];
  const result: Record<string, string[]> = {};

  for (const name of names) {
    const hand: string[] = [];
    while (hand.length < perMember) {
      if (deck.length === 0) {
        deck = shuffle(
          missions.map((m) => m.id),
          random,
        );
      }
      const id = deck.pop() as string;
      if (!hand.includes(id)) hand.push(id);
    }
    result[name] = hand;
  }
  return result;
}

/** 한 사람의 미션만 새로 뽑는다 (사회자 "미션 다시 뽑기"). 기존 것과 최대한 겹치지 않게 고른다. */
export function pickMissions(
  missions: readonly Mission[],
  count: number,
  random: () => number,
  exclude: readonly string[] = [],
): string[] {
  const perMember = Math.min(count, missions.length);
  const fresh = shuffle(
    missions.filter((m) => !exclude.includes(m.id)).map((m) => m.id),
    random,
  );
  if (fresh.length >= perMember) return fresh.slice(0, perMember);
  const fallback = shuffle(exclude, random);
  return [...fresh, ...fallback].slice(0, perMember);
}

export type CreateSessionOptions = {
  random?: () => number;
  now?: () => number;
};

export function createSession(
  members: Members,
  missions: readonly Mission[],
  { random = Math.random, now = Date.now }: CreateSessionOptions = {},
): Session {
  const memberNames = listMemberNames(members);
  const manitos = assignManitos(memberNames, random);
  const dealt = dealMissions(memberNames, missions, MISSIONS_PER_MEMBER, random);

  const assignments: Record<string, Assignment> = {};
  for (const name of memberNames) {
    assignments[name] = { manito: manitos[name], missionIds: dealt[name] };
  }

  return {
    version: 2,
    createdAt: now(),
    hostName: members.host,
    memberNames,
    assignments,
    phase: "playing",
    revealedCount: 0,
  };
}

/** 사회자 전용: 특정 멤버의 미션만 다시 뽑는다. 마니또는 그대로 둔다. */
export function redrawMissions(
  session: Session,
  name: string,
  missions: readonly Mission[],
  random: () => number = Math.random,
): Session {
  const current = session.assignments[name];
  if (!current) return session;
  const missionIds = pickMissions(missions, MISSIONS_PER_MEMBER, random, current.missionIds);
  return {
    ...session,
    assignments: { ...session.assignments, [name]: { ...current, missionIds } },
  };
}

/** 사회자가 "게임 종료"를 누르면 공개 단계로 넘어간다. */
export function startReveal(session: Session): Session {
  if (session.phase === "reveal") return session;
  return { ...session, phase: "reveal", revealedCount: 0 };
}

/** 공개 화면에서 다음 사람을 공개한다. */
export function revealNext(session: Session): Session {
  if (session.phase !== "reveal") return session;
  if (session.revealedCount >= session.memberNames.length) return session;
  return { ...session, revealedCount: session.revealedCount + 1 };
}

export function isRevealComplete(
  session: Pick<Session, "phase" | "revealedCount" | "memberNames">,
) {
  return session.phase === "reveal" && session.revealedCount >= session.memberNames.length;
}

/** 저장된 세션의 명단이 현재 members.json 과 같은지 확인한다 (명단 수정 후 다시 뽑기 안내용). */
export function hasSameMembers(
  session: Pick<Session, "hostName" | "memberNames">,
  members: Members,
) {
  const current = listMemberNames(members);
  return (
    session.hostName === members.host &&
    session.memberNames.length === current.length &&
    session.memberNames.every((name, i) => name === current[i])
  );
}

/** id → 미션 객체 조회. 데이터 파일에서 삭제된 미션은 건너뛴다. */
export function resolveMissions(ids: readonly string[], missions: readonly Mission[]): Mission[] {
  return ids
    .map((id) => missions.find((m) => m.id === id))
    .filter((m): m is Mission => m !== undefined);
}

/** 세션 + 확인 기록 → 모든 기기에 내려줘도 되는 공개 정보 */
export function toPublicSession(session: Session, viewed: ViewedMap): PublicSession {
  const revealed: Record<string, Assignment> = {};
  if (session.phase === "reveal") {
    for (const name of session.memberNames.slice(0, session.revealedCount)) {
      revealed[name] = session.assignments[name];
    }
  }
  return {
    createdAt: session.createdAt,
    hostName: session.hostName,
    memberNames: session.memberNames,
    phase: session.phase,
    revealedCount: session.revealedCount,
    viewed: Object.fromEntries(session.memberNames.map((n) => [n, viewed[n] === true])),
    revealed,
  };
}

/** 저장소에서 읽은 알 수 없는 값을 Session 으로 안전하게 변환한다. 형식이 다르면 null. */
export function parseSession(raw: unknown): Session | null {
  if (raw === null || raw === undefined || raw === "") return null;
  try {
    const value: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!isRecord(value) || value.version !== 2) return null;
    if (typeof value.hostName !== "string" || !Array.isArray(value.memberNames)) return null;
    if (!isRecord(value.assignments)) return null;
    if (value.phase !== "playing" && value.phase !== "reveal") return null;
    if (typeof value.revealedCount !== "number" || typeof value.createdAt !== "number") return null;
    return value as Session;
  } catch {
    return null;
  }
}

/** 요청 본문(알 수 없는 값)을 Action 으로 변환한다. 형식이 다르면 null. */
export function parseAction(value: unknown): Action | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  switch (value.type) {
    case "verify":
    case "start":
    case "redrawAll":
    case "startReveal":
    case "revealNext":
      return { type: value.type };
    case "redrawMissions":
    case "viewed":
      return typeof value.name === "string" ? { type: value.type, name: value.name } : null;
    default:
      return null;
  }
}

export function isHostAction(action: Action): action is HostAction {
  return action.type !== "viewed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
