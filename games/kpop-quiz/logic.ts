/**
 * 노래 맞추기의 순수 로직.
 * React/브라우저/YouTube API 에 의존하지 않는다 (재생은 useSongPlayer, 화면은 Game.tsx 담당).
 *
 * 용어
 * - 테마(theme): 곡을 묶는 분류 (2000년대, 2010년대, CCM). 사회자가 하나를 골라 그 테마의 곡만 낸다
 * - 곡(song): 문제로 낼 노래 한 곡. startTime 은 문제 재생을 시작할 지점(초)이다
 * - 퀴즈(quiz): 한 테마의 곡 순서(songs)와 지금 보고 있는 곡(index), 정답 공개 여부(revealed)
 * - 진행 상태(state): 선택한 테마와 테마별 퀴즈 전체. 테마마다 순서·공개 여부를 따로 기억한다
 */

/** 선택할 수 있는 테마. 화면에는 이 순서대로 보인다 */
export const THEMES = [
  { id: "2000s", label: "2000년대", emoji: "🎤" },
  { id: "2010s", label: "2010년대", emoji: "🎧" },
  { id: "ccm", label: "CCM", emoji: "🙏" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function themeLabel(id: ThemeId): string {
  return THEMES.find((theme) => theme.id === id)?.label ?? id;
}

export type Song = {
  id: string;
  /** 이 곡이 속한 테마 */
  theme: ThemeId;
  title: string;
  artist: string;
  /** 유튜브 영상 ID (11자) */
  youtubeId: string;
  /** 문제 재생 시작 지점(초). 없으면 0 */
  startTime?: number;
  /** 코러스(후렴) 시작 지점(초). 없으면 코러스 듣기 버튼이 꺼진다 */
  chorusStart?: number;
};

export type QuizState = {
  /** 지금 곡 순서 (섞으면 바뀐다) */
  songs: readonly Song[];
  index: number;
  /** 정답을 공개한 곡의 id. 곡을 옮겨도, 새로고침해도 공개 상태로 남는다 */
  revealed: readonly string[];
};

/** "앞부분 N초 듣기" 버튼에 쓰는 길이(초) */
export const SNIPPET_SECONDS = [1, 3] as const;

/** "코러스 듣기" 버튼이 코러스 시작 지점부터 들려주는 길이(초) */
export const CHORUS_SECONDS = 15;

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** 곡 목록 유효성 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지를 돌려준다. */
export function validateSongs(songs: readonly Song[]): string | null {
  if (songs.length === 0) return "곡이 하나도 없어요. data/songs.json 을 확인해 주세요.";
  const ids = new Set<string>();
  for (const song of songs) {
    if (!song.id || !song.title.trim() || !song.artist.trim())
      return `곡 정보가 비어 있어요: ${song.id || "(id 없음)"}`;
    if (!isThemeId(song.theme))
      return `theme 은 ${THEMES.map((t) => t.id).join(", ")} 중 하나여야 해요: ${song.id}`;
    if (ids.has(song.id)) return `곡 id 가 겹쳐요: ${song.id}`;
    ids.add(song.id);
    if (!YOUTUBE_ID_PATTERN.test(song.youtubeId))
      return `유튜브 영상 ID 형식이 올바르지 않아요: ${song.id}`;
    if (song.startTime !== undefined && !(song.startTime >= 0))
      return `startTime 은 0 이상이어야 해요: ${song.id}`;
    if (song.chorusStart !== undefined && !(song.chorusStart >= 0))
      return `chorusStart 는 0 이상이어야 해요: ${song.id}`;
  }
  return null;
}

/** 한 테마에 속한 곡만 골라 낸다 (목록 순서 유지) */
export function songsOfTheme(songs: readonly Song[], theme: ThemeId): Song[] {
  return songs.filter((song) => song.theme === theme);
}

export function createQuiz(songs: readonly Song[]): QuizState {
  return { songs, index: 0, revealed: [] };
}

export function currentSong(state: QuizState): Song {
  return state.songs[state.index];
}

/** 이 곡(기본: 지금 곡)의 정답을 이미 공개했는지 */
export function isRevealed(state: QuizState, song: Song = currentSong(state)): boolean {
  return state.revealed.includes(song.id);
}

export function revealedCount(state: QuizState): number {
  return state.revealed.length;
}

/** 문제 재생 시작 지점(초) */
export function startSeconds(song: Song): number {
  return song.startTime ?? 0;
}
/** 코러스 시작 지점이 정해져 있으면 그 값, 없으면 null */
export function chorusSeconds(song: Song): number | null {
  return song.chorusStart ?? null;
}

export function hasPrev(state: QuizState): boolean {
  return state.index > 0;
}

export function hasNext(state: QuizState): boolean {
  return state.index < state.songs.length - 1;
}

/** 이전/다음 곡으로 옮긴다. 처음/끝에서는 그대로 둔다. 이미 공개한 곡은 계속 공개 상태다. */
export function moveBy(state: QuizState, delta: 1 | -1): QuizState {
  const index = Math.min(Math.max(state.index + delta, 0), state.songs.length - 1);
  return index === state.index ? state : { ...state, index };
}

/** 지금 곡의 정답을 공개한다. 한 번 공개하면 초기화(resetQuiz)하기 전까지 계속 공개 상태다. */
export function revealAnswer(state: QuizState): QuizState {
  return isRevealed(state)
    ? state
    : { ...state, revealed: [...state.revealed, currentSong(state).id] };
}

/** Fisher–Yates 셔플. 원본은 바꾸지 않는다. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 곡 순서를 섞고 처음 곡으로 돌아간다. 이미 공개한 곡은 그대로 공개 상태로 둔다. */
export function shuffleQuiz(state: QuizState, random: () => number = Math.random): QuizState {
  return { ...state, songs: shuffled(state.songs, random), index: 0 };
}

/**
 * 게임 초기화: 공개한 정답을 모두 다시 가리고 곡 순서를 한 번 섞어 처음 곡으로 돌아간다.
 * 섞은 결과가 지금 순서와 똑같으면(운 나쁘게 같은 순서가 나오면) 앞의 두 곡을 맞바꿔 반드시 달라지게 한다.
 */
export function resetQuiz(state: QuizState, random: () => number = Math.random): QuizState {
  let songs = shuffled(state.songs, random);
  if (songs.length > 1 && songs.every((song, i) => song.id === state.songs[i].id)) {
    songs = [songs[1], songs[0], ...songs.slice(2)];
  }
  return { songs, index: 0, revealed: [] };
}

/** 이 기기에 저장하는 한 테마의 진행 상태. 곡 정보는 data/songs.json 이 원본이라 id 만 저장한다 */
type StoredQuiz = { order: string[]; index: number; revealed: string[] };

function quizToStored(state: QuizState): StoredQuiz {
  return {
    order: state.songs.map((song) => song.id),
    index: state.index,
    revealed: [...state.revealed],
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * 저장된 한 테마의 진행 상태를 그 테마의 곡 목록에 맞춰 복원한다.
 * 곡 목록이 바뀌었어도 안전하게: 없어진 곡은 버리고, 새로 생긴 곡은 순서 맨 뒤에 붙인다.
 * 값이 없거나 손상되었으면 처음 상태(createQuiz)를 돌려준다.
 */
function quizFromStored(value: unknown, songs: readonly Song[]): QuizState {
  if (typeof value !== "object" || value === null) return createQuiz(songs);
  const { order, index, revealed } = value as Record<string, unknown>;
  if (!isStringArray(order) || !isStringArray(revealed) || typeof index !== "number")
    return createQuiz(songs);

  const byId = new Map(songs.map((song) => [song.id, song]));
  const ordered: Song[] = [];
  for (const id of order) {
    const song = byId.get(id);
    if (song && !ordered.includes(song)) ordered.push(song);
  }
  for (const song of songs) if (!ordered.includes(song)) ordered.push(song);

  return {
    songs: ordered,
    index: Math.min(Math.max(Math.trunc(index), 0), Math.max(ordered.length - 1, 0)),
    revealed: [...new Set(revealed)].filter((id) => byId.has(id)),
  };
}

/** 게임 전체 진행 상태: 선택한 테마(없으면 null = 테마 선택 화면)와 테마별 퀴즈 */
export type GameState = {
  theme: ThemeId | null;
  quizzes: Record<ThemeId, QuizState>;
};

export function createGameState(songs: readonly Song[]): GameState {
  return {
    theme: null,
    quizzes: Object.fromEntries(
      THEMES.map(({ id }) => [id, createQuiz(songsOfTheme(songs, id))]),
    ) as Record<ThemeId, QuizState>,
  };
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify({
    theme: state.theme,
    quizzes: Object.fromEntries(THEMES.map(({ id }) => [id, quizToStored(state.quizzes[id])])),
  });
}

/**
 * 저장된 값을 곡 목록에 맞춰 복원한다. 값이 없거나 손상되었으면 처음 상태.
 * 테마 기능이 생기기 전에 저장된 값(테마 없이 순서·공개만 있는 형식)은 "2000년대" 진행 상태로 옮긴다.
 */
export function restoreGameState(raw: string | null, songs: readonly Song[]): GameState {
  const state = createGameState(songs);
  if (!raw) return state;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return state;
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.order)) {
      state.quizzes["2000s"] = quizFromStored(record, songsOfTheme(songs, "2000s"));
      return state;
    }

    const stored =
      typeof record.quizzes === "object" && record.quizzes !== null
        ? (record.quizzes as Record<string, unknown>)
        : {};
    for (const { id } of THEMES) {
      state.quizzes[id] = quizFromStored(stored[id], songsOfTheme(songs, id));
    }
    // 곡이 하나도 없는 테마는 고를 수 없으므로 선택 상태로 남기지 않는다
    if (isThemeId(record.theme) && state.quizzes[record.theme].songs.length > 0) {
      state.theme = record.theme;
    }
    return state;
  } catch {
    return createGameState(songs);
  }
}

/** 테마를 고른다. null 이면 테마 선택 화면으로 돌아간다 */
export function selectTheme(state: GameState, theme: ThemeId | null): GameState {
  return { ...state, theme };
}

/** 한 테마의 퀴즈만 바꾼다 */
export function withQuiz(
  state: GameState,
  theme: ThemeId,
  change: (quiz: QuizState) => QuizState,
): GameState {
  return { ...state, quizzes: { ...state.quizzes, [theme]: change(state.quizzes[theme]) } };
}

/** 모든 테마를 초기화한다(공개한 정답을 모두 가리고 테마마다 곡 순서를 한 번 섞는다). 선택한 테마는 그대로 둔다 */
export function resetAllQuizzes(state: GameState, random: () => number = Math.random): GameState {
  return {
    ...state,
    quizzes: Object.fromEntries(
      THEMES.map(({ id }) => [id, resetQuiz(state.quizzes[id], random)]),
    ) as Record<ThemeId, QuizState>,
  };
}

/** 모든 테마에서 공개한 곡의 수 */
export function totalRevealed(state: GameState): number {
  return THEMES.reduce((sum, { id }) => sum + state.quizzes[id].revealed.length, 0);
}
