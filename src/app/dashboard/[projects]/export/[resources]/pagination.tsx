import { ChevronLeft, ChevronRight } from "lucide-react";

/** Windowed page list with prev/next controls. Hidden for single-page results. */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "gap")[] = [0];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages - 2, page + 1);

  if (start > 1) pages.push("gap");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 2) pages.push("gap");
  pages.push(totalPages - 1);

  const control =
    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className={`${control} border border-primary/10 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-30`}
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            className="w-5 text-center text-primary/25"
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-label={`Page ${entry + 1}`}
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onPageChange(entry)}
            className={`${control} ${
              entry === page
                ? "bg-blue-600 text-white"
                : "text-primary/60 hover:bg-primary/5"
            }`}
          >
            {entry + 1}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page === totalPages - 1}
        className={`${control} border border-primary/10 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-30`}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
