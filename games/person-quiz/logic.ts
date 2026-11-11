/**
 * 인물 맞추기 규칙 — 순수 함수만 둔다 (React/DOM 의존 없음, 무작위는 인자로 주입).
 *
 * - 인물(person): 사진과 정답 이름. 총 120명(12제자 × 10장).
 * - 그룹(group): 제자 한 명에 배정된 10명의 사진 세트. 진행 상태(현재 사진, 공개한 이름, 단계)를 따로 가진다
 * - 상태(state): 지금 열어 둔 그룹(없으면 메인 메뉴)과 12개 그룹 전체
 */

export type Person = {
  id: string;
  /** 정답 이름 */
  name: string;
  /** 사진 주소. `/games/person-quiz/images/...` 같은 로컬 경로 또는 http(s) 주소 */
  image: string;
};

export type Disciple = {
  id: string;
  label: string;
  /** 이름이 같은 제자를 구분하는 보조 설명 */
  note?: string;
};

/** 메인 메뉴에 보이는 순서대로의 12제자 */
export const DISCIPLES: readonly Disciple[] = [
  { id: "peter", label: "베드로" },
  { id: "andrew", label: "안드레" },
  { id: "james-zebedee", label: "야고보", note: "세베대의 아들" },
  { id: "john", label: "요한" },
  { id: "philip", label: "빌립" },
  { id: "bartholomew", label: "바돌로매" },
  { id: "thomas", label: "도마" },
  { id: "matthew", label: "마태" },
  { id: "james-alphaeus", label: "야고보", note: "알패오의 아들" },
  { id: "thaddaeus", label: "다대오" },
  { id: "simon", label: "시몬" },
  { id: "judas", label: "가룟 유다" },
];

/** 한 제자(그룹)가 가지는 사진 수 */
export const GROUP_SIZE = 10;
export const TOTAL_PEOPLE = DISCIPLES.length * GROUP_SIZE;

/** quiz: 사진 보며 맞히는 중 · end: 10장 끝, 안내 화면 · results: 결과 요약 화면 */
export type Stage = "quiz" | "end" | "results";

export type GroupState = {
  /** 이 그룹의 출제 순서 (인물 id 10개) */
  ids: string[];
  index: number;
  stage: Stage;
  /** 이름을 공개한 인물 id */
  revealed: string[];
  /** "결과 확인"까지 마쳤는지 (메인 메뉴 카드에 표시) */
  checked: boolean;
};

export type GameState = {
  /** 열어 둔 그룹의 번호. null 이면 메인 메뉴 */
  open: number | null;
  groups: GroupState[];
};

/** 인물 목록 유효성 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지를 돌려준다 */
export function validatePeople(people: readonly Person[]): string | null {
  if (people.length !== TOTAL_PEOPLE)
    return `인물은 정확히 ${TOTAL_PEOPLE}명이어야 해요 (지금 ${people.length}명). data/people.json 을 확인해 주세요.`;
  const ids = new Set<string>();
  for (const person of people) {
    if (!person.id || !person.name.trim() || !person.image.trim())
      return `인물 정보가 비어 있어요: ${person.id || "(id 없음)"}`;
    if (ids.has(person.id)) return `인물 id 가 겹쳐요: ${person.id}`;
    ids.add(person.id);
  }
  return null;
}

/** Fisher-Yates 셔플 (원본은 바꾸지 않는다) */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createGroup(ids: string[]): GroupState {
  return { ids, index: 0, stage: "quiz", revealed: [], checked: false };
}

function dealGroups(ids: readonly string[]): GroupState[] {
  return DISCIPLES.map((_, i) => createGroup(ids.slice(i * GROUP_SIZE, (i + 1) * GROUP_SIZE)));
}

/** 처음 상태: 데이터 순서대로 10명씩 나눈다 (무작위 없음 → 서버/클라이언트에서 항상 같다) */
export function createGameState(people: readonly Person[]): GameState {
  return { open: null, groups: dealGroups(people.map((person) => person.id)) };
}

/** 전체 리셋: 120명을 완전히 다시 섞어 12그룹에 10명씩 재분배하고 모든 진행을 지운다 */
export function resetAll(people: readonly Person[], random: () => number = Math.random): GameState {
  return {
    open: null,
    groups: dealGroups(
      shuffle(
        people.map((p) => p.id),
        random,
      ),
    ),
  };
}

export function openGroup(state: GameState, open: number): GameState {
  return open >= 0 && open < state.groups.length ? { ...state, open } : state;
}

