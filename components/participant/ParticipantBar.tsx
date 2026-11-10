"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useParticipantIdentity } from "@/lib/participants/client";
import { useSiteSettings } from "@/lib/settings/client";

/** 모든 페이지 상단에 "내가 누구로 등록되어 있는지"를 보여 주는 띠 */
export function ParticipantBar() {
  const pathname = usePathname();
  const { identity } = useParticipantIdentity();
  // 페이지를 옮길 때마다 최신 설정을 다시 읽는다 (사회자가 이름 변경을 켜고 끈 것을 반영)
  const settings = useSiteSettings(pathname ?? "");

  // 미등록 기기는 ParticipantGate 가 /join 으로 보내므로 여기서는 등록된 경우만 보여 준다
  if (pathname === "/join" || !identity) return null;

  const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 border-b border-zinc-200 bg-white px-6 py-2 text-xl">
      <span data-testid="participant-name">
        👤 <span className="font-bold">{identity.name}</span>님으로 참여 중
      </span>
      {settings?.allowRename && (
        <Link href={`/join${next}`} className="text-zinc-500 underline hover:text-zinc-900">
          변경
        </Link>
      )}
      <Link href="/host" className="text-zinc-500 underline hover:text-zinc-900">
        🔒 사회자 메뉴
      </Link>
    </div>
  );
}
