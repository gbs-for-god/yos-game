"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { LOADING, useStoredValue } from "@/lib/hooks/useStoredValue";
import { hostPinStore } from "@/lib/host/client";
import {
  describeSettingsError,
  fetchSettings,
  saveSettings,
  SettingsApiError,
} from "@/lib/settings/client";
import type { SiteSettings } from "@/lib/settings/shared";

/** 사회자 전용 메뉴 (/host): 비밀번호를 확인한 뒤 사이트 전체 설정을 켜고 끈다 */
export function HostMenu() {
  const storedPin = useStoredValue(hostPinStore);
  if (storedPin === LOADING) {
    return <p className="text-center text-2xl text-zinc-500">불러오는 중...</p>;
  }
  if (storedPin === null) return <PinForm />;
  return <Settings pin={storedPin} />;
}

function PinForm() {
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
      <h1 className="text-5xl font-black">🔒 사회자 메뉴</h1>
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
      <Button type="submit" size="lg" disabled={checking}>
        {checking ? "확인 중..." : "들어가기"}
      </Button>
    </form>
  );
}

function Settings({ pin }: { pin: string }) {
  const [settings, setSettings] = useState<SiteSettings | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSettings(pin)
      .then((value) => {
        if (!cancelled) setSettings(value);
      })
      .catch((err) => {
        if (cancelled) return;
        // 비밀번호가 바뀌었으면 다시 입력하게 한다
        if (err instanceof SettingsApiError && err.status === 401) hostPinStore.save(null);
        else setError(describeSettingsError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [pin]);

  async function toggleRename() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      setSettings(await saveSettings({ allowRename: !settings.allowRename }, pin));
    } catch (err) {
      setError(describeSettingsError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-5xl font-black">🔒 사회자 메뉴</h1>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl text-zinc-500 underline hover:text-zinc-900">
            ← 메인으로
          </Link>
          <Button variant="secondary" onClick={() => hostPinStore.save(null)}>
            잠그기
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-6 py-3 text-xl font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border-4 border-zinc-200 bg-white px-8 py-6">
        <div>
          <h2 className="text-3xl font-bold">참가자 이름 변경 허용</h2>
          <p className="mt-2 text-xl text-zinc-600">
            꺼져 있으면 참가자는 한 번 등록한 이름을 바꿀 수 없어요. 잘못 등록했을 때만 잠깐 켜
            주세요.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings?.allowRename ?? false}
          aria-label="참가자 이름 변경 허용"
          disabled={settings === undefined || saving}
          onClick={toggleRename}
          className={cn(
            "rounded-2xl px-8 py-4 text-3xl font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            settings?.allowRename
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300",
          )}
        >
          {settings === undefined ? "..." : settings.allowRename ? "ON" : "OFF"}
        </button>
      </div>
    </section>
  );
}
