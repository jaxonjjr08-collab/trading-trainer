import BookmarksList from "@/components/BookmarksList";
import Link from "next/link";

export const metadata = {
  title: "Bookmarks — Trading Trainer",
};

export default function BookmarksPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/journal"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
        >
          <span aria-hidden>←</span> Back to journal
        </Link>
        <h1 className="text-2xl font-bold mt-2">Bookmarks</h1>
        <p className="text-muted text-sm mt-1">
          Scenarios you've starred to revisit. Open one to practice it again, or unbookmark when it stops teaching you anything new.
        </p>
      </div>
      <BookmarksList />
    </div>
  );
}
