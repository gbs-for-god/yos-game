import { cn } from "@/lib/cn";
import type { Mission } from "./logic";

type MissionListProps = {
  missions: readonly Mission[];
  /** compact: 제목만 (사회자 표, 공개 화면), full: 설명·기한까지 (참여자 결과 화면) */
  variant?: "full" | "compact";
  className?: string;
};

/** 배정된 미션 목록 */
export function MissionList({ missions, variant = "full", className }: MissionListProps) {
  if (variant === "compact") {
    return (
      <ul className={cn("flex flex-col gap-1 text-xl", className)}>
        {missions.map((m) => (
          <li key={m.id}>
            <span aria-hidden="true">{m.emoji}</span> {m.title}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ol className={cn("grid w-full gap-5 md:grid-cols-3", className)}>
      {missions.map((m, i) => (
        <li
          key={m.id}
          data-testid="mission-item"
          className="flex flex-col gap-3 rounded-3xl border-4 border-indigo-200 bg-white px-7 py-6 text-left"
        >
          <p className="text-xl font-bold text-indigo-600">미션 {i + 1}</p>
          <p className="text-6xl" aria-hidden="true">
            {m.emoji}
          </p>
          <h3 className="text-3xl font-black text-zinc-900">{m.title}</h3>
          <p className="text-xl leading-relaxed text-zinc-700">{m.description}</p>
          <p className="mt-auto text-xl font-bold text-indigo-700">⏰ {m.timeLimit}</p>
        </li>
      ))}
    </ol>
  );
}
