"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import { restoreGameState, THEMES } from "./logic";
import { SONGS } from "./songs";
import { gameStore, resetAllStoredQuizzes } from "./storage";

/** 사회자 메뉴(/host)에 끼워 넣는 노래 맞추기 관리 패널 */
export function HostPanel() {
  const raw = useStoredValue(gameStore);
  const state = useMemo(() => (raw === LOADING ? null : restoreGameState(raw, SONGS)), [raw]);
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    const cleared = resetAllStoredQuizzes();
    setMessage(
      cleared > 0
        ? `초기화했어요. 공개했던 ${cleared}곡을 다시 가리고 모든 테마의 곡 순서를 섞었어요.`
        : "초기화했어요. 모든 테마의 곡 순서를 새로 섞었어요.",
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border-4 border-zinc-200 bg-white px-8 py-6">
      <div>
        <h2 className="text-3xl font-bold">🎵 노래 맞추기</h2>
        <p className="mt-2 text-xl text-zinc-600">
          정답을 공개한 문제는 계속 공개 상태로 남아요. 초기화하면 모든 테마에서 공개한 문제를 다시
          가리고 곡 순서를 한 번 섞습니다.
        </p>
        <ul data-testid="kpop-host-status" className="mt-3 flex flex-col gap-1 text-xl font-bold">
          {state
            ? THEMES.map(({ id, label, emoji }) => (
                <li key={id} className="text-indigo-700">
                  {emoji} {label} · 공개 {state.quizzes[id].revealed.length} /{" "}
                  {state.quizzes[id].songs.length}곡
                </li>
              ))
            : "불러오는 중..."}
        </ul>
        {message && (
          <p role="status" className="mt-2 text-xl font-bold text-emerald-700">
            {message}
          </p>
        )}
      </div>
      <Button onClick={reset} disabled={state === null} aria-label="노래 맞추기 초기화">
        🔄 게임 초기화
      </Button>
    </div>
  );
}
