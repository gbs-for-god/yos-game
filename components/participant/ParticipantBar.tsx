"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParticipantIdentity } from "@/lib/participants/client";

/** 모든 페이지 상단에 "내가 누구로 등록되어 있는지"를 보여 주는 띠 */
export function ParticipantBar() {
  const pathname = usePathname();
  const { identity } = useParticipantIdentity();

  if (pathname === "/join" || identity === undefined) return null;

  const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";

  return (
    <div className="flex items-center justify-end gap-4 border-b border-zinc-200 bg-white px-6 py-2 text-xl">
      {identity ? (
        <>
          <span data-testid="participant-name">
            👤 <span className="font-bold">{identity.name}</span>님으로 참여 중
          </span>
          <Link href={`/join${next}`} className="text-zinc-500 underline hover:text-zinc-900">
            변경
          </Link>
        </>
      ) : (
        <Link
          href={`/join${next}`}
          className="rounded-xl bg-indigo-600 px-4 py-1 font-bold text-white hover:bg-indigo-500"
        >
          👋 참여자 등록하기
        </Link>
      )}
    </div>
  );
}
