"use client";

import { useMemo } from "react";
import { HostPinForm } from "@/components/host/HostPinForm";
import { LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import { hostPinStore, useVerifiedHostPin } from "@/lib/host/client";
import { DiscipleMenu } from "./DiscipleMenu";
import { GroupScreen } from "./GroupScreen";
import { restoreGameState } from "./logic";
import { PEOPLE, PEOPLE_ERROR } from "./people";
import { enterGroup, gameStore, resetEverything } from "./storage";

/** 사회자가 로그인해야만 진행할 수 있다. 로그인 전에는 정답이 화면에 전혀 나오지 않는다 */
export default function PersonQuizGame() {
  const hostPin = useVerifiedHostPin();

  return (
    <div className="flex flex-1 flex-col rounded-3xl bg-zinc-950 p-6 text-zinc-50 md:p-10">
      {hostPin === undefined ? (
        <p className="m-auto text-2xl text-zinc-400">불러오는 중...</p>
      ) : hostPin === null ? (
        <HostPinForm
          dark
          title="🔒 사회자 로그인"
          description="사회자만 이 게임을 진행할 수 있어요. 비밀번호를 입력하세요."
        />
      ) : PEOPLE_ERROR ? (
        <p role="alert" className="m-auto text-3xl font-bold text-red-400">
          {PEOPLE_ERROR}
        </p>
      ) : (
        <Dashboard />
      )}
    </div>
  );
}

/** 저장된 진행 상태를 읽어 온 뒤, 열어 둔 제자가 있으면 그 화면을, 없으면 메인 메뉴를 보여 준다 */
function Dashboard() {
  const raw = useStoredValue(gameStore);
  const state = useMemo(() => (raw === LOADING ? null : restoreGameState(raw, PEOPLE)), [raw]);
  if (state === null) return <p className="m-auto text-2xl text-zinc-400">불러오는 중...</p>;
  if (state.open === null)
    return (
      <DiscipleMenu
        state={state}
        onSelect={enterGroup}
        onReset={() => resetEverything()}
        onLogout={() => hostPinStore.save(null)}
      />
    );
  return <GroupScreen key={state.open} groupIndex={state.open} group={state.groups[state.open]} />;
}
