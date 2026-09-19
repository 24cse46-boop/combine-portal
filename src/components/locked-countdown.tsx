"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function LockedCountdown({ targetIso }: { targetIso: string }) {
  const router = useRouter();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const offsetRef = useRef(0); // serverNow - clientNow, in ms
  const refreshedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function syncClock() {
      try {
        const res = await fetch("/api/server-time", { cache: "no-store" });
        const { now } = await res.json();
        if (!cancelled) offsetRef.current = new Date(now).getTime() - Date.now();
      } catch {
        // Fall back to the device clock if the sync request fails.
      }
    }

    syncClock();
    const resync = setInterval(syncClock, 30_000);
    return () => {
      cancelled = true;
      clearInterval(resync);
    };
  }, []);

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    const tick = () => {
      const serverNow = Date.now() + offsetRef.current;
      const left = target - serverNow;
      setRemainingMs(left);
      if (left <= 0 && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetIso, router]);

  if (remainingMs === null) {
    return <p className="font-mono text-2xl text-teal">--:--:--:--</p>;
  }

  const clamped = Math.max(0, remainingMs);
  const days = Math.floor(clamped / 86_400_000);
  const hours = Math.floor((clamped % 86_400_000) / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <p className="font-mono text-2xl text-teal" aria-live="polite">
      {pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </p>
  );
}
