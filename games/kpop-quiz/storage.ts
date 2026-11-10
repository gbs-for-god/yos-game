import { createStorageStore } from "@/lib/hooks/useStoredValue";
import { resetQuiz, restoreQuiz, serializeQuiz, type QuizState } from "./logic";
import { SONGS } from "./songs";

/**
 * 진행 상태(곡 순서·현재 곡·공개한 곡)를 이 기기의 localStorage 에 저장한다.
 * 새로고침, 다른 페이지(/host)로 이동, 다른 탭에서도 같은 상태를 본다.
 */
export const quizStore = createStorageStore("local", "yos-game:kpop-quiz:state");

/** 저장된 값을 읽어 지금 상태를 만든다 (없으면 처음 상태) */
export function loadQuiz(): QuizState {
  return restoreQuiz(quizStore.getSnapshot(), SONGS);
}

/** 가장 최근 저장 값을 바탕으로 상태를 바꿔 저장한다 (단축키처럼 오래된 화면 값을 쥐고 있는 곳에서도 안전) */
export function updateQuiz(change: (state: QuizState) => QuizState) {
  quizStore.save(serializeQuiz(change(loadQuiz())));
}

/** 사회자 메뉴의 "게임 초기화": 공개한 정답을 모두 가리고 순서를 한 번 섞는다. 지우기 전에 공개했던 곡 수를 돌려준다 */
export function resetStoredQuiz(random?: () => number): number {
  const before = loadQuiz();
  quizStore.save(serializeQuiz(resetQuiz(before, random)));
  return before.revealed.length;
}
