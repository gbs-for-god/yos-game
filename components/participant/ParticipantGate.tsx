"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useParticipantIdentity } from "@/lib/participants/client";

/** 참가자명 입력 화면. 등록 전에도 볼 수 있다. 사회자 메뉴는 비밀번호로 따로 보호한다 */
const JOIN_PATH = "/join";

/**
 * 참가자명을 등록하지 않은 기기는 사회자 메뉴를 제외한 참가자 화면을 보지 못하게 하고 /join 으로 보낸다.
 * 신원은 기기(localStorage)에만 있으므로 판단도 브라우저에서 한다. 서버 렌더링 결과에는
 * "불러오는 중"만 담기고, 브라우저가 신원을 읽은 뒤 화면을 보여 준다.
 */
export function ParticipantGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { identity } = useParticipantIdentity();
  const exempt = pathname === JOIN_PATH || pathname === "/host";

  useEffect(() => {
    if (exempt || identity !== null) return;
    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`${JOIN_PATH}${next}`);
  }, [exempt, identity, pathname, router]);

  if (exempt || identity) return children;

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-2xl text-zinc-500">
        {identity === null ? "참가자 등록 화면으로 이동하는 중..." : "불러오는 중..."}
      </p>
    </main>
  );
}
