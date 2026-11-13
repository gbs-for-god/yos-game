"use client";

import Link from "next/link";
import { MAX_ENTRY_CODE_LENGTH } from "@/lib/settings/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import {
  createToken,
  describeParticipantError,
  fetchParticipants,
  registerParticipant,
  releaseParticipant,
  useParticipantIdentity,
} from "@/lib/participants/client";
import { useSiteSettings } from "@/lib/settings/client";
import { MAX_NAME_LENGTH, normalizeName, validateName } from "@/lib/participants/shared";

/** 참가자명을 직접 입력해 이 기기를 등록하는 화면 (/join). 등록 전에는 다른 화면을 볼 수 없다 */
export function JoinScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { identity, save, clear } = useParticipantIdentity();

  const settings = useSiteSettings();
  const [name, setName] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 기기에 남은 신원이 서버에서 해제되었으면(사회자의 "기기 초기화" 등) 지운다
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    fetchParticipants(identity.token)
      .then((result) => {
        if (!cancelled && result.me === null) clear();
      })
      .catch(() => undefined); // 연결 오류는 등록을 시도할 때 안내한다
    return () => {
      cancelled = true;
    };
  }, [identity, clear]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeName(name);
    const invalid = validateName(normalized);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!entryCode.trim()) {
      setError("입장코드를 입력해 주세요.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const token = identity?.token ?? createToken();
      await registerParticipant({ name: normalized, token }, entryCode);
      // 새 이름 등록에 성공한 뒤에 이전 이름을 푼다 (실패하면 이전 이름이 그대로 남는다)
      if (identity && identity.name !== normalized)
        await releaseParticipant(identity).catch(() => undefined);
      save({ name: normalized, token });
      // 이 페이지를 떠났다가 돌아오면 Next.js 가 React 상태를 복원하므로 진행 표시와 입력값을 먼저 풀어 둔다
      setBusy(false);
      setName("");
      setEntryCode("");
      router.push(next);
    } catch (err) {
      setError(describeParticipantError(err));
      setBusy(false);
    }
  }

  if (identity === undefined) {
    return <p className="text-center text-2xl text-zinc-500">불러오는 중...</p>;
  }

  // 이미 등록한 기기가 이름을 바꾸려면 사회자가 허용해 두어야 한다
  if (identity && settings === undefined) {
    return <p className="text-center text-2xl text-zinc-500">불러오는 중...</p>;
  }
  if (identity && !settings?.allowRename) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-black md:text-5xl">이름은 바꿀 수 없어요</h1>
        <p className="text-xl text-zinc-600 md:text-2xl">
          <span className="font-bold text-indigo-700">{identity.name}</span>님으로 등록되어 있어요.
          이름을 바꾸려면 사회자에게 이름 변경 허용을 요청하세요.
        </p>
        <Button size="lg" onClick={() => router.push(next)}>
          돌아가기
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-black md:text-6xl">👋 참가자명을 입력해 주세요</h1>
        <p className="mt-3 text-xl text-zinc-600 md:text-2xl">
          이 기기가 입력한 이름으로 등록돼요. 다음부터는 로그인 없이 바로 이어집니다.
        </p>
        {identity && (
          <p className="mt-2 text-xl text-indigo-700">
            지금은 <span className="font-bold">{identity.name}</span>님으로 등록되어 있어요.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex w-full max-w-2xl flex-col items-stretch gap-4">
        <label htmlFor="participant-name-input" className="text-2xl font-bold">
          참가자명
        </label>
        <input
          id="participant-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH * 2}
          autoComplete="name"
          autoFocus
          placeholder="예: 홍길동"
          className="rounded-2xl border-4 border-indigo-200 bg-white px-6 py-4 text-3xl font-bold focus:border-indigo-500 focus:outline-none"
        />
        <p className="text-lg text-zinc-500">
          {MAX_NAME_LENGTH}자 이하 · 다른 사람과 같은 이름은 쓸 수 없어요.
        </p>
        <label htmlFor="entry-code-input" className="text-2xl font-bold">
          입장코드
        </label>
        <input
          id="entry-code-input"
          type="password"
          value={entryCode}
          onChange={(event) => setEntryCode(event.target.value)}
          maxLength={MAX_ENTRY_CODE_LENGTH}
          autoComplete="off"
          placeholder="사회자가 안내한 입장코드"
          className="rounded-2xl border-4 border-indigo-200 bg-white px-6 py-4 text-3xl font-bold focus:border-indigo-500 focus:outline-none"
        />
        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 px-6 py-3 text-xl font-bold text-red-700"
          >
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "등록 중..." : identity ? "이 이름으로 바꾸기" : "참여하기"}
        </Button>
      </form>

      <Link href="/host" className="text-xl text-zinc-600 underline">
        🔒 사회자 메뉴
      </Link>
      {identity && (
        <Button variant="secondary" onClick={() => router.push(next)}>
          그대로 두고 돌아가기
        </Button>
      )}
    </section>
  );
}

/** 외부 주소로 보내지 않도록 같은 사이트의 경로만 허용한다 */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
