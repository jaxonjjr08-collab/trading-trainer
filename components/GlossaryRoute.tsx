"use client";

// v2.8 — Client wrapper for /glossary. Renders TermDetail when ?term=X is in
// the URL, otherwise the Glossary list. Mirrors LearnRoute's split so the
// detail panel stays one shared component with two parents.

import { useRouter, useSearchParams } from "next/navigation";
import { LEARN_TERMS } from "@/lib/learn";
import Glossary from "./Glossary";
import TermDetail from "./TermDetail";

export default function GlossaryRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTermId = searchParams.get("term");
  const openTerm =
    urlTermId && LEARN_TERMS.some((t) => t.id === urlTermId)
      ? LEARN_TERMS.find((t) => t.id === urlTermId) ?? null
      : null;

  function closeDetail() {
    router.replace("/glossary", { scroll: false });
  }

  function jumpToTerm(id: string) {
    router.replace(`/glossary?term=${id}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (openTerm) {
    return (
      <TermDetail
        term={openTerm}
        onClose={closeDetail}
        onJump={jumpToTerm}
        backLabel="Back to glossary"
      />
    );
  }

  return <Glossary />;
}
