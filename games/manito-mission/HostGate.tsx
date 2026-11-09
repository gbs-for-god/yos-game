import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { describeError, sendAction } from "./client";

type HostGateProps = {
  onUnlock: (pin: string) => void;
  onCancel: () => void;
};

/** 사회자 화면에 들어가기 전 비밀번호를 서버에 확인하는 화면 */
export function HostGate({ onUnlock, onCancel }: HostGateProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    try {
      await sendAction({ type: "verify" }, { hostPin: input });
      onUnlock(input);
    } catch (err) {
      setError(describeError(err));
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
      <h2 className="text-5xl font-black">🔒 사회자 확인</h2>
      <p className="text-2xl text-zinc-600">사회자 비밀번호를 입력하세요.</p>
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
        className="w-64 rounded-2xl border-4 border-zinc-300 px-5 py-3 text-center text-4xl tracking-widest"
      />
      {error && (
        <p role="alert" className="text-2xl font-bold text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-center gap-6">
        <Button type="submit" size="lg" disabled={checking}>
          {checking ? "확인 중..." : "들어가기"}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
