import { useState } from "react";
import { cn } from "@/lib/cn";
import { DISCIPLES, GROUP_SIZE, type GameState, type GroupState } from "./logic";

type DiscipleMenuProps = {
  state: GameState;
  onSelect: (index: number) => void;
  onReset: () => void;
  onLogout: () => void;
};

function statusOf(group: GroupState): { label: string; tone: "idle" | "going" | "done" } {
  if (group.checked) return { label: "✅ 결과 확인 완료", tone: "done" };
  if (group.stage === "end") return { label: "🏁 종료 · 결과 확인 전", tone: "going" };
  if (group.index > 0 || group.revealed.length > 0)
    return { label: `진행 중 · ${group.index + 1} / ${GROUP_SIZE}`, tone: "going" };
  return { label: "시작 전", tone: "idle" };
}

/** 12제자 중 하나를 고르는 메인 메뉴. 결과 확인까지 마친 제자는 카드에 표시한다 */
export function DiscipleMenu({ state, onSelect, onReset, onLogout }: DiscipleMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const checkedCount = state.groups.filter((g) => g.checked).length;

  return (
    <section className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-5xl font-black md:text-6xl">🧑‍🤝‍🧑 제자를 선택하세요</h2>
          <p className="mt-3 text-2xl text-zinc-400" data-testid="checked-count">
            결과 확인 완료 {checkedCount} / {DISCIPLES.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {confirming ? (
            <>
              <span className="text-xl font-bold text-amber-300">
                모든 진행이 지워지고 사진이 다시 섞여요.
              </span>
              <MenuButton
                tone="danger"
                onClick={() => {
                  onReset();
                  setConfirming(false);
                }}
              >
                정말 리셋
              </MenuButton>
              <MenuButton onClick={() => setConfirming(false)}>취소</MenuButton>
            </>
          ) : (
            <MenuButton onClick={() => setConfirming(true)}>🔀 전체 데이터 리셋(셔플)</MenuButton>
          )}
          <MenuButton onClick={onLogout}>🔒 로그아웃</MenuButton>
        </div>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {DISCIPLES.map((disciple, i) => {
          const status = statusOf(state.groups[i]);
          return (
            <li key={disciple.id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                data-testid={`disciple-${disciple.id}`}
                data-checked={state.groups[i].checked}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl border-4 px-6 py-8 transition-colors",
                  status.tone === "done"
                    ? "border-emerald-500 bg-emerald-950 hover:bg-emerald-900"
                    : "border-indigo-500 bg-zinc-900 hover:bg-indigo-950",
                )}
              >
                <span className="text-5xl font-black">{disciple.label}</span>
                <span className="min-h-7 text-xl text-zinc-400">{disciple.note ?? ""}</span>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    status.tone === "done" && "text-emerald-300",
                    status.tone === "going" && "text-amber-300",
                    status.tone === "idle" && "text-zinc-400",
                  )}
                >
                  {status.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MenuButton({
  onClick,
  tone = "neutral",
  children,
}: {
  onClick: () => void;
  tone?: "neutral" | "danger";
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl px-6 py-4 text-2xl font-black transition-colors",
        tone === "neutral" && "bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
        tone === "danger" && "bg-red-600 text-white hover:bg-red-500",
      )}
    >
      {children}
    </button>
  );
}
