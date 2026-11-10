/**
 * K-pop 노래 맞추기의 순수 로직.
 * React/브라우저/YouTube API 에 의존하지 않는다 (재생은 useSongPlayer, 화면은 Game.tsx 담당).
 *
 * 용어
 * - 곡(song): 문제로 낼 노래 한 곡. startTime 은 문제 재생을 시작할 지점(초)이다
 * - 퀴즈(quiz): 곡 순서(songs)와 지금 보고 있는 곡(index), 정답 공개 여부(revealed)
 */

export type Song = {
  id: string;
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
  songs: readonly Song[];
  index: number;
  revealed: boolean;
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

export function createQuiz(songs: readonly Song[]): QuizState {
  return { songs, index: 0, revealed: false };
}

export function currentSong(state: QuizState): Song {
  return state.songs[state.index];
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

/** 이전/다음 곡으로 옮긴다. 처음/끝에서는 그대로 두고, 곡이 바뀌면 정답은 다시 가린다. */
export function moveBy(state: QuizState, delta: 1 | -1): QuizState {
  const index = Math.min(Math.max(state.index + delta, 0), state.songs.length - 1);
  if (index === state.index) return state;
  return { ...state, index, revealed: false };
}

export function revealAnswer(state: QuizState): QuizState {
  return state.revealed ? state : { ...state, revealed: true };
}

/** Fisher–Yates 셔플. 원본은 바꾸지 않는다. 섞은 뒤에는 처음 곡부터 다시 시작한다. */
export function shuffleQuiz(state: QuizState, random: () => number = Math.random): QuizState {
  const songs = [...state.songs];
  for (let i = songs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [songs[i], songs[j]] = [songs[j], songs[i]];
  }
  return { songs, index: 0, revealed: false };
}
