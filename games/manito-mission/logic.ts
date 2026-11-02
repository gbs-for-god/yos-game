/**
 * 마니또 미션 뽑기의 순수 로직.
 * React/브라우저 API에 의존하지 않도록 유지한다 (UI는 Game.tsx에서 담당).
 */

export type Mission = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** 미션 수행 기한 (예: "오늘 모임 끝까지") */
  timeLimit: string;
};

export type MissionDrawState = {
  /** 아직 뽑히지 않은 미션 */
  remaining: Mission[];
  /** 뽑힌 순서대로 쌓인 미션 (마지막이 현재 미션) */
  drawn: Mission[];
};

export function createMissionDrawState(missions: readonly Mission[]): MissionDrawState {
  return { remaining: [...missions], drawn: [] };
}

/** 남은 미션 중 하나를 중복 없이 뽑는다. `random`은 테스트에서 결정적인 값을 주입하기 위한 인자. */
export function drawMission(
  state: MissionDrawState,
  random: () => number = Math.random,
): MissionDrawState {
  if (state.remaining.length === 0) return state;
  const index = Math.floor(random() * state.remaining.length);
  return {
    remaining: state.remaining.filter((_, i) => i !== index),
    drawn: [...state.drawn, state.remaining[index]],
  };
}
