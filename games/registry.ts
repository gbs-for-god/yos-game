import type { ComponentType } from "react";
import type { GameMeta } from "@/games/types";

import NumberDrawGame from "@/games/number-draw/Game";
import { meta as numberDrawMeta } from "@/games/number-draw/meta";

export type GameEntry = {
  meta: GameMeta;
  Component: ComponentType;
};

/**
 * 게임 레지스트리 — 홈 화면 목록과 `/games/[slug]` 라우트의 단일 진실 공급원(SSOT).
 * 새 게임은 여기에 한 줄만 추가하면 목록과 라우트에 자동 반영된다.
 */
export const games: GameEntry[] = [{ meta: numberDrawMeta, Component: NumberDrawGame }];

export function getGame(slug: string): GameEntry | undefined {
  return games.find((g) => g.meta.slug === slug);
}
