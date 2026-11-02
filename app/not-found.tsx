import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-10">
      <h1 className="text-5xl font-black">게임을 찾을 수 없어요 😢</h1>
      <Link href="/" className="text-2xl text-indigo-600 hover:underline">
        ← 게임 목록으로
      </Link>
    </main>
  );
}
