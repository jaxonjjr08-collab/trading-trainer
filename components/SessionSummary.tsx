import Link from "next/link";
import type { Attempt, MistakeTag } from "@/lib/types";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import { computeSkillScores, strongestSkill, weakestSkill } from "@/lib/skills";
import { primaryTermForTags } from "@/lib/learn";
import { drillForSkill } from "@/lib/drills";

type Props = {
  attempts: Attempt[];
  onDismiss: () => void;
};

export default function SessionSummary({ attempts, onDismiss }: Props) {
  if (attempts.length === 0) return null;

  const avgScore = Math.round(
    attempts.reduce((s, a) => s + a.score.total, 0) / attempts.length
  );

  const skillScores = computeSkillScores(attempts);
  const best = strongestSkill(skillScores);
  const weak = weakestSkill(skillScores);

  const tagCounts = new Map<MistakeTag, number>();
  const allTags: MistakeTag[] = [];
  for (const a of attempts) {
    for (const t of a.score.tags) {
      if (MISTAKE_TAGS[t].positive) continue;
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      allTags.push(t);
    }
  }
  const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const recommendedTerm = primaryTermForTags(allTags);
  const recommendedDrill = weak ? drillForSkill(weak.id) : null;

  return (
    <div className="rounded-md border-2 border-accent/50 bg-accent/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-accent">Session summary</div>
          <h2 className="text-xl font-bold mt-0.5">
            {attempts.length} attempts this session
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted hover:text-text border border-line bg-panel px-2.5 py-1 rounded-md"
        >
          Dismiss
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Stat label="Avg process score" value={`${avgScore}/100`} />
        <Stat
          label="Best skill"
          value={best ? `${best.label} · ${best.score}%` : "—"}
        />
        <Stat
          label="Weakest skill"
          value={weak ? `${weak.label} · ${weak.score}%` : "—"}
        />
        <Stat
          label="Repeated mistake"
          value={topTag ? MISTAKE_TAGS[topTag].label : "None"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recommendedTerm && (
          <div className="rounded-md border border-accent/40 bg-panel p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-accent">Recommended lesson</div>
              <div className="text-sm font-semibold mt-0.5">{recommendedTerm.term}</div>
            </div>
            <Link
              href={`/learn?term=${recommendedTerm.id}`}
              className="shrink-0 text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
            >
              Open →
            </Link>
          </div>
        )}
        {recommendedDrill && (
          <div className="rounded-md border border-warn/40 bg-panel p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-warn">Recommended next drill</div>
              <div className="text-sm font-semibold mt-0.5">{recommendedDrill.title}</div>
            </div>
            <Link
              href={`/practice?drill=${recommendedDrill.id}`}
              className="shrink-0 text-xs font-semibold border border-warn/60 text-warn bg-panel px-3 py-1.5 rounded-md hover:bg-warn/10"
            >
              Start drill →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}
