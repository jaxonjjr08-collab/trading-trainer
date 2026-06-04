"use client";

// v5.4.0 — Banner shown on /paper-trading when a contextual lesson is
// eligible. Sits above the chart so it's visible without scrolling; users
// dismiss with "Got it" (records the lesson id to localStorage so it
// doesn't fire again) or jump to the full Learn term via "Learn more →."
//
// One banner at a time. The decision logic in lib/paper-trading-lessons
// guarantees that — it returns the highest-priority eligible lesson or
// null. The /paper-trading page reads that result and renders this
// component only when non-null.

import Link from "next/link";
import type { PaperLesson } from "@/lib/paper-trading-lessons";

type Props = {
  lesson: PaperLesson;
  onDismiss: () => void;
};

const TONE_STYLES = {
  info: {
    border: "border-accent/40",
    bg: "bg-accent/5",
    icon: "💡",
    title: "text-accent",
  },
  warn: {
    border: "border-warn/40",
    bg: "bg-warn/5",
    icon: "⚠️",
    title: "text-warn",
  },
  alert: {
    border: "border-bad/40",
    bg: "bg-bad/5",
    icon: "🚨",
    title: "text-bad",
  },
} as const;

export default function PaperLessonBanner({ lesson, onDismiss }: Props) {
  const styles = TONE_STYLES[lesson.tone];
  return (
    <div
      className={`rounded-md border ${styles.border} ${styles.bg} p-3 space-y-2`}
      role="region"
      aria-label={`Lesson: ${lesson.title}`}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-base leading-none mt-0.5">
          {styles.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${styles.title}`}>
            {lesson.title}
          </h3>
          <p className="text-xs text-text leading-snug mt-1">{lesson.body}</p>
          <div className="mt-2 flex items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={onDismiss}
              className="font-semibold text-muted hover:text-text"
            >
              Got it
            </button>
            <Link
              href={`/learn?term=${lesson.learnTermId}`}
              className="font-semibold text-accent hover:underline"
            >
              Learn more →
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss lesson"
          className="text-muted hover:text-text text-base leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
