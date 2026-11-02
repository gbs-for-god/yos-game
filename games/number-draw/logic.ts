/**
 * 번호 뽑기 게임의 순수 로직.
 * React/브라우저 API에 의존하지 않도록 유지한다 (UI는 Game.tsx에서 담당).
 */

export type DrawState = {
  max: number;
  remaining: number[];
  drawn: number[];
};

export function createDrawState(max: number): DrawState {
  const safeMax = Math.max(1, Math.floor(max));
  return {
    max: safeMax,
    remaining: Array.from({ length: safeMax }, (_, i) => i + 1),
    drawn: [],
  };
}

/** `random`은 테스트에서 결정적인 값을 주입할 수 있도록 인자로 받는다. */
export function drawNext(state: DrawState, random: () => number = Math.random): DrawState {
  if (state.remaining.length === 0) return state;
  const index = Math.floor(random() * state.remaining.length);
  const picked = state.remaining[index];
  return {
    ...state,
    remaining: state.remaining.filter((_, i) => i !== index),
    drawn: [...state.drawn, picked],
  };
}
