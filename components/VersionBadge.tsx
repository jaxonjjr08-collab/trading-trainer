"use client";

import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";
import { CHANGELOG } from "@/lib/changelog";

const SEEN_KEY = "trainer.seenVersion.v1";

// v5.9.1 — the ⌘K palette's "What's new" command dispatches this event to
// open the changelog modal without the user clicking the header badge.
export const OPEN_CHANGELOG_EVENT = "trainer:open-changelog";

export default function VersionBadge() {
  const [open, setOpen] = useState(false);
  const [seenVersion, setSeenVersion] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(SEEN_KEY);
      setSeenVersion(seen);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // v5.9.1 — open from the command palette via a window event.
  useEffect(() => {
    function onOpen() {
      setOpen(true);
      markSeen();
    }
    window.addEventListener(OPEN_CHANGELOG_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHANGELOG_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markSeen() {
    try {
      window.localStorage.setItem(SEEN_KEY, APP_VERSION);
      setSeenVersion(APP_VERSION);
    } catch {
      // ignore
    }
  }

  function handleOpen() {
    setOpen(true);
    markSeen();
  }

  // Only render the "new" dot once we've checked localStorage to avoid hydration flash.
  const showDot = hydrated && seenVersion !== APP_VERSION;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative text-xs font-mono font-normal px-2 py-1 rounded border border-line text-muted bg-panel2 hover:bg-panel hover:text-text"
        title="What's new"
      >
        v{APP_VERSION}
        {showDot && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent"
          />
        )}
      </button>
      {open && <ChangelogModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ChangelogModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-line rounded-md max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3 sticky top-0 bg-panel">
          <h2 className="text-lg font-semibold">What's new</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-text"
          >
            Close ✕
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold">v{entry.version}</span>
                <span className="text-xs text-muted">{entry.date}</span>
              </div>
              <div className="text-sm font-semibold text-accent mt-0.5">
                {entry.title}
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {entry.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
