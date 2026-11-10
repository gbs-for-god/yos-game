import { createStorageStore } from "@/lib/hooks/useStoredValue";
import {
  restoreGameState,
  resetAllQuizzes,
  selectTheme,
  serializeGameState,
  totalRevealed,
  withQuiz,
  type GameState,
  type QuizState,
  type ThemeId,
} from "./logic";
import { SONGS } from "./songs";

/**
 * 진행 상태(선택한 테마, 테마별 곡 순서·현재 곡·공개한 곡)를 이 기기의 localStorage 에 저장한다.
 * 새로고침, 다른 페이지(/host)로 이동, 다른 탭에서도 같은 상태를 본다.
 */
export const gameStore = createStorageStore("local", "yos-game:kpop-quiz:state");

/** 저장된 값을 읽어 지금 상태를 만든다 (없으면 처음 상태) */
export function loadGameState(): GameState {
  return restoreGameState(gameStore.getSnapshot(), SONGS);
}

function saveGameState(state: GameState) {
  gameStore.save(serializeGameState(state));
}

/** 한 테마의 퀴즈를 가장 최근 저장 값 기준으로 바꿔 저장한다 (단축키처럼 오래된 화면 값을 쥔 곳에서도 안전) */
export function updateQuiz(theme: ThemeId, change: (quiz: QuizState) => QuizState) {
  saveGameState(withQuiz(loadGameState(), theme, change));
}

/** 테마를 고른다. null 이면 테마 선택 화면으로 돌아간다 */
export function chooseTheme(theme: ThemeId | null) {
  saveGameState(selectTheme(loadGameState(), theme));
}

/** 사회자 메뉴의 "게임 초기화": 모든 테마의 공개를 되돌리고 순서를 섞는다. 되돌리기 전에 공개했던 곡 수를 돌려준다 */
export function resetAllStoredQuizzes(random?: () => number): number {
  const before = loadGameState();
  saveGameState(resetAllQuizzes(before, random));
  return totalRevealed(before);
}
