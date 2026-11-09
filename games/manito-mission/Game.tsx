"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { usePolledState } from "./client";
import membersData from "./data/members.json";
import missionsData from "./data/missions.json";
import { HostGate } from "./HostGate";
import { HostScreen } from "./HostScreen";
import { LOADING, getServerSnapshot, getSnapshot, saveHostPin, subscribe } from "./hostPinStorage";
import { hasSameMembers, listMemberNames, type Members, type Mission } from "./logic";
import { ParticipantScreen } from "./ParticipantScreen";
import { RevealScreen } from "./RevealScreen";

const MEMBERS: Members = membersData;
const MISSIONS: readonly Mission[] = missionsData;

export default function ManitoMissionGame() {
  // 사회자 비밀번호: 탭 단위로 기억한다 (undefined = 아직 읽기 전, null = 잠김)
  const storedPin = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hostPin = storedPin === LOADING ? undefined : (storedPin ?? undefined);
  const [hostMode, setHostMode] = useState(false);

  const lock = useCallback(() => saveHostPin(null), []);
  const { data, error, act } = usePolledState({ hostPin }, lock);

  const participantUrl = useMemo(
    () =>
      typeof window === "undefined" ? null : window.location.origin + window.location.pathname,
    [],
  );

  if (storedPin === LOADING || data === undefined) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-2xl text-zinc-500">불러오는 중...</p>
        {error && (
          <p role="alert" className="text-2xl font-bold text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  const { session, assignments } = data;
  const unlocked = hostPin !== undefined;

  function safely(run: () => Promise<unknown>) {
    run().catch(() => undefined); // 오류는 usePolledState 가 error 로 노출한다
  }

  let screen;
  if (hostMode && !unlocked) {
    screen = <HostGate onUnlock={(pin) => saveHostPin(pin)} onCancel={() => setHostMode(false)} />;
  } else if (!session) {
    screen = (
      <StartScreen
        canStart={unlocked}
        onStart={() => safely(() => act({ type: "start" }))}
        onUnlock={() => setHostMode(true)}
      />
    );
  } else if (hostMode && !assignments) {
    // 비밀번호를 막 입력해 전체 배정표를 다시 받아 오는 중
    screen = <p className="text-center text-2xl text-zinc-500">사회자 정보를 불러오는 중...</p>;
  } else if (hostMode && assignments) {
    screen = (
      <HostScreen
        session={session}
        assignments={assignments}
        missions={MISSIONS}
        membersChanged={!hasSameMembers(session, MEMBERS)}
        participantUrl={participantUrl}
        onRedrawMissions={(name) => safely(() => act({ type: "redrawMissions", name }))}
        onRedrawAll={() => {
          safely(() => act({ type: "redrawAll" }));
          setHostMode(false);
        }}
        onEndGame={() => {
          safely(() => act({ type: "startReveal" }));
          setHostMode(false);
        }}
        onBack={() => setHostMode(false)}
      />
    );
  } else if (session.phase === "reveal") {
    screen = (
      <RevealScreen
        session={session}
        missions={MISSIONS}
        assignments={assignments}
        onRevealNext={() => safely(() => act({ type: "revealNext" }))}
        onOpenHost={() => setHostMode(true)}
      />
    );
  } else {
    screen = (
      <ParticipantScreen
        session={session}
        missions={MISSIONS}
        onView={async (name) => {
          const result = await act({ type: "viewed", name }, { name });
          return result.mine ?? null;
        }}
        onOpenHost={() => setHostMode(true)}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {error && (
        <p
          role="status"
          className="rounded-2xl bg-red-50 px-6 py-3 text-center text-xl font-bold text-red-700"
        >
          ⚠️ {error} — 자동으로 다시 시도하고 있어요.
        </p>
      )}
      {screen}
    </div>
  );
}

type StartScreenProps = {
  canStart: boolean;
  onStart: () => void;
  onUnlock: () => void;
};

function StartScreen({ canStart, onStart, onUnlock }: StartScreenProps) {
  const names = listMemberNames(MEMBERS);

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <p className="text-8xl" aria-hidden="true">
        🎁
      </p>
      <h2 className="text-4xl font-black md:text-5xl">
        {canStart ? "마니또 미션 게임을 시작할까요?" : "아직 게임이 시작되지 않았어요"}
      </h2>
      <p className="text-xl text-zinc-600 md:text-2xl">
        사회자 포함 {names.length}명 · 미션 {MISSIONS.length}개 · 1인당 미션 3개
      </p>
      {canStart ? (
        <>
          <p className="max-w-4xl text-xl text-zinc-500">
            명단은 data/members.json, 미션은 data/missions.json 에서 수정할 수 있어요. 시작하면 모든
            사람의 마니또와 미션이 정해지고, 어느 기기에서 접속해도 같은 결과를 봅니다.
          </p>
          <Button size="lg" onClick={onStart}>
            마니또 게임 시작
          </Button>
        </>
      ) : (
        <>
          <p className="max-w-4xl text-xl text-zinc-500">
            사회자가 게임을 시작하면 이 화면에 명단이 나타나요. 잠시만 기다려 주세요.
          </p>
          <Button variant="secondary" size="lg" onClick={onUnlock}>
            🔒 사회자 확인하고 시작하기
          </Button>
        </>
      )}
    </section>
  );
}
