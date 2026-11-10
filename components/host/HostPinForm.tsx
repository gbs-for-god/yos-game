"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { hostPinStore } from "@/lib/host/client";
import { describeSettingsError, fetchSettings } from "@/lib/settings/client";

type HostPinFormProps = {
  title?: string;
  description?: string;
  /** 어두운 배경(게임 화면 안)에서 쓸 때 */
  dark?: boolean;
};

/**
 * 사회자 비밀번호를 서버에 확인하고 맞으면 이 탭에 기억하는 폼.
 * /host 메뉴와 사회자 로그인이 필요한 게임이 함께 쓴다. 성공하면 hostPinStore 가 바뀌므로
 * 부모는 useVerifiedHostPin() 으로 화면을 전환하면 된다.
 */
export function HostPinForm({
  title = "🔒 사회자 확인",
  description = "사회자 비밀번호를 입력하세요.",
  dark = false,
}: HostPinFormProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    try {
      await fetchSettings(input); // 틀리면 401 로 던진다
      hostPinStore.save(input);
    } catch (err) {
      setError(describeSettingsError(err));
      setInput("");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
    >
      <h1 className="text-5xl font-black">{title}</h1>
      <p className={dark ? "text-2xl text-zinc-400" : "text-2xl text-zinc-600"}>{description}</p>
      <label htmlFor="host-pin" className="text-2xl">
        사회자 비밀번호
      </label>
      <input
        id="host-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(null);
        }}
        className={
          dark
            ? "w-64 rounded-2xl border-4 border-zinc-600 bg-zinc-900 px-5 py-3 text-center text-4xl tracking-widest text-zinc-50"
            : "w-64 rounded-2xl border-4 border-zinc-300 px-5 py-3 text-center text-4xl tracking-widest"
        }
      />
      {error && (
        <p role="alert" className="text-2xl font-bold text-red-500">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={checking}>
        {checking ? "확인 중..." : "들어가기"}
      </Button>
    </form>
  );
}
