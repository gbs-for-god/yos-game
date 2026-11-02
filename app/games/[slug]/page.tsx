import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games, getGame } from "@/games/registry";

/**
 * 레지스트리에 등록된 게임을 빌드 시 정적으로 생성한다.
 * (cacheComponents 환경에서는 `dynamicParams`를 쓸 수 없으므로, 미등록 slug는 아래 notFound()로 404 처리)
 */
export function generateStaticParams() {
  return games.map(({ meta }) => ({ slug: meta.slug }));
}

export async function generateMetadata({ params }: PageProps<"/games/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const game = getGame(slug);
  return { title: game ? `${game.meta.title} | 교회 레크레이션` : "게임을 찾을 수 없음" };
}

export default async function GamePage({ params }: PageProps<"/games/[slug]">) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game) notFound();

  const { meta, Component } = game;

  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-10 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black">
          {meta.emoji} {meta.title}
        </h1>
        <Link href="/" className="text-xl text-zinc-500 hover:text-zinc-900">
          ← 게임 목록
        </Link>
      </header>
      <Component />
    </main>
  );
}
