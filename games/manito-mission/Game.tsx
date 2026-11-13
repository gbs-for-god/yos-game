"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import { releaseParticipantByHost, useParticipantIdentity } from "@/lib/participants/client";
import { hostPinStore, POLL_INTERVAL_MS, REVEAL_POLL_INTERVAL_MS, usePolledState } from "./client";
import missionsData from "./data/missions.json";
import { HostGate } from "./HostGate";
import { HostScreen } from "./HostScreen";
import { hasSameMembers, MIN_MEMBERS, type Mission, type PublicSession } from "./logic";
import { ParticipantScreen } from "./ParticipantScreen";
import { RevealScreen } from "./RevealScreen";

const MISSIONS: readonly Mission[] = missionsData;

export default function ManitoMissionGame() {
  // 사회자 비밀번호: 탭 단위로 기억한다 (LOADING = 아직 읽기 전, null = 잠김)
  const storedPin = useStoredValue(hostPinStore);
  const hostPin = storedPin === LOADING ? undefined : (storedPin ?? undefined);
  const [hostMode, setHostMode] = useState(false);

  // 참여자 신원: 사이트 공용(localStorage). undefined = 아직 읽기 전, null = 미등록
  const { identity, clear: clearIdentity } = useParticipantIdentity();

  const lock = useCallback(() => hostPinStore.save(null), []);
  const pollOptions = useMemo(
    () => ({ hostPin, participantToken: identity?.token }),
    [hostPin, identity?.token],
  );
  const [intervalMs, setIntervalMs] = useState(POLL_INTERVAL_MS);
  const { data, error, act, refresh } = usePolledState(pollOptions, intervalMs, lock);

  const participantUrl = useMemo(
    () => (typeof window === "undefined" ? null : window.location.origin + "/join"),
    [],
  );

  if (storedPin === LOADING || identity === undefined || data === undefined) {
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

  const { session, assignments, registered } = data;
  const unlocked = hostPin !== undefined;

  // 공개 단계에서는 조금 더 자주 읽는다
  const wantedInterval = session?.phase === "reveal" ? REVEAL_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
  if (wantedInterval !== intervalMs) setIntervalMs(wantedInterval);

  // 기기에는 신원이 남아 있는데 서버에서 등록이 해제된 경우 (사회자가 "기기 초기화")
  const identityRevoked = identity !== null && data.me === null;

  function safely(run: () => Promise<unknown>) {
    run().catch(() => undefined); // 오류는 usePolledState 가 error 로 노출한다
  }

  /** 사회자 화면은 최신 등록·확인 상태를 바로 보여 줘야 하므로 열 때 한 번 더 읽는다 */
  function openHost() {
    setHostMode(true);
    void refresh();
  }

  let screen;
  if (hostMode && !unlocked) {
    screen = (
      <HostGate onUnlock={(pin) => hostPinStore.save(pin)} onCancel={() => setHostMode(false)} />
    );
  } else if (!session) {
    screen = (
      <StartScreen
        canStart={unlocked}
        registered={registered}
        onStart={() => safely(() => act({ type: "start" }))}
        onUnlock={openHost}
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
        registered={registered}
        missions={MISSIONS}
        membersChanged={!hasSameMembers(session, registered)}
        participantUrl={participantUrl}
        onRedrawMissions={(name) => safely(() => act({ type: "redrawMissions", name }))}
        onReleaseAll={() =>
          safely(async () => {
            if (hostPin)
              await fetch("/api/participants", {
                method: "DELETE",
                headers: { "x-host-pin": hostPin },
              });
            await refresh();
          })
        }
        onReleaseDevice={(name) =>
          safely(async () => {
            if (hostPin) await releaseParticipantByHost(name, hostPin);
            await refresh();
          })
        }
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
        onOpenHost={openHost}
      />
    );
  } else if (identity === null || identityRevoked) {
    screen = (
      <RegisterPrompt
        session={session}
        revoked={identityRevoked}
        onDismissRevoked={clearIdentity}
        onOpenHost={openHost}
      />
    );
  } else {
    screen = (
      <ParticipantScreen
        session={session}
        missions={MISSIONS}
        me={identity.name}
        mine={data.mine ?? null}
        onView={() => act({ type: "viewed" })}
        onOpenHost={openHost}
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
  /** 지금 참가자명을 등록한 사람들. 시작하면 이 사람들끼리 마니또가 정해진다 */
  registered: string[];
  onStart: () => void;
  onUnlock: () => void;
};

function StartScreen({ canStart, registered, onStart, onUnlock }: StartScreenProps) {
  const enough = registered.length >= MIN_MEMBERS;

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <p className="text-8xl" aria-hidden="true">
        🎁
      </p>
      <h2 className="text-4xl font-black md:text-5xl">
        {canStart ? "마니또 미션 게임을 시작할까요?" : "아직 게임이 시작되지 않았어요"}
      </h2>
      <p className="text-xl text-zinc-600 md:text-2xl">
        등록 {registered.length}명 · 미션 {MISSIONS.length}개 · 1인당 미션 3개
      </p>
      {registered.length > 0 && (
        <p data-testid="registered-names" className="max-w-5xl text-2xl font-bold text-indigo-700">
          {registered.join(" · ")}
        </p>
      )}
      {canStart ? (
        <>
          <p className="max-w-4xl text-xl text-zinc-500">
            지금 참가자명을 등록한 사람들끼리 마니또와 미션이 정해지고, 어느 기기에서 접속해도 같은
            결과를 봅니다. 모두 등록했는지 확인한 뒤 시작하세요. (미션은 data/missions.json 에서
            수정할 수 있어요)
          </p>
          {!enough && (
            <p role="alert" className="text-2xl font-bold text-red-600">
              참가자가 최소 {MIN_MEMBERS}명 등록되어야 시작할 수 있어요.
            </p>
          )}
          <Button size="lg" disabled={!enough} onClick={onStart}>
            마니또 게임 시작
          </Button>
        </>
      ) : (
        <>
          <p className="max-w-4xl text-xl text-zinc-500">
            사회자가 게임을 시작하면 이 화면이 바뀌어요. 시작할 때 등록되어 있는 사람만 참여하니
            아직 등록하지 않은 사람에게 알려 주세요.
          </p>
          <Button variant="secondary" size="lg" onClick={onUnlock}>
            🔒 사회자 확인하고 시작하기
          </Button>
        </>
      )}
    </section>
  );
}

type RegisterPromptProps = {
  session: PublicSession;
  revoked: boolean;
  onDismissRevoked: () => void;
  onOpenHost: () => void;
};

/** 신원이 없거나(미등록) 사회자가 해제한 기기에 보여 주는 안내 */
function RegisterPrompt({ session, revoked, onDismissRevoked, onOpenHost }: RegisterPromptProps) {
  const viewedCount = session.memberNames.filter((n) => session.viewed[n]).length;
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <p className="text-2xl text-zinc-600">
        참여 {session.memberNames.length}명 · 확인 완료 {viewedCount}명
      </p>
      <h2 className="text-4xl font-black md:text-5xl">
        {revoked ? "이 기기의 등록이 해제되었어요" : "먼저 참여자 등록을 해 주세요"}
      </h2>
      <p className="max-w-3xl text-xl text-zinc-600 md:text-2xl">
        {revoked
          ? "사회자가 기기 등록을 초기화했어요. 같은 이름을 다시 입력하면 이어서 참여할 수 있어요."
          : "참가자명을 등록하면 이 기기로 내 마니또와 미션을 볼 수 있어요."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/join?next=/games/manito-mission"
          onClick={revoked ? onDismissRevoked : undefined}
          className="rounded-2xl bg-indigo-600 px-12 py-5 text-4xl font-bold text-white hover:bg-indigo-500"
        >
          👋 참여자 등록
        </Link>
        <Button variant="secondary" size="lg" onClick={onOpenHost}>
          🔒 사회자 화면
        </Button>
      </div>
    </section>
  );
}
