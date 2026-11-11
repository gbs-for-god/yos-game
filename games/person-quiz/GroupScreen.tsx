"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import {
  backToEnd,
  currentPersonId,
  DISCIPLES,
  GROUP_SIZE,
  isRevealed,
  nextPhoto,
  prevPhoto,
  showResults,
  toggleReveal,
  type GroupState,
} from "./logic";
import { getPerson } from "./people";
import { PersonImage } from "./PersonImage";
import { leaveGroup, loadGameState, updateGroup } from "./storage";

/** 입력창 안에서 치는 키는 단축키로 쓰지 않는다 */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function openGroupStage(): GroupState | null {
  const state = loadGameState();
  return state.open === null ? null : state.groups[state.open];
}

/** 키보드 단축키: Space 이름 공개/가리기 · →(Enter) 다음 · ← 이전 · Esc 메인으로 */
function useShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const group = openGroupStage();
      if (!group) return;

      if (event.key === "Escape") {
        leaveGroup();
      } else if (event.key === "ArrowLeft" && group.stage !== "results") {
        updateGroup(prevPhoto);
      } else if (group.stage === "quiz" && (event.key === "ArrowRight" || event.key === "Enter")) {
        // 포커스가 버튼에 있어도 버튼 클릭이 한 번 더 일어나지 않게 막는다
        event.preventDefault();
        updateGroup(nextPhoto);
      } else if (group.stage === "end" && event.key === "ArrowRight") {
        // 종료 안내에서는 다음으로 넘어갈 곳이 없다 (결과 확인은 버튼으로)
      } else if (event.key === " " && group.stage === "quiz") {
        // 누르고 있는 동안 반복해서 껐다 켜지지 않게 한다. 포커스된 버튼이 있으면 떼어 내 클릭이 겹치지 않게 한다
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        if (!event.repeat) updateGroup(toggleReveal);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      // Space 는 keyup 에서 버튼 클릭을 일으키므로 퀴즈 중에는 막는다
      if (event.key === " " && openGroupStage()?.stage === "quiz") event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}

/** 한 제자의 10장을 진행하는 화면. 단계(quiz → end → results)에 따라 내용이 바뀐다 */
export function GroupScreen({ groupIndex, group }: { groupIndex: number; group: GroupState }) {
  useShortcuts();
  const disciple = DISCIPLES[groupIndex];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-3xl font-black text-indigo-300" data-testid="group-name">
          {disciple.label}
          {disciple.note && (
            <span className="ml-3 text-xl font-bold text-zinc-400">{disciple.note}</span>
          )}
        </p>
        {group.stage === "quiz" && (
          <p className="text-4xl font-black" data-testid="progress">
            {group.index + 1} / {GROUP_SIZE}
          </p>
        )}
      </div>

      {group.stage === "quiz" && <QuizView group={group} />}
      {group.stage === "end" && <EndView />}
      {group.stage === "results" && <ResultsView group={group} />}
    </div>
  );
}

function QuizView({ group }: { group: GroupState }) {
  const person = getPerson(currentPersonId(group));
  const revealed = isRevealed(group);

  return (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <PersonImage
          key={person.id}
          person={person}
          className="max-h-[52vh] w-full rounded-2xl object-contain"
        />
      </div>

      <p
        data-testid="answer-name"
        className={cn(
          "min-h-24 text-center text-6xl font-black md:text-8xl",
          revealed ? "text-amber-300" : "text-zinc-600",
        )}
      >
        {revealed ? person.name : "? ? ?"}
      </p>

      <div className="grid gap-4 md:grid-cols-4">
        <ControlButton onClick={() => updateGroup(prevPhoto)} disabled={group.index === 0}>
          ← 이전 사진
        </ControlButton>
        <ControlButton onClick={() => updateGroup(toggleReveal)} tone="accent">
          {revealed ? "🙈 이름 가리기 (Space)" : "👀 이름 공개 (Space)"}
        </ControlButton>
        <ControlButton onClick={() => updateGroup(nextPhoto)}>
          {group.index === GROUP_SIZE - 1 ? "마치기 →" : "다음 사진 →"}
        </ControlButton>
        <ControlButton onClick={leaveGroup}>🏠 메인으로 (Esc)</ControlButton>
      </div>
    </>
  );
}

function EndView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
      <h2 className="text-6xl font-black md:text-8xl">🏁 게임 종료</h2>
      <p className="text-3xl text-zinc-300">10장을 모두 봤어요. 정답을 한눈에 확인해 볼까요?</p>
      <div className="flex flex-wrap justify-center gap-4">
        <ControlButton onClick={() => updateGroup(prevPhoto)}>← 마지막 사진으로</ControlButton>
        <ControlButton onClick={() => updateGroup(showResults)} tone="accent">
          📋 결과 확인
        </ControlButton>
        <ControlButton onClick={leaveGroup}>🏠 목록으로 돌아가기</ControlButton>
      </div>
    </div>
  );
}

function ResultsView({ group }: { group: GroupState }) {
  return (
    <>
      <h2 className="text-5xl font-black">📋 결과 확인</h2>
      <ul className="grid flex-1 grid-cols-2 gap-5 md:grid-cols-5" data-testid="results-grid">
        {group.ids.map((id, i) => {
          const person = getPerson(id);
          return (
            <li key={id} className="flex flex-col gap-2 rounded-2xl bg-zinc-900 p-3">
              <PersonImage
                person={person}
                className="aspect-[4/3] w-full rounded-xl bg-zinc-800 object-contain"
              />
              <p className="text-center text-2xl font-black text-amber-300">
                {i + 1}. {person.name}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap justify-center gap-4">
        <ControlButton onClick={() => updateGroup(backToEnd)}>← 종료 화면으로</ControlButton>
        <ControlButton onClick={leaveGroup} tone="accent">
          🏠 목록으로 돌아가기
        </ControlButton>
      </div>
    </>
  );
}

type ControlButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "accent";
  children: string;
};

/** 프로젝터 앞에서도 누르기 쉬운 큼직한 버튼 */
function ControlButton({ onClick, disabled, tone = "neutral", children }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl px-6 py-5 text-2xl font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:text-3xl",
        tone === "neutral" && "bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
        tone === "accent" && "bg-amber-400 text-zinc-950 hover:bg-amber-300",
      )}
    >
      {children}
    </button>
  );
}
