"use client";

// v2.6 — What to work on. Two side-by-side blocks: weakest skill and the
// recommended drill. No card borders — just labels + big names + CTA links.
// Replaces the old SkillMapPanel which boxed everything in a card.

import Link from "next/link";
import type { Attempt } from "@/lib/types";
import {
  computeSkillScores,
  SKILL_BY_ID,
  weakestSkill,
} from "@/lib/skills";
import { drillForSkill } from "@/lib/drills";
import { termById } from "@/lib/learn";
import type { DiagnosticResult } from "@/lib/diagnostic";

type Props = {
  attempts: Attempt[];
  diagnostic: DiagnosticResult | null;
};

export default function WhatToWorkOn({ attempts, diagnostic }: Props) {
  const scores = computeSkillScores(attempts);
  const measured = weakestSkill(scores);
  const skillId = measured?.id ?? diagnostic?.weakSkill ?? null;
  const skill = skillId ? SKILL_BY_ID[skillId] : null;
  const skillScore = scores.find((s) => s.id === skillId);
  const drill = skillId ? drillForSkill(skillId) : null;
  const term = skill ? termById(skill.termId) : null;

  if (!skill && !drill) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">What to work on</h2>
        <p className="text-sm text-muted">
          Take a few more attempts and a recommendation will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">What to work on</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-muted">Weakest skill</div>
          <div className="text-2xl font-bold tracking-tight">
            {skill?.label ?? "—"}
          </div>
          <div className="text-xs text-muted">
            {skillScore?.hasData
              ? `${skillScore.score}% over ${skillScore.attempts} signals`
              : "From diagnostic — refresh after a few practice attempts."}
          </div>
          {term && (
            <Link
              href={`/learn?term=${term.id}`}
              className="inline-block mt-1 text-sm text-accent hover:underline"
            >
              Read the lesson →
            </Link>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wider text-muted">Recommended drill</div>
          <div className="text-2xl font-bold tracking-tight">
            {drill?.title ?? "—"}
          </div>
          <div className="text-xs text-muted">
            {drill ? drill.description : "Unlocks after a few attempts."}
          </div>
          {drill && (
            <Link
              href={`/practice?drill=${drill.id}`}
              className="inline-block mt-1 text-sm text-accent hover:underline"
            >
              Start drill →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
