"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ViolationType =
  | "tab_switch"
  | "fullscreen_exit"
  | "refresh"
  | "copy"
  | "paste"
  | "right_click"
  | "back_navigation";

export function ViolationMonitor({
  attemptId,
  testId,
  requireFullscreen,
  disableCopyPaste,
  disableRightClick,
  disableBackNavigation,
  maxViolations,
}: {
  attemptId: string;
  testId: string;
  requireFullscreen: boolean;
  disableCopyPaste: boolean;
  disableRightClick: boolean;
  disableBackNavigation: boolean;
  maxViolations: number;
  warnAfterViolations: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement)
  );
  const submittedRef = useRef(false);

  const report = useCallback(
    async (type: ViolationType, detail?: string, useBeacon = false) => {
      if (submittedRef.current) return;
      const payload = JSON.stringify({ attemptId, type, detail });

      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/violations", new Blob([payload], { type: "application/json" }));
        return;
      }

      try {
        const res = await fetch("/api/violations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = await res.json();
        if (data.ignored) return;
        setCount(data.violationCount ?? 0);
        if (data.autoSubmitted) {
          submittedRef.current = true;
          router.push(`/assessment/${testId}/submitted`);
          return;
        }
        if (data.warned) {
          setWarning(
            `Warning: ${data.violationCount}/${data.maxViolations} violations logged. Reaching ${data.maxViolations} will auto-submit your assessment.`
          );
        }
      } catch {
        // best-effort — a failed log shouldn't block the candidate
      }
    },
    [attemptId, testId, router]
  );

  // Tab switch / app backgrounding
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) report("tab_switch");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [report]);

  // Refresh / close — best-effort beacon, cannot block the navigation
  useEffect(() => {
    const onUnload = () => report("refresh", undefined, true);
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [report]);

  // Fullscreen enforcement
  useEffect(() => {
    if (!requireFullscreen) return;
    const onFsChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      if (!fs) report("fullscreen_exit");
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [requireFullscreen, report]);

  // Copy / paste / cut
  useEffect(() => {
    if (!disableCopyPaste) return;
    const block = (type: "copy" | "paste") => (e: ClipboardEvent) => {
      e.preventDefault();
      report(type);
    };
    const onCopy = block("copy");
    const onPaste = block("paste");
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [disableCopyPaste, report]);

  // Right-click
  useEffect(() => {
    if (!disableRightClick) return;
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      report("right_click");
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, [disableRightClick, report]);

  // Back navigation — trap the candidate on this page and log the attempt
  useEffect(() => {
    if (!disableBackNavigation) return;
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      report("back_navigation");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [disableBackNavigation, report]);

  return (
    <div className="mb-4 flex flex-col gap-2">
      {requireFullscreen && !isFullscreen ? (
        <button
          type="button"
          onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
          className="border border-danger bg-danger-bg px-4 py-2.5 text-sm text-danger text-left"
        >
          This assessment requires fullscreen. Click here to continue.
        </button>
      ) : null}
      {warning ? (
        <p className="border border-amber bg-panel px-4 py-2.5 text-sm text-amber-dark">{warning}</p>
      ) : null}
      {count > 0 ? (
        <p className="text-xs text-ink-muted">
          {count} of {maxViolations} integrity events logged for this attempt.
        </p>
      ) : null}
    </div>
  );
}
