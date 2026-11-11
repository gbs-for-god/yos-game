import { createStorageStore } from "@/lib/hooks/useStoredValue";
import {
  closeGroup,
  openGroup,
  resetAll,
  restoreGameState,
  serializeGameState,
  updateOpenGroup,
  type GameState,
  type GroupState,
} from "./logic";
import { PEOPLE } from "./people";

/** 진행 상태(열어 둔 제자, 제자별 사진 배정·현재 사진·공개한 이름·결과 확인 여부)를 이 기기에 저장한다 */
export const gameStore = createStorageStore("local", "yos-game:person-quiz:state");

/** 저장된 값을 읽어 지금 상태를 만든다 (없으면 처음 상태) */
export function loadGameState(): GameState {
  return restoreGameState(gameStore.getSnapshot(), PEOPLE);
}

function save(state: GameState) {
  gameStore.save(serializeGameState(state));
}

/** 열어 둔 그룹을 가장 최근 저장 값 기준으로 바꿔 저장한다 (단축키처럼 오래된 화면 값을 쥔 곳에서도 안전) */
export function updateGroup(change: (group: GroupState) => GroupState) {
  save(updateOpenGroup(loadGameState(), change));
}

export function enterGroup(index: number) {
  save(openGroup(loadGameState(), index));
}

export function leaveGroup() {
  save(closeGroup(loadGameState()));
}

/** 전체 리셋: 120장을 다시 섞어 재분배하고 진행을 모두 지운다 */
export function resetEverything(random?: () => number) {
  save(resetAll(PEOPLE, random));
}
