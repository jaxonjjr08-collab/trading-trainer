import Link from "next/link";
import type { Lesson } from "@/lib/lessons";
import type { LearnTerm } from "@/lib/learn";
import { focusForTerm, setupTypesForFocus } from "@/lib/learn";
import { quizFor } from "@/lib/learn-quizzes";
import { MISTAKE_TAGS } from "@/lib/mistakes";
import type { MistakeTag } from "@/lib/types";

type Props = {
  lesson: Lesson | null;
  term?: LearnTerm | null;
  primaryTag?: MistakeTag | null;
};

export default function LessonCard({ lesson, term, primaryTag }: Props) {
  if (!lesson) return null;

  const learnHref = term ? `/learn?term=${term.id}` : null;
  const hasQuiz = term ? quizFor(term.id) != null : false;
  const focus = term ? focusForTerm(term.id) : null;
  const hasPractice = focus ? setupTypesForFocus(focus).length > 0 : false;
  const practiceHref = focus ? `/practice?focus=${focus}` : null;
  const tagInfo = primaryTag ? MISTAKE_TAGS[primaryTag] : null;

  return (
    <div className="rounded-md border border-warn/40 bg-warn/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-warn">Recommended lesson</div>
        {tagInfo && (
          <span className="text-[10px] uppercase tracking-wider text-muted">
            Triggered by: <span className="text-bad">{tagInfo.label}</span>
          </span>
        )}
      </div>
      <div>
        <div className="text-base font-semibold text-text">{lesson.title}</div>
        <p className="text-xs text-muted leading-snug mt-1">{lesson.why}</p>
      </div>
      <div className="text-xs">
        <span className="text-warn font-semibold">Next step: </span>
        <span className="text-text">{lesson.nextStep}</span>
      </div>
      {(learnHref || hasQuiz || hasPractice) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {learnHref && (
            <Link
              href={learnHref}
              className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-md hover:opacity-90"
            >
              Open lesson →
            </Link>
          )}
          {learnHref && hasQuiz && (
            <Link
              href={`${learnHref}#quiz`}
              className="text-xs font-semibold border border-accent/50 text-accent bg-panel px-3 py-1.5 rounded-md hover:bg-accent/10"
            >
              Take quiz
            </Link>
          )}
          {hasPractice && practiceHref && (
            <Link
              href={practiceHref}
              className="text-xs font-semibold border border-line bg-panel px-3 py-1.5 rounded-md hover:bg-panel2"
            >
              Practice this concept
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
