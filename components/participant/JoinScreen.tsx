"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { listMemberNames, MEMBERS } from "@/lib/members";
import {
  createToken,
  describeParticipantError,
  fetchParticipants,
  registerParticipant,
  releaseParticipant,
  useParticipantIdentity,
} from "@/lib/participants/client";

const NAMES = listMemberNames(MEMBERS);

/** 명단에서 자기 이름을 골라 이 기기를 등록하는 화면 (/join) */
export function JoinScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { identity, save, clear } = useParticipantIdentity();

  const [claimed, setClaimed] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (identity === undefined) return;
    let cancelled = false;
    fetchParticipants(identity?.token)
      .then((result) => {
        if (cancelled) return;
        setClaimed(result.claimed);
        // 사회자가 등록을 해제했으면 기기에 남은 신원도 지운다
        if (identity && result.me === null) clear();
      })
      .catch((err) => {
        if (!cancelled) setError(describeParticipantError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [identity, clear]);

  async function choose(name: string) {
    setBusy(name);
    setError(null);
    try {
      if (identity && identity.name !== name)
        await releaseParticipant(identity).catch(() => undefined);
      const token = identity?.token ?? createToken();
      await registerParticipant({ name, token });
      save({ name, token });
      // 이 페이지를 떠났다가 돌아오면 Next.js 가 React 상태를 복원하므로 "등록 중" 표시를 먼저 풀어 둔다
      setBusy(null);
      router.push(next);
    } catch (err) {
      setError(describeParticipantError(err));
      setBusy(null);
    }
  }

  if (identity === undefined) {
    return <p className="text-center text-2xl text-zinc-500">불러오는 중...</p>;
  }

  return (
    <section className="flex flex-1 flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-black md:text-6xl">👋 이름을 선택해 주세요</h1>
        <p className="mt-3 text-xl text-zinc-600 md:text-2xl">
          이 기기가 선택한 이름으로 등록돼요. 다음부터는 로그인 없이 바로 이어집니다.
        </p>
        {identity && (
          <p className="mt-2 text-xl text-indigo-700">
            지금은 <span className="font-bold">{identity.name}</span>님으로 등록되어 있어요.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-6 py-3 text-xl font-bold text-red-700">
          {error}
        </p>
      )}

      <ul className="grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {NAMES.map((name) => {
          const mine = identity?.name === name;
          const taken = !mine && (claimed?.includes(name) ?? false);
          return (
            <li key={name}>
              <button
                type="button"
                disabled={taken || busy !== null || claimed === null}
                onClick={() => choose(name)}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-3xl border-4 px-4 py-6 transition-colors disabled:cursor-not-allowed",
                  mine
                    ? "border-indigo-500 bg-indigo-50"
                    : taken
                      ? "border-zinc-200 bg-zinc-100 text-zinc-400"
                      : "border-indigo-200 bg-white hover:bg-indigo-50",
                )}
              >
                <span className="text-3xl font-black md:text-4xl">
                  {name}
                  {name === MEMBERS.host && (
                    <span className="ml-2 text-xl font-normal text-zinc-500">(사회자)</span>
                  )}
                </span>
                <span className="text-lg whitespace-nowrap md:text-xl">
                  {busy === name
                    ? "등록 중..."
                    : mine
                      ? "✅ 내 이름"
                      : taken
                        ? "다른 기기에서 등록됨"
                        : "선택"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {identity && (
        <Button variant="secondary" onClick={() => router.push(next)}>
          그대로 두고 돌아가기
        </Button>
      )}
    </section>
  );
}

/** 외부 주소로 보내지 않도록 같은 사이트의 경로만 허용한다 */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