export function closeGroup(state: GameState): GameState {
  return { ...state, open: null };
}

/** 열어 둔 그룹의 상태만 바꾼다 (열어 둔 그룹이 없으면 그대로) */
export function updateOpenGroup(
  state: GameState,
  change: (group: GroupState) => GroupState,
): GameState {
  const { open } = state;
  if (open === null) return state;
  return { ...state, groups: state.groups.map((g, i) => (i === open ? change(g) : g)) };
}

export function currentPersonId(group: GroupState): string {
  return group.ids[group.index];
}

export function isRevealed(group: GroupState): boolean {
  return group.revealed.includes(currentPersonId(group));
}

/** 다음 사진. 마지막 사진에서는 "게임 종료" 안내 단계로 넘어간다 */
export function nextPhoto(group: GroupState): GroupState {
  if (group.stage !== "quiz") return group;
  if (group.index < group.ids.length - 1) return { ...group, index: group.index + 1 };
  return { ...group, stage: "end" };
}

/** 이전 사진. 종료 안내에서는 마지막 사진으로 돌아간다 */
export function prevPhoto(group: GroupState): GroupState {
  if (group.stage === "end") return { ...group, stage: "quiz" };
  if (group.stage === "quiz" && group.index > 0) return { ...group, index: group.index - 1 };
  return group;
}

/** 현재 사진의 이름 공개 / 가리기 */
export function toggleReveal(group: GroupState): GroupState {
  if (group.stage !== "quiz") return group;
  const id = currentPersonId(group);
  return {
    ...group,
    revealed: group.revealed.includes(id)
      ? group.revealed.filter((r) => r !== id)
      : [...group.revealed, id],
  };
}

/** "결과 확인": 요약 화면으로 가고, 메인 메뉴 카드에 확인 완료 표시가 붙는다 */
export function showResults(group: GroupState): GroupState {
  return group.stage === "end" || group.stage === "results"
    ? { ...group, stage: "results", checked: true }
    : group;
}

export function backToEnd(group: GroupState): GroupState {
  return group.stage === "results" ? { ...group, stage: "end" } : group;
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

function isStage(value: unknown): value is Stage {
  return value === "quiz" || value === "end" || value === "results";
}

/**
 * 저장된 값을 읽어 상태를 만든다. 없거나 깨졌거나 지금 인물 목록과 맞지 않으면(데이터가 바뀐 경우 등)
 * 처음 상태를 돌려준다.
 */
export function restoreGameState(raw: string | null, people: readonly Person[]): GameState {
  const fresh = createGameState(people);
  if (raw === null) return fresh;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return fresh;
    const { open, groups } = data as { open?: unknown; groups?: unknown };
    if (!Array.isArray(groups) || groups.length !== DISCIPLES.length) return fresh;

    const known = new Set(people.map((p) => p.id));
    const seen = new Set<string>();
    const restored: GroupState[] = [];
    for (const g of groups as Record<string, unknown>[]) {
      const ids = g?.ids;
      if (!Array.isArray(ids) || ids.length !== GROUP_SIZE) return fresh;
      for (const id of ids) {
        if (typeof id !== "string" || !known.has(id) || seen.has(id)) return fresh;
        seen.add(id);
      }
      const index = g.index;
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= GROUP_SIZE)
        return fresh;
      if (!isStage(g.stage)) return fresh;
      const revealed = Array.isArray(g.revealed)
        ? g.revealed.filter((id): id is string => typeof id === "string" && ids.includes(id))
        : [];
      restored.push({
        ids: ids as string[],
        index,
        stage: g.stage,
        revealed,
        checked: g.checked === true,
      });
    }
    const validOpen =
      typeof open === "number" && Number.isInteger(open) && open >= 0 && open < restored.length
        ? open
        : null;
    return { open: validOpen, groups: restored };
  } catch {
    return fresh;
  }
}

/** 사진 파일이 없을 때 대신 보여 줄 자리표시 이미지 (인터넷 없이도 보이는 SVG) */
export function placeholderImage(person: Person): string {
  const number = person.id.match(/\d+$/)?.[0] ?? person.id;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">` +
    `<rect width="800" height="600" fill="#27272a"/>` +
    `<text x="400" y="290" font-size="200" text-anchor="middle" fill="#a1a1aa" font-family="sans-serif" font-weight="900">${number}</text>` +
    `<text x="400" y="390" font-size="48" text-anchor="middle" fill="#71717a" font-family="sans-serif">사진 없음</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
