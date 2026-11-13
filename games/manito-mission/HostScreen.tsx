import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MissionList } from "./MissionList";
import { resolveMissions, type Assignment, type Mission, type PublicSession } from "./logic";

type HostScreenProps = {
  session: PublicSession;
  assignments: Record<string, Assignment>;
  /** 기기가 등록된 이름 목록 */
  registered: string[];
  missions: readonly Mission[];
  /** 게임 시작 뒤 참가자 등록이 바뀌었는지 (새로 등록했거나 해제된 사람이 있음) */
  membersChanged: boolean;
  /** 참여자가 휴대폰으로 접속할 주소 (화면에 크게 보여 준다) */
  participantUrl: string | null;
  onRedrawMissions: (name: string) => void;
  /** 특정 참여자의 기기 등록을 풀어 준다 (휴대폰 교체 등) */
  onReleaseDevice: (name: string) => void;
  onReleaseAll: () => void;
  onRedrawAll: () => void;
  onEndGame: () => void;
  onBack: () => void;
};

type PendingAction = "redrawAll" | "endGame" | "releaseAll" | null;

/** 사회자 전용: 모든 참여자의 마니또·미션을 한눈에 보고 다시 뽑기/게임 종료를 조작하는 화면 */
export function HostScreen({
  session,
  assignments,
  registered,
  missions,
  membersChanged,
  participantUrl,
  onRedrawMissions,
  onReleaseDevice,
  onReleaseAll,
  onRedrawAll,
  onEndGame,
  onBack,
}: HostScreenProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const isReveal = session.phase === "reveal";

  return (
    <section className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-5xl font-black">🔒 사회자 화면</h2>
        <p className="rounded-full bg-amber-100 px-5 py-2 text-xl font-bold text-amber-800">
          ⚠️ 이 화면은 프로젝터에 띄우지 마세요
        </p>
      </div>

      {participantUrl && (
        <p className="rounded-2xl bg-indigo-50 px-6 py-4 text-xl text-indigo-900">
          📱 참여자 등록 주소: <span className="font-bold select-all">{participantUrl}</span>
          <span className="ml-2 text-zinc-600">
            (휴대폰으로 접속해 참가자명을 입력하면 등록됩니다)
          </span>
        </p>
      )}

      {membersChanged && (
        <p role="alert" className="rounded-2xl bg-red-50 px-6 py-4 text-2xl font-bold text-red-700">
          게임을 시작한 뒤 참가자 등록이 바뀌었어요. &quot;전체 다시 뽑기&quot;를 누르면 지금 등록된
          사람들로 새로 뽑습니다.
        </p>
      )}

      <table className="w-full border-collapse text-xl">
        <thead>
          <tr className="border-b-4 border-zinc-300 text-left text-zinc-600">
            <th className="px-4 py-3">이름</th>
            <th className="px-4 py-3">기기</th>
            <th className="px-4 py-3">확인</th>
            <th className="px-4 py-3">마니또</th>
            <th className="px-4 py-3">미션</th>
            <th className="px-4 py-3">조작</th>
          </tr>
        </thead>
        <tbody>
          {session.memberNames.map((name) => {
            const assignment = assignments[name];
            if (!assignment) return null;
            return (
              <tr
                key={name}
                data-testid="host-row"
                className="border-b-2 border-zinc-200 align-top"
              >
                <td data-testid="host-row-name" className="px-4 py-4 text-2xl font-bold">
                  {name}
                  {name === session.hostName && (
                    <span className="ml-2 text-xl font-normal text-zinc-500">(사회자)</span>
                  )}
                </td>
                <td data-testid="host-row-device" className="px-4 py-4">
                  {registered.includes(name) ? "📱 등록됨" : "⬜ 미등록"}
                </td>
                <td className="px-4 py-4">{session.viewed[name] ? "✅ 확인 완료" : "⬜ 미확인"}</td>
                <td
                  data-testid="host-row-manito"
                  className="px-4 py-4 text-2xl font-bold text-indigo-700"
                >
                  {assignment.manito}
                </td>
                <td className="px-4 py-4">
                  <MissionList
                    variant="compact"
                    missions={resolveMissions(assignment.missionIds, missions)}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      aria-label={`${name} 미션 다시 뽑기`}
                      disabled={isReveal}
                      onClick={() => onRedrawMissions(name)}
                    >
                      🔄 미션 다시 뽑기
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label={`${name} 기기 초기화`}
                      disabled={!registered.includes(name)}
                      onClick={() => onReleaseDevice(name)}
                    >
                      📱 기기 초기화
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pending && (
        <div
          role="alertdialog"
          aria-labelledby="pending-message"
          className="flex flex-col items-center gap-6 rounded-3xl border-4 border-red-200 bg-red-50 px-10 py-8 text-center"
        >
          <p id="pending-message" className="text-3xl font-bold text-red-800">
            {pending === "redrawAll"
              ? "정말 전체를 다시 뽑을까요? 모든 사람의 마니또와 미션이 새로 정해집니다."
              : pending === "releaseAll"
                ? "모든 참가자의 등록을 초기화할까요? 모두 다시 이름과 입장코드를 입력해야 합니다."
                : "게임을 종료하고 공개 화면으로 넘어갈까요? 이후에는 미션을 다시 뽑을 수 없습니다."}
          </p>
          <div className="flex items-center gap-6">
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-500"
              onClick={() => {
                if (pending === "redrawAll") onRedrawAll();
                else if (pending === "releaseAll") onReleaseAll();
                else onEndGame();
                setPending(null);
              }}
            >
              {pending === "redrawAll"
                ? "네, 전체 다시 뽑기"
                : pending === "releaseAll"
                  ? "네, 참가자 초기화"
                  : "네, 게임 종료"}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setPending(null)}>
              취소
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-6">
        <Button variant="secondary" size="lg" onClick={onBack}>
          {isReveal ? "공개 화면으로" : "참여자 화면으로"}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setPending("redrawAll")}>
          🔄 전체 다시 뽑기
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setPending("releaseAll")}>
          🧹 전체 참가자 초기화
        </Button>
        {!isReveal && (
          <Button size="lg" onClick={() => setPending("endGame")}>
            🎉 게임 종료하고 공개하기
          </Button>
        )}
      </div>
    </section>
  );
}
