"use client";

import { useCallback, useEffect, useMemo } from "react";
import { HostPinForm } from "@/components/host/HostPinForm";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import { hostPinStore, useVerifiedHostPin } from "@/lib/host/client";
import {
  chorusSeconds,
  currentSong,
  hasNext,
  hasPrev,
  isRevealed,
  moveBy,
  restoreGameState,
  revealAnswer,
  revealedCount,
  shuffleQuiz,
  SNIPPET_SECONDS,
  themeLabel,
  THEMES,
  type QuizState,
  type ThemeId,
} from "./logic";
import { SONGS, SONGS_ERROR } from "./songs";
import { Stage } from "./Stage";
import { chooseTheme, gameStore, loadGameState, updateQuiz } from "./storage";
import { ThemeSelect } from "./ThemeSelect";
import { useSongPlayer } from "./useSongPlayer";

/** 사회자가 로그인해야만 진행할 수 있다. 로그인 전에는 곡 정보가 화면에 전혀 나오지 않는다 */
export default function KpopQuizGame() {
  const hostPin = useVerifiedHostPin();

  return (
    <div className="flex flex-1 flex-col rounded-3xl bg-zinc-950 p-6 text-zinc-50 md:p-10">
      {hostPin === undefined ? (
        <p className="m-auto text-2xl text-zinc-400">불러오는 중...</p>
      ) : hostPin === null ? (
        <HostPinForm
          dark
          title="🔒 사회자 로그인"
          description="사회자만 이 게임을 진행할 수 있어요. 비밀번호를 입력하세요."
        />
      ) : SONGS_ERROR ? (
        <p role="alert" className="m-auto text-3xl font-bold text-red-400">
          {SONGS_ERROR}
        </p>
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

/** 입력창 안에서 치는 키는 단축키로 쓰지 않는다 */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** 저장된 진행 상태(선택한 테마, 테마별 곡 순서·현재 곡·공개한 곡)를 읽어 온 뒤에 화면을 고른다 */
function Dashboard() {
  const raw = useStoredValue(gameStore);
  const state = useMemo(() => (raw === LOADING ? null : restoreGameState(raw, SONGS)), [raw]);
  if (state === null) return <p className="m-auto text-2xl text-zinc-400">불러오는 중...</p>;
  if (state.theme === null) return <ThemeSelect state={state} onSelect={chooseTheme} />;
  // theme 이 바뀌면 곡 플레이어도 새로 만든다 (이전 테마의 소리가 이어지지 않게)
  return <Board key={state.theme} theme={state.theme} quiz={state.quizzes[state.theme]} />;
}

function Board({ theme, quiz }: { theme: ThemeId; quiz: QuizState }) {
  const song = currentSong(quiz);
  const revealed = isRevealed(quiz);
  const { containerRef, status, message, snippet, togglePlay, playSnippet, playChorus, playFull } =
    useSongPlayer(song);

  const prevEnabled = hasPrev(quiz);
  const nextEnabled = hasNext(quiz);
  // 상태 변경은 항상 저장소의 최신 값을 기준으로 한다 (단축키 핸들러가 오래된 화면 값을 쥐지 않도록)
  // 정답 공개(버튼·Enter): 처음 공개할 때만 코러스 구간을 바로 들려준다. 이미 공개한 곡은 다시 재생하지 않는다.
  // 단축키 핸들러가 오래된 화면 값을 쥐고 있을 수 있어 공개 여부는 저장소의 최신 값으로 확인한다.
  const reveal = useCallback(() => {
    if (isRevealed(loadGameState().quizzes[theme])) return;
    updateQuiz(theme, revealAnswer);
    playChorus();
  }, [theme, playChorus]);
  const prev = useCallback(() => updateQuiz(theme, (q) => moveBy(q, -1)), [theme]);
  const next = useCallback(() => updateQuiz(theme, (q) => moveBy(q, 1)), [theme]);

  // 단축키: Space 재생/정지, Enter 정답 공개, ←/→ 이전/다음 곡, 1·2 앞부분 듣기, 3 코러스 듣기
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      switch (event.key) {
        case " ":
          event.preventDefault(); // 포커스된 버튼이 함께 눌리거나 페이지가 스크롤되는 것을 막는다
          togglePlay();
          break;
        case "Enter":
          event.preventDefault();
          reveal();
          break;
        case "ArrowLeft":
          event.preventDefault();
          prev();
          break;
        case "ArrowRight":
          event.preventDefault();
          next();
          break;
        // 숫자 키는 화면의 구간 듣기 버튼 순서와 같다: 1 = 앞부분 1초, 2 = 앞부분 3초, 3 = 코러스
        case "1":
        case "2":
          event.preventDefault();
          playSnippet(SNIPPET_SECONDS[Number(event.key) - 1]);
          break;
        case "3":
          event.preventDefault();
          playChorus();
          break;
      }
    }
    // Space 는 버튼에서 keyup 에 클릭이 일어나므로 그것도 막는다
    function onKeyUp(event: KeyboardEvent) {
      if (event.key === " " && !isTyping(event.target)) event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [togglePlay, playSnippet, playChorus, reveal, prev, next]);

  const ready = status !== "loading" && status !== "error";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <p
            data-testid="theme-name"
            className="rounded-full bg-indigo-600 px-5 py-2 text-2xl font-black"
          >
            {THEMES.find((t) => t.id === theme)?.emoji} {themeLabel(theme)}
          </p>
          <p className="text-3xl font-black" data-testid="progress">
            문제 {quiz.index + 1} / {quiz.songs.length}
            <span className="ml-4 text-xl font-bold text-zinc-400">
              공개 {revealedCount(quiz)}곡
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => chooseTheme(null)}>
            🎼 테마 바꾸기
          </Button>
          <Button variant="secondary" onClick={() => updateQuiz(theme, (q) => shuffleQuiz(q))}>
            🔀 순서 섞기
          </Button>
          <Button variant="secondary" onClick={() => hostPinStore.save(null)}>
            🔒 로그아웃
          </Button>
        </div>
      </div>

      {/* 큰 화면(프로젝터·노트북)에서는 무대와 정답을 왼쪽, 조작 버튼을 오른쪽에 둬 한 화면에 다 보이게 한다 */}
      <div className="grid flex-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex flex-col items-center gap-6">
          <Stage
            containerRef={containerRef}
            revealed={revealed}
            status={status}
            message={message}
            snippet={snippet}
          />

          <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
            {revealed ? (
              <>
                <p data-testid="answer-artist" className="text-4xl font-bold text-indigo-300">
                  {song.artist}
                </p>
                <p data-testid="answer-title" className="text-6xl font-black md:text-7xl">
                  {song.title}
                </p>
                {status === "error" && (
                  <p className="text-2xl font-bold text-red-400">⚠️ {message}</p>
                )}
              </>
            ) : (
              <p className="text-4xl font-black text-zinc-600 md:text-6xl">정답 공개 전 · ? ? ?</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <BigButton onClick={prev} disabled={!prevEnabled}>
              ⏮ 이전 곡
            </BigButton>
            <BigButton onClick={next} disabled={!nextEnabled}>
              다음 곡 ⏭
            </BigButton>
          </div>
          <BigButton onClick={togglePlay} disabled={!ready} tone="primary">
            {status === "playing" ? "⏸ 일시정지" : "▶ 재생"}
          </BigButton>

          {SNIPPET_SECONDS.map((seconds) => (
            <BigButton key={seconds} onClick={() => playSnippet(seconds)} disabled={!ready}>
              {`🎯 앞부분 ${seconds}초 듣기`}
            </BigButton>
          ))}
          <BigButton onClick={playChorus} disabled={!ready || chorusSeconds(song) === null}>
            🎤 코러스 듣기
          </BigButton>
          <BigButton onClick={playFull} disabled={!ready}>
            🎼 전체 재생
          </BigButton>

          <BigButton onClick={reveal} disabled={revealed} tone="accent">
            {revealed ? "✅ 정답 공개됨" : "🎉 정답 공개"}
          </BigButton>

          <p className="text-lg leading-loose text-zinc-400">
            단축키 <kbd className="rounded bg-zinc-800 px-2 py-1">Space</kbd> 재생/정지 ·{" "}
            <kbd className="rounded bg-zinc-800 px-2 py-1">Enter</kbd> 정답 공개 ·{" "}
            <kbd className="rounded bg-zinc-800 px-2 py-1">←</kbd>{" "}
            <kbd className="rounded bg-zinc-800 px-2 py-1">→</kbd> 이전/다음 곡 ·{" "}
            <kbd className="rounded bg-zinc-800 px-2 py-1">1</kbd>{" "}
            <kbd className="rounded bg-zinc-800 px-2 py-1">2</kbd>{" "}
            <kbd className="rounded bg-zinc-800 px-2 py-1">3</kbd> 1초·3초·코러스 듣기
          </p>
        </div>
      </div>
    </div>
  );
}

type BigButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "accent";
  children: string;
};

/** 프로젝터 앞에서도 누르기 쉬운 큼직한 버튼 */
function BigButton({ onClick, disabled, tone = "neutral", children }: BigButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl px-6 py-5 text-3xl font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tone === "neutral" && "bg-zinc-800 text-zinc-50 hover:bg-zinc-700",
        tone === "primary" && "bg-indigo-600 text-white hover:bg-indigo-500",
        tone === "accent" && "bg-amber-400 py-6 text-4xl text-zinc-950 hover:bg-amber-300",
      )}
    >
      {children}
    </button>
  );
}
