"use client";

import { useMemo, useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, InfoIcon } from "lucide-react";
import { calculateExportPrice, ResourceKey } from "@/app";
import { useProjectContext } from "@/context";
import { useParams } from "next/navigation";
import { WPimportProps } from "@/app/api/wordpress/[resources]/import/route";
import JSZip from "jszip";
import { PaymentModal } from "@/components/theme/paymentModal";
import { ToolTip } from "@/components";
import { createExportFingerprint } from "@/lib/exportFingerprint";

type PaymentData = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  fingerprint?: string;
  shopDomain?: string;
  resource?: string;
  itemCount?: number;
  free?: boolean;
};

const PAGE_SIZE = 11;
const CELL_TRUNCATE_LENGTH = 60;

export default function ExportResources() {
  const params = useParams();
  const { shopifyData, wpImportSettings, activeProject } = useProjectContext();
  const key = (params.resources as string).toUpperCase() as ResourceKey;
  const selectedData = shopifyData[key];
  const [exportFingerprint, setExportFingerprint] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [prevFingerprint, setPrevFingerprint] = useState("");
  const [prevIds, setPrevIds] = useState<Set<string>>(new Set());

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

  const generateWordpressImport = async () => {
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

  const handleExportSuccess = async (paymentData?: PaymentData) => {
    const res = await fetch("/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    if (!res.ok) {
      console.error("Payment verification failed");
      return;
    }

    const timer = setTimeout(async () => {
      await generateWordpressImport();
    }, 1500);

    setShowPaymentModal(false);

    return () => clearTimeout(timer);
  };

  const price = calculateExportPrice(selected.size);

  if (!activeProject)
    return (
      <div className="p-8 text-center text-gray-500">No project selected!</div>
    );

  if (!selectedData) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data found for &quot;{params.resources as string}&quot;.
      </div>
    );
  }

  const getSelectedFingerprint = async () => {
    const ids = records
      .filter((_, i) => selected.has(i))
      .map((item: any) => item.id)
      .filter(Boolean);
    // If we already have a fingerprint and the current ids are a subset of previous ids, reuse it
    if (prevFingerprint && ids.every((id) => prevIds.has(id))) {
      return prevFingerprint;
    }
    const newFingerprint = await createExportFingerprint(ids);
    setPrevFingerprint(newFingerprint);
    setPrevIds(new Set(ids));
    return newFingerprint;
  };

  const gridTemplate = `40px repeat(${columns.length}, minmax(120px, 1fr))`;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm flex items-center flex-wrap gap-2 font-semibold capitalize text-primary/80">
          <span>Exported {params.resources as string} From Shopify</span>

          {selected.size > 0 && (
            <span className="text-xs font-normal text-gray-400">
              ({selected.size} of {records.length} selected)
            </span>
          )}

          <ToolTip
            content={
              <div className="space-y-2 text-xs max-w-xs">
                <p className="font-semibold text-orange-400">
                  Selection & Pricing
                </p>
                <p className="pt-2">
                  If you have already paid for a set of items, any new export
                  that selects a <strong>subset</strong> of those items is
                  available instantly. No additional payment steps required.
                </p>
              </div>
            }
            trigger={
              <InfoIcon size={18} className="text-primary/60 shrink-0" />
            }
            side="bottom"
          />
        </h2>

        <div className="flex items-center justify-end gap-2">
          <ToolTip
            content={
              <div className="space-y-2 text-xs max-w-xs">
                <p className="font-semibold text-orange-400">
                  Migration pricing details
                </p>

                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Up to 20,000 items</span>
                    {" — "}
                    <span className="font-semibold">$0.20/item</span>
                  </p>

                  <p>Covers shopify store&apos;s:</p>

                  <ul className="list-disc space-y-0.5 pl-4">
                    <li>Blog</li>
                    <li>Pages</li>
                    <li>Media library</li>
                    <li>Products</li>
                    <li>Orders</li>
                  </ul>
                </div>
              </div>
            }
            trigger={
              <InfoIcon size={18} className="text-primary/60 shrink-0" />
            }
            side="bottom"
          />

          <button
            className="rounded-sm text-xs md:text-sm px-2 py-1 hover:bg-blue-600/70 bg-blue-600/80 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            onClick={async () => {
              if (!activeProject) return;

              const fingerprint = await getSelectedFingerprint();

              const res = await fetch("/api/payment/check-export", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  fingerprint,
                  shopDomain: activeProject,
                  resource: key,
                }),
              });

              const data = await res.json();

              if (data.paid) {
                await generateWordpressImport();
                return;
              }

              setExportFingerprint(fingerprint);
              setShowPaymentModal(true);
            }}
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

      <PaymentModal
        fingerprint={exportFingerprint}
        open={showPaymentModal}
        shopDomain={activeProject}
        resource={key}
        price={{
          itemCount: selected.size,
          total: price.total,
          formatted: price.formatted,
        }}
        onSuccess={handleExportSuccess}
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
