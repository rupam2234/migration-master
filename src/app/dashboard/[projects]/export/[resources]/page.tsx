"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  InfoIcon,
  Loader2Icon,
} from "lucide-react";
import { useProjectContext } from "@/context";
import { useParams } from "next/navigation";
import { WPimportProps } from "@/app/api/wordpress/[resources]/import/route";
import JSZip from "jszip";
import { PaymentModal } from "@/components/theme/paymentModal";
import { GlobalLoader, ItemPreview, ToolTip } from "@/components";
import { ResourceKey } from "@/lib/sharedResources";

type PaymentData = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  shopDomain?: string;
  resource?: string;
  itemIds?: string[];
  free?: boolean;
  couponId?: number | null;
};

const PAGE_SIZE = 11;
const CELL_TRUNCATE_LENGTH = 60;

export default function ExportResources() {
  const params = useParams();
  const { wpImportSettings, activeProject } = useProjectContext();
  const key = (params.resources as string).toUpperCase() as ResourceKey;

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newItemIds, setNewItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [checkoutMeta, setCheckoutMeta] = useState<{
    currency: "USD" | "INR";
    exchangeRate: number;
    freeDownloadsUsed: number;
    freeDownloadsLimit: number;
    eligibleForFree: boolean;
  } | null>(null);
  const [selectedData, setSelectedData] = useState<any>();
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeProject || !key) return;

    const cachedData = sessionStorage.getItem(
      `shopif_asset_cache:${activeProject}-${key}`,
    );

    if (cachedData) {
      setSelectedData(JSON.parse(cachedData).data);
    } else {
      setInitialLoading(true);
      return;
    }

    setInitialLoading(false); // stop the loading animation
  }, [activeProject, key]);

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

    // Export all currently selected records (owned + newly settled)
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
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
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

  if (initialLoading && !selectedData) {
    return <GlobalLoader />;
  }

  if (!activeProject)
    return (
      <div className="p-8 text-center text-gray-500">No project selected!</div>
    );

  if (!selectedData && !initialLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data found for &quot;{params.resources as string}&quot;.
      </div>
    );
  }

  const gridTemplate = `40px repeat(${columns.length}, minmax(120px, 1fr))`;

  const previewItem = visible[previewIndex] ?? visible[0] ?? null;

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
                  Items you&apos;ve already paid for (or received free) are
                  never charged again, even if your current selection also
                  includes new items.
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
                  <p>Covers shopify store&apos;s:</p>

                  <ul className="list-disc space-y-0.5 pl-4">
                    <li>Blog</li>
                    <li>Pages</li>
                    <li>Media library</li>
                    <li>Products</li>
                    <li>Orders</li>
                    <li>Customers</li>
                    <li>Coupons</li>
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
            className="rounded-sm min-w-[135px] text-xs md:text-sm px-2 py-1 hover:bg-blue-600/70 
            bg-blue-600/80 text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            onClick={async () => {
              if (!activeProject) return;

              setLoading(true);

              const itemIds = records
                .filter((_, i) => selected.has(i))
                .map((item: any) => item.id)
                .filter(Boolean);

              if (itemIds.length === 0) {
                setNewItemIds([]);
                setShowPaymentModal(true);
                setLoading(false);
                return;
              }

              const res = await fetch("/api/payment/check-export", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  shopDomain: activeProject,
                  resource: key === "IMAGES" ? "MEDIA_LIBRARY" : key,
                  itemIds,
                }),
              });
              const data = await res.json();

              if (data.allOwned) {
                await generateWordpressImport();
                setLoading(false);
                return;
              }

              // Set new items for potential paid export
              setNewItemIds(data.newItemIds ?? []);
              setCheckoutMeta({
                currency: data.currency ?? "USD",
                exchangeRate: data.exchangeRate ?? 83,
                freeDownloadsUsed:
                  data.freeDownloadsUsed ??
                  data.freeCount ??
                  (data.remainingFreeExports != null
                    ? Math.max(0, 3 - data.remainingFreeExports)
                    : 0),
                freeDownloadsLimit: data.freeDownloadsLimit ?? 3,
                eligibleForFree: data.eligibleForFree ?? false,
              });

              // Show payment modal — create-order decides free-vs-paid using
              // the same absolute cap for every resource (images included),
              // so free exports count toward the limit and get recorded.
              setShowPaymentModal(true);
              setLoading(false);
            }}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2Icon className="animate-spin" size={19} />
              </span>
            ) : (
              `Generate WP Import (${selected.size} Record${selected.size !== 1 ? "s" : ""})`
            )}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* ================= TABLE ================= */}

        <div>
          <div className="relative overflow-hidden rounded-md border border-gray-200">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Header */}

                <div
                  className="grid bg-gray-50 border-b border-gray-200 sticky top-0"
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
                    >
                      {col}
                    </div>
                  ))}
                </div>

                {visible.map((row, i) => {
                  const globalIndex = safePage * PAGE_SIZE + i;
                  const isSelected = selected.has(globalIndex);
                  const isPreview = previewIndex === i;

                  return (
                    <div
                      key={globalIndex}
                      onMouseEnter={() => setPreviewIndex(i)}
                      onClick={() => {
                        toggleRow(globalIndex);
                        setPreviewIndex(i);
                      }}
                      className={`grid cursor-pointer border-b border-gray-100 transition-colors
                  ${
                    isPreview
                      ? "bg-blue-50"
                      : isSelected
                        ? ""
                        : "hover:bg-gray-50"
                  }
                `}
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
                            className="px-3 py-2 truncate text-sm"
                            title={
                              raw.length > CELL_TRUNCATE_LENGTH
                                ? raw
                                : undefined
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
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>

              {(() => {
                const pages: (number | "...")[] = [];
                const delta = 1;

                const start = Math.max(1, safePage - delta);
                const end = Math.min(totalPages - 2, safePage + delta);

                pages.push(0);

                if (start > 1) pages.push("...");

                for (let i = start; i <= end; i++) pages.push(i);

                if (end < totalPages - 2) pages.push("...");

                if (totalPages > 1) pages.push(totalPages - 1);

                return pages.map((p, i) =>
                  p === "..." ? (
                    <span key={i} className="w-6 text-center text-gray-300">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => {
                        setPage(p as number);
                        setPreviewIndex(0);
                      }}
                      className={`w-6 h-6 rounded text-xs font-medium
                  ${
                    p === safePage
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }
                `}
                    >
                      {(p as number) + 1}
                    </button>
                  ),
                );
              })()}

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ================= PREVIEW ================= */}

        <div className="sticky top-5 h-fit">
          <ItemPreview item={previewItem} resource={key} />
        </div>
      </div>

      <PaymentModal
        itemIds={newItemIds}
        open={showPaymentModal}
        shopDomain={activeProject}
        resource={key === "IMAGES" ? "MEDIA_LIBRARY" : key}
        initialCurrency={checkoutMeta?.currency ?? "USD"}
        initialExchangeRate={checkoutMeta?.exchangeRate ?? 83}
        freeDownloadsUsed={checkoutMeta?.freeDownloadsUsed ?? 0}
        // freeDownloadsLimit={checkoutMeta?.freeDownloadsLimit ?? 3}
        eligibleForFree={checkoutMeta?.eligibleForFree ?? false}
        onSuccess={handleExportSuccess}
        onClose={() => {
          setShowPaymentModal(false);
          setLoading(false);
        }}
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
