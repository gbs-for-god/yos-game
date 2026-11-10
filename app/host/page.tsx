import type { Metadata } from "next";
import { HostMenu } from "@/components/host/HostMenu";

export const metadata: Metadata = { title: "사회자 메뉴 | 교회 레크레이션" };

export default function HostPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 md:px-10 md:py-16">
      <HostMenu />
    </main>
  );
}
