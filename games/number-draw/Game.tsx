"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createDrawState, drawNext } from "./logic";

const DEFAULT_MAX = 30;

export default function NumberDrawGame() {
  const [maxInput, setMaxInput] = useState(String(DEFAULT_MAX));
  const [state, setState] = useState(() => createDrawState(DEFAULT_MAX));

  const current = state.drawn.at(-1);
  const isFinished = state.remaining.length === 0;

  function reset() {
    const max = Number(maxInput);
    setState(createDrawState(Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX));
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-10">
      <div className="flex items-center gap-4 text-2xl">
        <label htmlFor="max">최대 번호</label>
        <input
          id="max"
          type="number"
          min={1}
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          className="w-28 rounded-xl border-2 border-zinc-300 px-3 py-2 text-center"
        />
        <Button variant="secondary" onClick={reset}>
          새로 시작
        </Button>
      </div>

      <p data-testid="current-number" className="text-[12rem] leading-none font-black tabular-nums">
        {current ?? "?"}
      </p>

      <Button size="lg" onClick={() => setState((s) => drawNext(s))} disabled={isFinished}>
        {isFinished ? "모두 뽑았어요" : "뽑기!"}
      </Button>

      <div className="w-full max-w-4xl">
        <p className="mb-3 text-xl text-zinc-500">
          뽑은 번호 ({state.drawn.length}/{state.max})
        </p>
        <ul data-testid="drawn-list" className="flex flex-wrap gap-2 text-2xl">
          {state.drawn.map((n) => (
            <li key={n} className="rounded-lg bg-zinc-100 px-3 py-1 tabular-nums">
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
