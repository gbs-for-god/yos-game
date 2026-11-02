import Link from "next/link";
import { games } from "@/games/registry";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-10 py-16">
      <header>
        <h1 className="text-6xl font-black">⛪ 교회 레크레이션 게임</h1>
        <p className="mt-4 text-2xl text-zinc-500">진행할 게임을 선택하세요.</p>
      </header>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {games.map(({ meta }) => (
          <li key={meta.slug}>
            <Link
              href={`/games/${meta.slug}`}
              className="flex h-full flex-col gap-3 rounded-3xl border-2 border-zinc-200 bg-white p-8 transition hover:border-indigo-400 hover:shadow-lg"
            >
              <span className="text-6xl">{meta.emoji}</span>
              <h2 className="text-3xl font-bold">{meta.title}</h2>
              <p className="text-lg text-zinc-600">{meta.description}</p>
              <p className="mt-auto text-base text-zinc-400">
                👥 {meta.players} · ⏱ 약 {meta.durationMinutes}분
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
