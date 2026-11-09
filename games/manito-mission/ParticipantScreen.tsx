import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { describeError } from "./client";
import { MissionList } from "./MissionList";
import { resolveMissions, type Assignment, type Mission, type PublicSession } from "./logic";

type ParticipantScreenProps = {
  session: PublicSession;
  missions: readonly Mission[];
  /** 본인 결과를 서버에서 받아 오면서 "확인했음"을 기록한다 */
  onView: (name: string) => Promise<Assignment | null>;
  onOpenHost: () => void;
};

type Step =
  | { kind: "list" }
  | { kind: "confirm"; name: string }
  | { kind: "loading"; name: string }
  | { kind: "result"; name: string; assignment: Assignment };

/** 참여자가 자기 이름을 눌러 마니또와 미션을 확인하는 화면 (노트북·휴대폰 공용) */
export function ParticipantScreen({
  session,
  missions,
  onView,
  onOpenHost,
}: ParticipantScreenProps) {
  const [step, setStep] = useState<Step>({ kind: "list" });
  const [error, setError] = useState<string | null>(null);

  const viewedCount = session.memberNames.filter((n) => session.viewed[n]).length;

  async function view(name: string) {
    setStep({ kind: "loading", name });
    setError(null);
    try {
      const assignment = await onView(name);
      if (!assignment) throw new Error("배정을 찾을 수 없어요.");
      setStep({ kind: "result", name, assignment });
    } catch (err) {
      setError(err instanceof Error && !("status" in err) ? err.message : describeError(err));
      setStep({ kind: "confirm", name });
    }
  }

  if (step.kind === "confirm" || step.kind === "loading") {
    const viewed = session.viewed[step.name] ?? false;
    const loading = step.kind === "loading";
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <h2 className="text-5xl font-black md:text-6xl">{step.name}님 맞나요?</h2>
        <p className="text-2xl text-zinc-600 md:text-3xl">
          🙈 주변에 다른 사람이 화면을 보고 있지 않은지 확인하세요.
        </p>
        {error && (
          <p role="alert" className="text-2xl font-bold text-red-600">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Button size="lg" disabled={loading} onClick={() => view(step.name)}>
            {loading ? "불러오는 중..." : viewed ? "내 마니또 다시 보기" : "내 마니또 뽑기!"}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            disabled={loading}
            onClick={() => setStep({ kind: "list" })}
          >
            취소
          </Button>
        </div>
      </section>
    );
  }

  if (step.kind === "result") {
    const assigned = resolveMissions(step.assignment.missionIds, missions);
    return (
      <section
        data-testid="participant-result"
        className="flex flex-1 flex-col items-center gap-8 text-center"
      >
        <p className="text-2xl text-zinc-600 md:text-3xl">{step.name}님의 마니또는</p>
        <p data-testid="manito-name" className="text-6xl font-black text-indigo-700 md:text-8xl">
          {step.assignment.manito}
        </p>
        <p className="text-xl text-zinc-600 md:text-2xl">
          {step.assignment.manito}님을 들키지 않고 몰래 섬겨 주세요. 아래 미션 {assigned.length}
          가지를 수행하면 됩니다!
        </p>
        <MissionList missions={assigned} className="max-w-7xl" />
        <Button size="lg" onClick={() => setStep({ kind: "list" })}>
          확인했어요 (화면 닫기)
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xl text-zinc-600 md:text-2xl">
          사회자 포함 {session.memberNames.length}명 · 확인 완료 {viewedCount}명
        </p>
        <Button variant="secondary" onClick={onOpenHost}>
          🔒 사회자 화면
        </Button>
      </div>

      <h2 className="text-center text-3xl font-black md:text-5xl">
        이름을 눌러 내 마니또를 확인하세요
      </h2>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {session.memberNames.map((name) => {
          const viewed = session.viewed[name] ?? false;
          const isHost = name === session.hostName;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => setStep({ kind: "confirm", name })}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-3xl border-4 px-4 py-6 transition-colors md:px-6 md:py-8",
                  viewed
                    ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                    : "border-indigo-200 bg-white hover:bg-indigo-50",
                )}
              >
                <span className="text-3xl font-black text-zinc-900 md:text-4xl">
                  {name}
                  {isHost && (
                    <span className="ml-2 text-xl text-zinc-500 md:text-2xl">(사회자)</span>
                  )}
                </span>
                <span className="text-lg whitespace-nowrap text-zinc-600 md:text-xl">
                  {viewed ? "✅ 확인 완료" : "아직 안 봤어요"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
