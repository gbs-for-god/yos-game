"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { HostPinForm } from "@/components/host/HostPinForm";
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
import { MAX_ENTRY_CODE_LENGTH, type HostSettings } from "@/lib/settings/shared";

/**
 * 사회자 전용 메뉴 (/host): 비밀번호를 확인한 뒤 사이트 전체 설정을 켜고 끈다.
 * children 은 비밀번호를 확인한 뒤에만 보이는 게임별 관리 패널이다 (app/host/page.tsx 가 레지스트리에서 모아 넘긴다).
 */
export function HostMenu({ children }: { children?: ReactNode }) {
  const storedPin = useStoredValue(hostPinStore);
  if (storedPin === LOADING) {
    return <p className="text-center text-2xl text-zinc-500">불러오는 중...</p>;
  }
  if (storedPin === null) {
    // 잠긴 상태에서도 메인 화면으로 돌아갈 수 있어야 한다
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex justify-end">
          <Link href="/" className="text-xl text-zinc-500 underline hover:text-zinc-900">
            ← 메인으로
          </Link>
        </div>
        <HostPinForm title="🔒 사회자 메뉴" />
      </div>
    );
  }
  return <Settings pin={storedPin}>{children}</Settings>;
}

function Settings({ pin, children }: { pin: string; children?: ReactNode }) {
  const [settings, setSettings] = useState<HostSettings | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entryCode, setEntryCode] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSettings(pin)
      .then((value) => {
        if (!cancelled) {
          setSettings(value);
          setEntryCode(value.entryCode);
        }
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

  async function saveEntryCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      setSettings(await saveSettings({ entryCode }, pin));
      setSaved(true);
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

      <form
        onSubmit={saveEntryCode}
        className="flex flex-col gap-4 rounded-3xl border-4 border-zinc-200 bg-white px-8 py-6"
      >
        <label htmlFor="host-entry-code" className="text-3xl font-bold">
          입장코드
        </label>
        <p className="text-xl text-zinc-600">
          참가자 등록과 이름 변경에 사용할 코드를 정하고 참가자에게 안내해 주세요.
        </p>
        <input
          id="host-entry-code"
          value={entryCode}
          onChange={(event) => {
            setEntryCode(event.target.value);
            setSaved(false);
          }}
          maxLength={MAX_ENTRY_CODE_LENGTH}
          autoComplete="off"
          disabled={!settings || saving}
          className="rounded-2xl border-4 border-indigo-200 px-6 py-4 text-3xl font-bold"
        />
        <Button type="submit" disabled={!settings || saving}>
          입장코드 저장
        </Button>
        {settings && !settings.entryCode && (
          <p className="text-xl text-amber-800">입장코드를 설정해야 참가자가 등록할 수 있어요.</p>
        )}
        {saved && (
          <p role="status" className="text-xl font-bold text-emerald-700">
            입장코드를 저장했어요.
          </p>
        )}
      </form>
      {children}
    </section>
  );
}
