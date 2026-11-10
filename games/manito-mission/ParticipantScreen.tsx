import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { describeError } from "./client";
import { MissionList } from "./MissionList";
import { resolveMissions, type Assignment, type Mission, type PublicSession } from "./logic";

type ParticipantScreenProps = {
  session: PublicSession;
  missions: readonly Mission[];
  /** 이 기기에 등록된 참여자 이름 */
  me: string;
  /** 내 배정 (서버가 토큰으로 확인해 내려 준 것) */
  mine: Assignment | null;
  /** "확인했음"을 서버에 기록한다 */
  onView: () => Promise<unknown>;
  onOpenHost: () => void;
};

/** 등록된 참여자가 자기 마니또와 미션을 확인하는 화면 (노트북·휴대폰 공용) */
export function ParticipantScreen({
  session,
  missions,
  me,
  mine,
  onView,
  onOpenHost,
}: ParticipantScreenProps) {
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewedCount = session.memberNames.filter((n) => session.viewed[n]).length;
  const alreadyViewed = session.viewed[me] ?? false;
  const inGame = session.memberNames.includes(me);

  async function view() {
    setLoading(true);
    setError(null);
    try {
      await onView();
      setShowResult(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }

  if (showResult && mine) {
    const assigned = resolveMissions(mine.missionIds, missions);
    return (
      <section
        data-testid="participant-result"
        className="flex flex-1 flex-col items-center gap-8 text-center"
      >
        <p className="text-2xl text-zinc-600 md:text-3xl">{me}님의 마니또는</p>
        <p data-testid="manito-name" className="text-6xl font-black text-indigo-700 md:text-8xl">
          {mine.manito}
        </p>
        <p className="text-xl text-zinc-600 md:text-2xl">
          {mine.manito}님을 들키지 않고 몰래 섬겨 주세요. 아래 미션 {assigned.length}가지를 수행하면
          됩니다!
        </p>
        <MissionList missions={assigned} className="max-w-7xl" />
        <Button size="lg" onClick={() => setShowResult(false)}>
          확인했어요 (화면 닫기)
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xl text-zinc-600 md:text-2xl">
          참여 {session.memberNames.length}명 · 확인 완료 {viewedCount}명
        </p>
        <Button variant="secondary" onClick={onOpenHost}>
          🔒 사회자 화면
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-3xl border-4 border-indigo-200 bg-indigo-50 px-6 py-10 text-center md:px-12">
        <h2 className="text-4xl font-black md:text-6xl">{me}님, 반가워요!</h2>
        <p className="text-xl text-zinc-600 md:text-2xl">
          🙈 주변에 다른 사람이 화면을 보고 있지 않은지 확인하고 버튼을 누르세요.
        </p>
        {error && (
          <p role="alert" className="text-2xl font-bold text-red-600">
            {error}
          </p>
        )}
        {!inGame && (
          <p role="alert" className="text-2xl font-bold text-amber-700">
            게임이 시작된 뒤에 등록해서 이번 배정에 없어요. 사회자에게 &quot;전체 다시 뽑기&quot;를
            요청하세요.
          </p>
        )}
        <Button size="lg" disabled={loading || !mine} onClick={view}>
          {loading ? "불러오는 중..." : alreadyViewed ? "내 마니또 다시 보기" : "내 마니또 뽑기!"}
        </Button>
      </div>

      <div>
        <h3 className="mb-3 text-xl font-bold text-zinc-600 md:text-2xl">확인 현황</h3>
        <ul
          data-testid="viewed-board"
          className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {session.memberNames.map((name) => {
            const viewed = session.viewed[name] ?? false;
            return (
              <li
                key={name}
                className={cn(
                  "rounded-2xl border-2 px-4 py-3 text-center text-xl md:text-2xl",
                  viewed ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white",
                  name === me && "ring-4 ring-indigo-300",
                )}
              >
                <span className="font-bold">{name}</span>
                <span className="ml-2 text-zinc-600">{viewed ? "✅" : "⬜"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
