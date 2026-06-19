"use client";

import { useMemo, useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { calculateExportPrice, ResourceKey } from "@/app";
import { useProjectContext } from "@/context";
import { useParams } from "next/navigation";
import { WPimportProps } from "@/app/api/wordpress/[resources]/import/route";
import JSZip from "jszip";
import { PaymentModal } from "@/components/theme/paymentModal";

const PAGE_SIZE = 11;
const CELL_TRUNCATE_LENGTH = 60;

export default function ExportResources() {
  const params = useParams();
  const { shopifyData, wpImportSettings } = useProjectContext();
  const key = (params.resources as string).toUpperCase() as ResourceKey;
  const selectedData = shopifyData[key];

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const records = useMemo(() => {
    if (!selectedData) return [];
    return Array.isArray(selectedData) ? selectedData : [selectedData];
  }, [selectedData]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    records.forEach((r) =>
      Object.keys(r as object).forEach((k) => keys.add(k)),
    );
    return Array.from(keys);
  }, [records]);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  useEffect(() => {
    setSelected(new Set(records.map((_, i) => i)));
  }, [records]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const visibleGlobalIndices = visible.map((_, i) => safePage * PAGE_SIZE + i);

  const toggleRow = (globalIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
      return next;
    });
  };

  const allVisibleSelected = visibleGlobalIndices.every((i) => selected.has(i));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleGlobalIndices.forEach((i) => next.delete(i));
      } else {
        visibleGlobalIndices.forEach((i) => next.add(i));
      }
      return next;
    });
  };

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const truncate = (text: string) =>
    text.length > CELL_TRUNCATE_LENGTH
      ? `${text.slice(0, CELL_TRUNCATE_LENGTH)}…`
      : text;

  const handleGenerateWordPressImport = async () => {
    if (!key) return;

    // Export only selected records
    const selectedRecords = records.filter((_, i) => selected.has(i));

    try {
      const zip = new JSZip();
      let totalParts = 1;

      for (let part = 1; part <= totalParts; part++) {
        const data: WPimportProps = {
          cfg: wpImportSettings,
          data: selectedRecords as any,
          part,
        };

        const res = await fetch(`/api/wordpress/${key.toLowerCase()}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(
            error.message ?? "Something went wrong generating WordPress import",
          );
        }

        totalParts = Number(res.headers.get("X-Total-Parts")) || 1;
        const filename =
          res.headers.get("X-Filename") ??
          `${key}-wordpress-import-part${part}.xml`;

        const xmlText = await res.text();
        zip.file(filename, xmlText);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${key}-wordpress-import.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(
        error.message ?? "Something went wrong generating WordPress import",
      );
    }
  };

  const price = calculateExportPrice(selected.size);

  if (!selectedData) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data found for &quot;{params.resources as string}&quot;.
      </div>
    );
  }

  const gridTemplate = `40px repeat(${columns.length}, minmax(120px, 1fr))`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold capitalize text-primary/80">
          Exported {params.resources as string} From Shopify
          {selected.size > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({selected.size} of {records.length} selected)
            </span>
          )}
        </h2>

        <div className="flex gap-2">
          <button
            className="rounded-sm text-sm px-2 py-1 hover:bg-blue-600/70 bg-blue-600/80 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowPaymentModal(true)}
            disabled={selected.size === 0}
          >
            Export {selected.size} Record{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm"
      />

      <div className="relative overflow-hidden rounded-md border border-gray-200">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header row */}
            <div
              className="grid bg-gray-50 border-b border-gray-200"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div className="flex items-center justify-center px-2 py-2">
                <Checkbox
                  checked={visible.length > 0 && allVisibleSelected}
                  onClick={toggleAll}
                />
              </div>
              {columns.map((col) => (
                <div
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-600 truncate"
                  title={col}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Visible rows */}
            {visible.map((row, i) => {
              const globalIndex = safePage * PAGE_SIZE + i;
              const isSelected = selected.has(globalIndex);
              return (
                <div
                  key={globalIndex}
                  onClick={() => toggleRow(globalIndex)}
                  className={`grid border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? "" : "hover:bg-gray-50"
                  }`}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div
                    className="flex items-center justify-center px-2 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onClick={() => toggleRow(globalIndex)}
                    />
                  </div>
                  {columns.map((col) => {
                    const raw = formatCell(
                      (row as Record<string, unknown>)[col],
                    );
                    return (
                      <div
                        key={col}
                        className="px-3 py-2 text-sm truncate"
                        title={
                          raw.length > CELL_TRUNCATE_LENGTH ? raw : undefined
                        }
                      >
                        {truncate(raw)}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {visible.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">
                No records match your search.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex mt-7 items-center justify-end gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>

          {(() => {
            const pages: (number | "...")[] = [];
            const delta = 1; // pages on each side of current

            const rangeStart = Math.max(1, safePage - delta);
            const rangeEnd = Math.min(totalPages - 2, safePage + delta);

            // Always show first page
            pages.push(0);

            // Left ellipsis
            if (rangeStart > 1) pages.push("...");

            // Window around current page
            for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

            // Right ellipsis
            if (rangeEnd < totalPages - 2) pages.push("...");

            // Always show last page
            if (totalPages > 1) pages.push(totalPages - 1);

            return pages.map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="w-6 text-center text-gray-300"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                    p === safePage
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {(p as number) + 1}
                </button>
              ),
            );
          })()}

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage === totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* pricing popup */}
      {/* {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Confirm Export
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              You're exporting {selected.size} record
              {selected.size !== 1 ? "s" : ""}.
            </p>

            <div className="rounded-md bg-gray-50 border border-gray-100 p-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Records</span>
                <span>{selected.size}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Price per record</span>
                <span>$0.15</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-gray-800 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>{price.formatted}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 rounded-sm text-sm px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-sm text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                onClick={() => {
                  setShowPaymentModal(false);
                  handleGenerateWordPressImport();
                }}
                disabled={loading}
              >
                {loading ? "Processing..." : `Pay ${price.formatted}`}
              </button>
            </div>
          </div>
        </div>
      )} */}

      <PaymentModal
        open={showPaymentModal}
        price={{
          itemCount: selected.size,
          total: price.total,
          formatted: price.formatted,
        }}
        onSuccess={() => handleGenerateWordPressImport()}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  );
}

function Checkbox({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
        checked
          ? "bg-black border-black"
          : "bg-white border-gray-300 hover:border-gray-400"
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </button>
  );
}
