/**
 * YouTube IFrame Player API 를 불러오고 쓰는 데 필요한 최소 타입과 로더.
 * 패키지를 추가하지 않고 공식 스크립트(https://www.youtube.com/iframe_api)를 직접 불러온다.
 */

export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

export type YTPlayer = {
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
};

export type YTPlayerOptions = {
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  };
};

export type YTNamespace = {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
};

declare global {
  interface Window {
    YT?: Partial<YTNamespace>;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_URL = "https://www.youtube.com/iframe_api";
let apiPromise: Promise<YTNamespace> | null = null;

/** API 스크립트를 한 번만 불러온다. 실패하면 다음 호출에서 다시 시도한다. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT as YTNamespace);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT as YTNamespace);
      else reject(new Error("YouTube API 를 초기화하지 못했어요."));
    };
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => reject(new Error("YouTube API 를 불러오지 못했어요."));
    document.head.appendChild(script);
  }).catch((error) => {
    apiPromise = null;
    throw error;
  });
  return apiPromise;
}
