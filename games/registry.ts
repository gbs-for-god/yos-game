import type { ComponentType } from "react";
import type { GameMeta } from "@/games/types";

import NumberDrawGame from "@/games/number-draw/Game";
import { meta as numberDrawMeta } from "@/games/number-draw/meta";
import ManitoMissionGame from "@/games/manito-mission/Game";
import { meta as manitoMissionMeta } from "@/games/manito-mission/meta";
import KpopQuizGame from "@/games/kpop-quiz/Game";
import { HostPanel as KpopQuizHostPanel } from "@/games/kpop-quiz/HostPanel";
import { meta as kpopQuizMeta } from "@/games/kpop-quiz/meta";
import PersonQuizGame from "@/games/person-quiz/Game";
import { meta as personQuizMeta } from "@/games/person-quiz/meta";

export type GameEntry = {
  meta: GameMeta;
  Component: ComponentType;
  /** (선택) 사회자 메뉴(/host)에 보여 줄 이 게임의 관리 패널 (예: 게임 초기화) */
  HostPanel?: ComponentType;
};

/**
 * 게임 레지스트리 — 홈 화면 목록과 `/games/[slug]` 라우트의 단일 진실 공급원(SSOT).
 * 새 게임은 여기에 한 줄만 추가하면 목록과 라우트에 자동 반영된다.
 */
export const games: GameEntry[] = [
  { meta: manitoMissionMeta, Component: ManitoMissionGame },
  { meta: numberDrawMeta, Component: NumberDrawGame },
  { meta: kpopQuizMeta, Component: KpopQuizGame, HostPanel: KpopQuizHostPanel },
  { meta: personQuizMeta, Component: PersonQuizGame },
];

export function getGame(slug: string): GameEntry | undefined {
  return games.find((g) => g.meta.slug === slug);
}
