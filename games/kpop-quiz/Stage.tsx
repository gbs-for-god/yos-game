import type { RefObject } from "react";
import { cn } from "@/lib/cn";
import type { ActiveSnippet, PlayerStatus } from "./useSongPlayer";

type StageProps = {
  /** 유튜브 플레이어가 그려질 요소 (useSongPlayer 의 containerRef) */
  containerRef: RefObject<HTMLDivElement | null>;
  revealed: boolean;
  status: PlayerStatus;
  /** 오류 안내 (status === "error") */
  message?: string;
  /** 지금 구간 듣기 진행 중이면 그 정보 */
  snippet: ActiveSnippet | null;
};

/**
 * 영상이 보이는 무대. 정답 공개 전에는 불투명한 가리개가 플레이어를 완전히 덮어
 * 영상 화면·썸네일·제목이 보이지 않고 소리만 나온다. 공개하면 가리개가 사라진다.
 */
export function Stage({ containerRef, revealed, status, message, snippet }: StageProps) {
  return (
    <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-3xl border-4 border-zinc-700 bg-black">
      {/* 플레이어는 YouTube 스크립트가 직접 그린다. 공개 전에는 보조기기에도 숨긴다 */}
      <div
        ref={containerRef}
        aria-hidden={!revealed}
        className="absolute inset-0 [&_iframe]:size-full"
      />
      {!revealed && (
        <div
          data-testid="blind-cover"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 bg-zinc-950"
        >
          <Equalizer active={status === "playing"} />
          <p className="text-4xl font-black text-zinc-100 md:text-6xl">🎧 이 노래는 무엇일까요?</p>
          <p
            role="status"
            data-testid="stage-status"
            className={cn(
              "text-2xl font-bold md:text-3xl",
              status === "error" ? "text-red-400" : "text-indigo-300",
            )}
          >
            {statusText(status, snippet, message)}
          </p>
        </div>
      )}
    </div>
  );
}

function statusText(status: PlayerStatus, snippet: ActiveSnippet | null, message?: string): string {
  if (status === "error") return `⚠️ ${message ?? "재생하지 못했어요."}`;
  if (status === "loading") return "플레이어를 준비하고 있어요...";
  if (snippet?.kind === "chorus") return "🔊 코러스 구간 듣는 중";
  if (snippet) return `🔊 앞부분 ${snippet.seconds}초 듣는 중`;
  if (status === "playing") return "🔊 재생 중";
  if (status === "paused") return "⏸ 일시정지";
  return "▶ 재생 버튼이나 구간 듣기를 눌러 주세요";
}

const BAR_DELAYS = [0, 150, 300, 100, 250, 50, 200];

function Equalizer({ active }: { active: boolean }) {
  return (
    <div aria-hidden="true" className="flex h-24 items-end gap-3">
      {BAR_DELAYS.map((delay, i) => (
        <span
          key={i}
          style={{ animationDelay: `${delay}ms` }}
          className={cn(
            "w-5 rounded-full bg-indigo-400",
            active ? "h-24 animate-pulse motion-reduce:animate-none" : "h-4",
          )}
        />
      ))}
    </div>
  );
}
