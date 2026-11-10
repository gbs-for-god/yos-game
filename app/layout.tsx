import type { Metadata } from "next";
import { ParticipantBar } from "@/components/participant/ParticipantBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "교회 레크레이션 게임",
  description: "진행자가 프로젝터/TV 화면에 띄워 진행하는 교회 레크레이션 게임 모음",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900">
        <ParticipantBar />
        {children}
      </body>
    </html>
  );
}
