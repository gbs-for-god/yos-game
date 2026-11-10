import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinScreen } from "@/components/participant/JoinScreen";

export const metadata: Metadata = { title: "참가자 등록 | 교회 레크레이션" };

export default function JoinPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:px-10 md:py-16">
      <Suspense fallback={<p className="text-center text-2xl text-zinc-500">불러오는 중...</p>}>
        <JoinScreen />
      </Suspense>
    </main>
  );
}
