// v2.6 — Mascot + speech-bubble wrapper. Used for empty states and moments
// where the mascot needs to "say" something. Keep copy short — the bubble
// is small by design.

import Mascot, { type MascotMood, type MascotSize } from "./Mascot";

type Props = {
  mood?: MascotMood;
  size?: MascotSize;
  children: React.ReactNode;
  // Layout direction. "row" puts mascot left, bubble right (default).
  // "stack" puts mascot above, bubble below — used for hero empty states.
  layout?: "row" | "stack";
};

export default function MascotBubble({
  mood = "idle",
  size = "lg",
  children,
  layout = "row",
}: Props) {
  if (layout === "stack") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Mascot mood={mood} size={size} />
        <div className="relative max-w-md rounded-2xl bg-panel2 border border-line px-4 py-3 text-sm leading-relaxed text-text">
          {/* Pointer up toward mascot */}
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-panel2 border-l border-t border-line"
          />
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0">
        <Mascot mood={mood} size={size} />
      </div>
      <div className="relative flex-1 rounded-2xl bg-panel2 border border-line px-4 py-3 text-sm leading-relaxed text-text">
        {/* Pointer left toward mascot */}
        <span
          aria-hidden
          className="absolute top-4 -left-1.5 w-3 h-3 rotate-45 bg-panel2 border-l border-b border-line"
        />
        {children}
      </div>
    </div>
  );
}
