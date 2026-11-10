"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chorusSeconds,
  CHORUS_SECONDS,
  snippetStart,
  startSeconds,
  type Song,
  type SnippetSeconds,
} from "./logic";
import { loadYouTubeApi, YT_STATE, type YTPlayer } from "./youtube";

export type PlayerStatus = "loading" | "ready" | "playing" | "paused" | "error";

/** 유튜브 오류 코드 → 안내 문구 (101·150: 임베드 금지, 100: 삭제/비공개) */
function describePlayerError(code: number): string {
  if (code === 101 || code === 150) return "이 영상은 외부 재생이 막혀 있어요.";
  if (code === 100) return "영상을 찾을 수 없어요 (삭제되었거나 비공개).";
  return "영상을 재생하지 못했어요.";
}

/** 현재 곡 재생 상태. songId 가 지금 곡과 다르면 이전 곡의 값이므로 무시한다 */
type Tracked = { songId: string; status: PlayerStatus; message?: string };

const POLL_MS = 50;

/** 지금 진행 중인 구간 듣기. intro = 앞부분 N초, chorus = 코러스 구간 */
export type ActiveSnippet = { kind: "intro" | "chorus"; seconds: number };

/**
 * YouTube 플레이어 한 개를 만들어 곡이 바뀔 때마다 새 영상을 준비(cue)하고,
 * 재생/일시정지/구간 듣기를 제공한다. 화면에는 containerRef 가 가리키는 요소 안에 그려진다.
 * 플레이어는 곡마다 다시 만들지 않는다 (iframe 재로딩으로 인한 지연을 피하려고).
 */
export function useSongPlayer(song: Song) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const songRef = useRef(song);
  const readyRef = useRef(false);
  const snippetTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [apiReady, setApiReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Tracked | null>(null);
  /** 지금 구간 듣기를 진행 중이면 그 정보 */
  const [snippet, setSnippet] = useState<ActiveSnippet | null>(null);

  const stopSnippet = useCallback(() => {
    if (snippetTimer.current) clearInterval(snippetTimer.current);
    snippetTimer.current = null;
    setSnippet(null);
  }, []);

  function cueCurrent() {
    const current = songRef.current;
    playerRef.current?.cueVideoById({
      videoId: current.youtubeId,
      startSeconds: startSeconds(current),
    });
  }

  // 플레이어 생성 (최초 한 번)
  useEffect(() => {
    let cancelled = false;
    const host = containerRef.current;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host) return;
        const mount = document.createElement("div");
        host.appendChild(mount);
        playerRef.current = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          // 컨트롤·키보드·전체화면·관련 영상을 끄고, 정답 전에는 화면을 가리개로 덮는다
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              readyRef.current = true;
              cueCurrent();
              setApiReady(true);
            },
            onStateChange: ({ data }) => {
              const status: PlayerStatus | null =
                data === YT_STATE.PLAYING
                  ? "playing"
                  : data === YT_STATE.PAUSED || data === YT_STATE.ENDED
                    ? "paused"
                    : data === YT_STATE.CUED
                      ? "ready"
                      : null;
              if (status) setTracked({ songId: songRef.current.id, status });
            },
            onError: ({ data }) =>
              setTracked({
                songId: songRef.current.id,
                status: "error",
                message: describePlayerError(data),
              }),
          },
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
      if (snippetTimer.current) clearInterval(snippetTimer.current);
      playerRef.current?.destroy();
      playerRef.current = null;
      readyRef.current = false;
      host?.replaceChildren();
    };
  }, []);

  // 곡이 바뀌면 새 영상을 준비한다 (자동 재생하지 않는다)
  useEffect(() => {
    songRef.current = song;
    if (snippetTimer.current) clearInterval(snippetTimer.current);
    snippetTimer.current = null;
    if (readyRef.current) cueCurrent();
  }, [song]);

  const status: PlayerStatus = loadError
    ? "error"
    : tracked?.songId === song.id
      ? tracked.status
      : apiReady
        ? "ready"
        : "loading";
  const message = loadError ?? (tracked?.songId === song.id ? tracked.message : undefined);

  const pause = useCallback(() => {
    stopSnippet();
    playerRef.current?.pauseVideo();
  }, [stopSnippet]);

  const togglePlay = useCallback(() => {
    if (!readyRef.current) return;
    if (status === "playing") pause();
    else {
      stopSnippet();
      playerRef.current?.playVideo();
    }
  }, [status, pause, stopSnippet]);

  /** from 초부터 seconds 초만 들려주고 멈춘다 */
  const playRange = useCallback(
    (from: number, active: ActiveSnippet) => {
      const player = playerRef.current;
      if (!player || !readyRef.current) return;
      stopSnippet();
      player.seekTo(from, true);
      player.playVideo();
      setSnippet(active);
      snippetTimer.current = setInterval(() => {
        if (player.getCurrentTime() >= from + active.seconds) {
          player.pauseVideo();
          stopSnippet();
        }
      }, POLL_MS);
    },
    [stopSnippet],
  );

  /** 앞부분 듣기: 그 버튼의 시작 지점(snippetNStart, 없으면 문제 시작 지점)부터 seconds 초만 들려주고 멈춘다 */
  const playSnippet = useCallback(
    (seconds: SnippetSeconds) =>
      playRange(snippetStart(songRef.current, seconds), { kind: "intro", seconds }),
    [playRange],
  );

  /** 코러스 시작 지점부터 CHORUS_SECONDS 초만 들려주고 멈춘다. 코러스 지점이 없으면 아무것도 하지 않는다 */
  const playChorus = useCallback(() => {
    const from = chorusSeconds(songRef.current);
    if (from !== null) playRange(from, { kind: "chorus", seconds: CHORUS_SECONDS });
  }, [playRange]);

  /** 문제 시작 지점부터 끝까지 계속 재생한다 */
  const playFull = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    stopSnippet();
    player.seekTo(startSeconds(songRef.current), true);
    player.playVideo();
  }, [stopSnippet]);

  return { containerRef, status, message, snippet, togglePlay, playSnippet, playChorus, playFull };
}
