"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import missionsData from "./data/missions.json";
import { createMissionDrawState, drawMission, type Mission } from "./logic";

const MISSIONS: readonly Mission[] = missionsData;

export default function ManitoMissionGame() {
  const [state, setState] = useState(() => createMissionDrawState(MISSIONS));

  const current = state.drawn.at(-1);
  const isFinished = state.remaining.length === 0;

  return (
    <div className="flex flex-1 flex-col items-center gap-10">
      <p className="text-2xl text-zinc-600">
        뽑은 미션 {state.drawn.length} / {MISSIONS.length}
      </p>

      <section
        data-testid="mission-card"
        aria-live="polite"
        className="flex min-h-[28rem] w-full max-w-5xl flex-col items-center justify-center gap-6 rounded-3xl border-4 border-indigo-200 bg-indigo-50 px-12 py-10 text-center"
      >
        {current ? (
          <>
            <p className="text-8xl" aria-hidden="true">
              {current.emoji}
            </p>
            <h2 data-testid="mission-title" className="text-6xl font-black text-zinc-900">
              {current.title}
            </h2>
            <p className="max-w-4xl text-3xl leading-relaxed text-zinc-800">
              {current.description}
            </p>
            <p className="rounded-full bg-white px-6 py-2 text-2xl font-bold text-indigo-700">
              ⏰ 기한: {current.timeLimit}
            </p>
          </>
        ) : (
          <>
            <p className="text-8xl" aria-hidden="true">
              🎁
            </p>
            <p className="text-4xl font-bold text-zinc-700">버튼을 눌러 마니또 미션을 뽑으세요!</p>
          </>
        )}
      </section>

      <div className="flex items-center gap-6">
        <Button size="lg" onClick={() => setState((s) => drawMission(s))} disabled={isFinished}>
          {isFinished ? "모든 미션을 뽑았어요" : "미션 뽑기!"}
        </Button>
        <Button variant="secondary" onClick={() => setState(createMissionDrawState(MISSIONS))}>
          처음부터
        </Button>
      </div>
    </div>
  );
}
