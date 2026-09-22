import { RefreshCwIcon, SearchIcon } from "lucide-react";
import { EXPORT_PAGE_SIZE } from "./export-config";
import { Pagination } from "./pagination";
import { TableCheckbox } from "./table-checkbox";

export type RecordsPanelProps = {
  columns: string[];
  filtered: any[];
  search: string;
  onSearch: (value: string) => void;
  page: number;
  onPage: (next: number) => void;
  previewIndex: number;
  onPreview: (index: number) => void;
  selected: Set<number>;
  onToggleRow: (globalIndex: number) => void;
  onToggleAll: () => void;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  allVisibleSelected: boolean;
  hasUnshownRecords: boolean;
  shownCount: number;
  snapshotTotal: number;
  includeAll: boolean;
  idsLoading: boolean;
  onToggleIncludeAll: () => void;
  refreshing: boolean;
  busy: boolean;
  onRefresh: () => void;
  formatCell: (value: unknown) => string;
  truncate: (text: string) => string;
};
/** Search toolbar, partial-snapshot banner, records grid, footer pager. */
export function RecordsPanel(props: RecordsPanelProps) {
  const {
    columns,
    filtered,
    search,
    onSearch,
    page,
    onPage,
    previewIndex,
    onPreview,
    selected,
    onToggleRow,
    onToggleAll,
    onSelectAllFiltered,
    onClearSelection,
    allVisibleSelected,
    hasUnshownRecords,
    shownCount,
    snapshotTotal,
    includeAll,
    idsLoading,
    onToggleIncludeAll,
    refreshing,
    busy,
    onRefresh,
    formatCell,
    truncate,
  } = props;

  const totalPages = Math.max(1, Math.ceil(filtered.length / EXPORT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(
    safePage * EXPORT_PAGE_SIZE,
    (safePage + 1) * EXPORT_PAGE_SIZE,
  );
  const gridTemplate = `40px repeat(${columns.length}, minmax(120px, 1fr))`;

  return (
    <section className="min-w-0 overflow-hidden rounded-sm border border-primary/10 bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b border-primary/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/40"
          />
          <input
            type="text"
            placeholder="Search records…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-primary/15 bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-primary/30 focus:border-primary/40"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || busy}
            title="Re-fetch this resource from the source and rebuild the snapshot"
            className="flex items-center gap-1.5 rounded-lg border border-primary/15 px-2.5 py-1.5 font-medium text-primary/70 transition-colors hover:border-primary/30 hover:text-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCwIcon
              size={12}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          <span className="h-3.5 w-px bg-primary/15" />

          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="rounded-md font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            Select all {filtered.length.toLocaleString()}
          </button>

          <span className="h-3.5 w-px bg-primary/15" />

          <button
            type="button"
            onClick={onClearSelection}
            disabled={selected.size === 0 && !includeAll}
            className="rounded-md font-medium text-primary/50 transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear selection
          </button>
        </div>
      </div>

      {hasUnshownRecords && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-blue-50/50 px-5 py-3">
          <p className="text-xs text-primary/70">
            Showing the first{" "}
            <span className="font-medium text-primary/90">
              {shownCount.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="font-medium text-primary/90">
              {snapshotTotal.toLocaleString()}
            </span>{" "}
            stored records.
          </p>

          <button
            type="button"
            onClick={onToggleIncludeAll}
            disabled={idsLoading}
            className="rounded-lg border border-primary/15 bg-background px-2.5 py-1.5 text-xs font-medium text-primary/80 transition-colors hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {idsLoading
              ? "Loading records…"
              : includeAll
                ? "Export selected rows only"
                : `Include all ${snapshotTotal.toLocaleString()} records`}
          </button>
        </div>
      )}

      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div
              className="grid border-b border-primary/10 bg-primary/[0.03] text-[11px] font-semibold uppercase tracking-wide text-primary/50"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="flex items-center justify-center px-2 py-2.5">
                <TableCheckbox
                  checked={visible.length > 0 && allVisibleSelected}
                  onClick={onToggleAll}
                />
              </div>

              {columns.map((col) => (
                <div key={col} className="truncate px-3 py-2.5 text-left">
                  {col}
                </div>
              ))}
            </div>

            {visible.map((row, i) => {
              const globalIndex = safePage * EXPORT_PAGE_SIZE + i;
              const isSelected = selected.has(globalIndex);
              const isPreview = previewIndex === i;

              return (
                <div
                  key={globalIndex}
                  onMouseEnter={() => onPreview(i)}
                  onClick={() => {
                    onToggleRow(globalIndex);
                    onPreview(i);
                  }}
                  className={`grid cursor-pointer border-b border-primary/10 text-sm transition-colors last:border-b-0 ${
                    isSelected ? "bg-blue-50/60" : "hover:bg-primary/[0.03]"
                  }`}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div
                    className={`flex items-center justify-center px-2 py-2 ${
                      isSelected || isPreview
                        ? "border-l-2 border-blue-600 pl-[6px]"
                        : "border-l-2 border-transparent"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TableCheckbox
                      checked={isSelected}
                      onClick={() => onToggleRow(globalIndex)}
                    />
                  </div>

                  {columns.map((col) => {
                    const raw = formatCell((row as Record<string, unknown>)[col]);
                    return (
                      <div
                        key={col}
                        className="truncate px-3 py-2 text-[13px] text-primary/80"
                        title={raw.length > 60 ? raw : undefined}
                      >
                        {truncate(raw)}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {visible.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-1 px-5 py-14 text-center">
                <SearchIcon size={18} className="mb-1 text-primary/20" />
                <p className="text-sm font-medium text-primary/55">
                  No records match your search
                </p>
                <p className="text-xs text-primary/35">
                  Try a different keyword, or clear the search to see all
                  records.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-primary/10 px-5 py-3 text-xs">
        <span className="mr-auto text-primary/40">
          Page {(safePage + 1).toLocaleString()} of{" "}
          {totalPages.toLocaleString()} · {filtered.length.toLocaleString()}{" "}
          record
          {filtered.length !== 1 ? "s" : ""}
        </span>

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={(next) => onPage(next)}
        />
      </div>
    </section>
  );
}
