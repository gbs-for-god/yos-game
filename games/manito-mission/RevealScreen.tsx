import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MissionList } from "./MissionList";
import {
  isRevealComplete,
  resolveMissions,
  type Assignment,
  type Mission,
  type PublicSession,
} from "./logic";

type RevealScreenProps = {
  session: PublicSession;
  missions: readonly Mission[];
  /** 사회자 비밀번호로 받은 전체 배정표. 없으면(참여자 휴대폰) 보기 전용으로 동작한다 */
  assignments: Record<string, Assignment> | undefined;
  onRevealNext: () => void;
  onOpenHost: () => void;
};

/** 두구두구 연출 시간 (ms) */
export const DRUMROLL_MS = 3000;

/** 게임 종료 후 프로젝터에 띄우는 공개 화면. 한 사람씩 긴장감 있게 마니또를 공개한다 */
export function RevealScreen({
  session,
  missions,
  assignments,
  onRevealNext,
  onOpenHost,
}: RevealScreenProps) {
  const total = session.memberNames.length;
  const currentName = session.memberNames[session.revealedCount];
  const revealedNames = session.memberNames.slice(0, session.revealedCount);
  const complete = isRevealComplete(session) || !currentName;
  const canControl = assignments !== undefined;

  return (
    <section className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-2xl text-zinc-600">
          마니또 공개 {session.revealedCount} / {total}
        </p>
        <Button variant="secondary" onClick={onOpenHost}>
          🔒 사회자 화면
        </Button>
      </div>

      {complete ? (
        <RevealSummary session={session} />
      ) : canControl ? (
        <RevealCard
          key={currentName}
          name={currentName}
          manito={assignments[currentName]?.manito ?? "?"}
          missions={resolveMissions(assignments[currentName]?.missionIds ?? [], missions)}
          isLast={session.revealedCount === total - 1}
          onNext={onRevealNext}
        />
      ) : (
        <WaitingCard session={session} currentName={currentName} missions={missions} />
      )}

      {revealedNames.length > 0 && !complete && (
        <ul className="flex flex-wrap justify-center gap-3 text-xl text-zinc-600">
          {revealedNames.map((name) => (
            <li key={name} className="rounded-full bg-zinc-100 px-4 py-1">
              {name} → {session.revealed[name]?.manito}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type RevealCardProps = {
  name: string;
  manito: string;
  missions: Mission[];
  isLast: boolean;
  onNext: () => void;
};

type Stage = "idle" | "drumroll" | "shown";

/** 사회자 노트북(프로젝터)에서 보는 카드: 공개 버튼 → 두구두구 → 마니또 표시 */
function RevealCard({ name, manito, missions, isLast, onNext }: RevealCardProps) {
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    if (stage !== "drumroll") return;
    const timer = setTimeout(() => setStage("shown"), DRUMROLL_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  return (
    <div
      data-testid="reveal-card"
      aria-live="polite"
      className="flex min-h-[32rem] flex-col items-center justify-center gap-8 rounded-3xl border-4 border-indigo-200 bg-indigo-50 px-12 py-10 text-center"
    >
      <h2 className="text-6xl font-black text-zinc-900">{name}님의 마니또는?</h2>

      {stage === "idle" && (
        <Button size="lg" onClick={() => setStage("drumroll")}>
          🥁 공개!
        </Button>
      )}

      {stage === "drumroll" && (
        <p className="animate-bounce text-7xl font-black text-indigo-600">두구두구두구...</p>
      )}

      {stage === "shown" && (
        <>
          <p data-testid="revealed-manito" className="text-9xl font-black text-indigo-700">
            {manito}
          </p>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-zinc-600">{name}님이 받았던 미션</p>
            <MissionList variant="compact" missions={missions} className="text-2xl" />
          </div>
          <Button size="lg" onClick={onNext}>
            {isLast ? "공개 마치기" : "다음 사람 →"}
          </Button>
        </>
      )}
    </div>
  );
}

type WaitingCardProps = {
  session: PublicSession;
  currentName: string;
  missions: readonly Mission[];
};

/** 참여자 휴대폰에서 보는 카드: 방금 공개된 결과와 다음 차례를 보여 준다 */
function WaitingCard({ session, currentName, missions }: WaitingCardProps) {
  const lastName = session.memberNames[session.revealedCount - 1];
  const last = lastName ? session.revealed[lastName] : undefined;

  return (
    <div
      data-testid="waiting-card"
      aria-live="polite"
      className="flex min-h-[24rem] flex-col items-center justify-center gap-6 rounded-3xl border-4 border-indigo-200 bg-indigo-50 px-6 py-10 text-center md:px-12"
    >
      {lastName && last ? (
        <>
          <p className="text-2xl text-zinc-600">{lastName}님의 마니또는</p>
          <p
            data-testid="last-revealed-manito"
            className="text-6xl font-black text-indigo-700 md:text-8xl"
          >
            {last.manito}
          </p>
          <MissionList
            variant="compact"
            missions={resolveMissions(last.missionIds, missions)}
            className="text-xl"
          />
        </>
      ) : (
        <p className="text-4xl font-black">🎉 마니또 공개가 시작됐어요!</p>
      )}
      <p className="text-2xl text-zinc-600">
        다음 차례: <span className="font-bold text-zinc-900">{currentName}</span>님 · 사회자
        화면에서 공개 중이에요
      </p>
    </div>
  );
}

function RevealSummary({ session }: { session: PublicSession }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <h2 className="text-5xl font-black md:text-7xl">🎉 모두 공개했어요!</h2>
      <p className="text-2xl text-zinc-600 md:text-3xl">
        서로를 몰래 섬겨 준 마니또에게 박수를 보내 주세요 👏
      </p>
      <ul className="grid w-full max-w-5xl grid-cols-1 gap-4 text-2xl md:grid-cols-3 md:text-3xl">
        {session.memberNames.map((name) => (
          <li key={name} className="rounded-2xl bg-white px-6 py-4 shadow">
            <span className="font-bold">{name}</span>
            <span className="text-zinc-400"> → </span>
            <span className="font-black text-indigo-700">{session.revealed[name]?.manito}</span>
          </li>
        ))}
      </ul>
      <p className="text-xl text-zinc-500 md:text-2xl">
        새 게임을 시작하려면 사회자 화면에서 &quot;전체 다시 뽑기&quot;를 누르세요.
      </p>
    </div>
  );
}
