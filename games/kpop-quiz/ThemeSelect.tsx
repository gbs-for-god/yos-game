import { cn } from "@/lib/cn";
import { songsOfTheme, THEMES, type GameState, type ThemeId } from "./logic";
import { SONGS } from "./songs";

type ThemeSelectProps = {
  state: GameState;
  onSelect: (theme: ThemeId) => void;
};

/**
 * 게임을 시작하기 전에 테마를 고르는 화면. 곡 제목은 보여 주지 않고 곡 수와 공개한 곡 수만 알려 준다.
 * 테마마다 진행 상태가 따로 저장되어, 다른 테마를 갔다 와도 이어서 할 수 있다.
 */
export function ThemeSelect({ state, onSelect }: ThemeSelectProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="text-center">
        <h2 className="text-5xl font-black md:text-6xl">🎵 테마를 선택하세요</h2>
        <p className="mt-4 text-2xl text-zinc-400">고른 테마의 노래로 게임을 진행해요.</p>
      </div>

      <ul className="grid w-full max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-4">
        {THEMES.map(({ id, label, emoji }) => {
          const total = songsOfTheme(SONGS, id).length;
          const revealed = state.quizzes[id].revealed.length;
          const empty = total === 0;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={empty}
                onClick={() => onSelect(id)}
                className={cn(
                  "flex h-full w-full flex-col items-center gap-4 rounded-3xl border-4 px-8 py-12 transition-colors",
                  empty
                    ? "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600"
                    : "border-indigo-500 bg-zinc-900 hover:bg-indigo-950",
                )}
              >
                <span className="text-8xl" aria-hidden="true">
                  {emoji}
                </span>
                <span className="text-5xl font-black">{label}</span>
                <span className="text-2xl text-zinc-400">
                  {empty ? "준비 중" : `${total}곡 · 공개 ${revealed}곡`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
