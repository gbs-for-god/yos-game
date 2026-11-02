/**
 * 모든 게임이 공유하는 메타데이터 타입.
 * 새 게임을 추가할 때는 `games/<slug>/meta.ts`에서 이 타입으로 메타를 정의하고
 * `games/registry.ts`에 등록한다. 자세한 절차는 docs/ADDING_A_GAME.md 참고.
 */
export type GameMeta = {
  /** URL에 쓰이는 고유 식별자 (kebab-case). `/games/<slug>` */
  slug: string;
  /** 화면에 표시되는 게임 이름 */
  title: string;
  /** 게임 목록 카드에 보이는 한 줄 설명 */
  description: string;
  /** 권장 인원 (예: "2팀 이상", "10~30명") */
  players: string;
  /** 대략적인 소요 시간 (분) */
  durationMinutes: number;
  /** 목록 카드에 표시할 이모지 */
  emoji: string;
};
