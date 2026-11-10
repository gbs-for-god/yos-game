"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import { restoreQuiz } from "./logic";
import { SONGS } from "./songs";
import { quizStore, resetStoredQuiz } from "./storage";

/** 사회자 메뉴(/host)에 끼워 넣는 K-pop 노래 맞추기 관리 패널 */
export function HostPanel() {
  const raw = useStoredValue(quizStore);
  const quiz = useMemo(() => (raw === LOADING ? null : restoreQuiz(raw, SONGS)), [raw]);
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    const cleared = resetStoredQuiz();
    setMessage(
      cleared > 0
        ? `초기화했어요. 공개했던 ${cleared}곡을 다시 가리고 곡 순서를 섞었어요.`
        : "초기화했어요. 곡 순서를 새로 섞었어요.",
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border-4 border-zinc-200 bg-white px-8 py-6">
      <div>
        <h2 className="text-3xl font-bold">🎵 K-pop 노래 맞추기</h2>
        <p className="mt-2 text-xl text-zinc-600">
          정답을 공개한 문제는 계속 공개 상태로 남아요. 초기화하면 공개한 문제를 모두 다시 가리고 곡
          순서를 한 번 섞습니다.
        </p>
        <p data-testid="kpop-host-status" className="mt-2 text-xl font-bold text-indigo-700">
          {quiz
            ? `전체 ${quiz.songs.length}곡 · 공개한 곡 ${quiz.revealed.length}곡`
            : "불러오는 중..."}
        </p>
        {message && (
          <p role="status" className="mt-2 text-xl font-bold text-emerald-700">
            {message}
          </p>
        )}
      </div>
      <Button onClick={reset} disabled={quiz === null} aria-label="K-pop 노래 맞추기 초기화">
        🔄 게임 초기화
      </Button>
    </div>
  );
}
