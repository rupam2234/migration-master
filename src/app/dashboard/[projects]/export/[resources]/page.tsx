"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  InfoIcon,
  Loader2Icon,
  PackageOpen,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useProjectContext } from "@/context";
import { useParams } from "next/navigation";
import JSZip from "jszip";
import { PaymentModal } from "@/components/theme/paymentModal";
import { GlobalLoader, ItemPreview, ToolTip } from "@/components";
import {
  RESOURCE_CONFIG,
  ResourceKey,
  requiresScope,
  scopeStorageKey,
} from "@/lib/sharedResources";
import { isShopifyProject } from "@/lib/dashboard-routes";

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

/** Selection identity for a record, matching the dashboard's `id` column. */
function recordId(item: any): string {
  return String(item?.id ?? item?.ID ?? "");
}

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

  /** Server-side pipeline progress, replacing in-browser artifact generation. */
  const [pipeline, setPipeline] = useState<{
    phase: "idle" | "uploading" | "processing" | "downloading" | "error";
    uploaded: number;
    totalBatches: number;
    processed: number;
    error: string | null;
  }>({
    phase: "idle",
    uploaded: 0,
    totalBatches: 0,
    processed: 0,
    error: null,
  });

  /** Records per upload/processing batch — must match the server. */
  const PIPELINE_BATCH_SIZE = 150;

  /** Records per snapshot page — must match `SNAPSHOT_PAGE_SIZE` server-side. */
  const SNAPSHOT_PAGE_SIZE = 100;

  /** Resource path segment, lower-cased for the API. */
  const resourceParam = (params.resources as string).toLowerCase();

  const exportDirection = isShopifyProject(activeProject)
    ? "shopify_to_wp"
    : "wp_to_shopify";

  /**
   * Creates (or reuses) the server-side snapshot for this resource.
   *
   * Lives outside the component so both call sites share one implementation
   * and the load effect keeps a stable dependency list.
   *
   * A concurrent fetch (React StrictMode's double mount, a double-click, or a
   * second tab) is answered with 409 + a retry hint; honour that hint once
   * instead of showing the user a transient error.
   */
  async function requestSnapshot(body: {
    project: string;
    direction: string;
    resource: string;
    refresh?: boolean;
    blogId?: string;
    /** Set false to skip preview rows (metadata-only call). */
    preview?: boolean;
  }) {
    const post = () =>
      fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    let res = await post();

    if (res.status === 409) {
      const hinted = await res.clone().json().catch(() => null);
      await new Promise((resolve) =>
        setTimeout(resolve, (hinted?.retryAfter ?? 2) * 1000),
      );
      res = await post();
    }

    return { res, data: await res.json().catch(() => null) };
  }

  /**
   * Rows the browser keeps for browsing/selecting. The server holds the full
   * store; the table only needs a working set, so this cap is what keeps a
   * 50k-record resource from becoming 50k React rows.
   */
  const LOCAL_ROW_LIMIT = 1000;

  /** Bounded fan-out — enough to feel instant, small enough to stay polite. */
  const PAGE_FETCH_CONCURRENCY = 5;

  /**
   * Pulls the working set (page 2 onward, up to {@link LOCAL_ROW_LIMIT}) in
   * bounded parallel chunks. Page 1 already arrived as the snapshot preview.
   */
  async function loadWorkingRows(
    snapshotId: string,
    totalPages: number,
  ): Promise<any[]> {
    const lastPage = Math.min(
      totalPages,
      Math.max(1, Math.floor(LOCAL_ROW_LIMIT / SNAPSHOT_PAGE_SIZE)),
    );

    const pages = Array.from({ length: Math.max(0, lastPage - 1) }, (_, i) => i + 2);
    const collected: any[] = [];

    for (let i = 0; i < pages.length; i += PAGE_FETCH_CONCURRENCY) {
      const chunk = pages.slice(i, i + PAGE_FETCH_CONCURRENCY);

      const results = await Promise.all(
        chunk.map(async (page) => {
          try {
            const res = await fetch(`/api/snapshots/${snapshotId}?page=${page}`);

            if (!res.ok) return [];

            const data = await res.json().catch(() => null);

            return Array.isArray(data?.items) ? data.items : [];
          } catch {
            // A failed page degrades the local view only; the snapshot (and
            // therefore the export) is unaffected.
            return [];
          }
        }),
      );

      results.forEach((items) => collected.push(...items));
    }

    return collected;
  }

  /**
   * Server-side snapshot backing this screen (Phase 2 data layer).
   *
   * A snapshot is the system of record: it survives a new tab, is not capped
   * at sessionStorage's ~5MB, and lets the export pipeline copy records
   * server-side instead of the browser re-uploading them.
   */
  const [snapshot, setSnapshot] = useState<{
    id: string;
    total: number;
    totalPages: number;
    expiresAt: string;
    cached: boolean;
  } | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  /** Export every record in the snapshot, not just the rows held locally. */
  const [includeAll, setIncludeAll] = useState(false);
  const [allRecordIds, setAllRecordIds] = useState<string[] | null>(null);

  /** True while the user forces a re-fetch of the snapshot from the source. */
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Blog-scoped resources (Shopify articles) can only be fetched once the
   * migration screen has recorded which blog they belong to. Reading the same
   * key keeps the export targeted at the exact record set the user fetched.
   */
  const resourceScope = useMemo(() => {
    if (!activeProject || !requiresScope(key)) return undefined;

    if (typeof window === "undefined") return undefined;

    return (
      sessionStorage.getItem(scopeStorageKey(activeProject, key)) ?? undefined
    );
  }, [activeProject, key]);

  const ResourceIcon = RESOURCE_CONFIG[key]?.icon;

  useEffect(() => {
    if (!activeProject || !key) return;

    let cancelled = false;

    /** Rows cached by the fetch screen — gives an instant first paint. */
    const localRows = (() => {
      const shopifyCached = sessionStorage.getItem(
        `shopif_asset_cache:${activeProject}-${key}`,
      );
      if (shopifyCached) return JSON.parse(shopifyCached).data;

      // WordPress→Shopify flow caches under a different key/shape.
      const wpCached = sessionStorage.getItem(
        `wp-cache:${activeProject}:${resourceParam}`,
      );
      if (wpCached) return JSON.parse(wpCached).data;

      return null;
    })();

    if (localRows) {
      setSelectedData(localRows);
      setInitialLoading(false);
    }

    /**
     * Ensure a snapshot exists. Costs a single request: the server returns
     * the existing snapshot for its whole 24h TTL instead of refetching, and
     * collapses concurrent callers (extra tabs, double mounts) into one
     * upstream fan-out via a Redis lock.
     *
     * Its preview also unblocks this screen in a fresh tab, where
     * sessionStorage is empty — and it is only requested when there is
     * nothing local to render, so a normal visit stays metadata-only.
     */
    (async () => {
      try {
        const { res, data } = await requestSnapshot({
          project: activeProject,
          direction: exportDirection,
          resource: resourceParam,
          preview: !localRows,
          blogId: resourceScope,
        });

        if (cancelled) return;

        if (!res.ok) {
          setSnapshotError(data?.message ?? "Failed to prepare records");
          if (!localRows) setInitialLoading(false);
          return;
        }

        setSnapshot({
          id: data.snapshotId,
          total: data.total ?? 0,
          totalPages: data.totalPages ?? 0,
          expiresAt: data.expiresAt,
          cached: Boolean(data.cached),
        });
        setSnapshotError(null);

        if (!localRows) {
          // The preview covers the first page; the rest of the working set is
          // pulled in bounded parallel chunks so the browser holds enough rows
          // to browse and select without ever buffering the whole store.
          const rows = Array.isArray(data.preview) ? data.preview : [];

          if (data.totalPages > 1) {
            setSelectedData(rows);
            const rest = await loadWorkingRows(
              data.snapshotId,
              data.totalPages,
            );
            if (cancelled) return;
            setSelectedData([...rows, ...rest]);
          } else {
            setSelectedData(rows);
          }
        }

        setInitialLoading(false);
      } catch (error: any) {
        if (cancelled) return;
        setSnapshotError(error?.message ?? "Failed to prepare records");
        if (!localRows) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProject, key, exportDirection, resourceParam, resourceScope]);

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

  /**
   * "Include all" needs every id in the snapshot to price and export it.
   * Fetched once and only on demand — ids only, so the payload stays small
   * even for a large store.
   */
  useEffect(() => {
    if (!includeAll || allRecordIds || !snapshot) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/snapshots/${snapshot.id}?ids=1`);
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok) {
          setSnapshotError(data?.message ?? "Failed to load record ids");
          return;
        }

        setAllRecordIds(Array.isArray(data.ids) ? data.ids : []);
      } catch (error: any) {
        if (cancelled) return;
        setSnapshotError(error?.message ?? "Failed to load record ids");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [includeAll, allRecordIds, snapshot]);

  /** Snapshots routinely hold more records than the browser keeps. */
  const hasUnshownRecords = Boolean(snapshot && snapshot.total > records.length);

  /**
   * Forces the snapshot to be rebuilt from the source API.
   *
   * Snapshots are reused for their whole TTL (that is what keeps request
   * volume low), so this is the explicit escape hatch when a merchant has
   * changed data upstream and needs the export to see it now.
   */
  const refreshSnapshot = async () => {
    if (!activeProject || refreshing) return;

    setRefreshing(true);

    try {
      const { res, data } = await requestSnapshot({
        project: activeProject,
        direction: exportDirection,
        resource: resourceParam,
        refresh: true,
        blogId: resourceScope,
      });

      if (!res.ok) {
        setSnapshotError(data?.message ?? "Failed to refresh records");
        return;
      }

      setSnapshot({
        id: data.snapshotId,
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 0,
        expiresAt: data.expiresAt,
        cached: Boolean(data.cached),
      });
      setSnapshotError(null);

      // The record set changed, so any cached id list is now invalid.
      setAllRecordIds(null);
      setIncludeAll(false);

      const rows = Array.isArray(data.preview) ? data.preview : [];
      const rest =
        data.totalPages > 1
          ? await loadWorkingRows(data.snapshotId, data.totalPages)
          : [];

      setSelectedData([...rows, ...rest]);
    } catch (error: any) {
      setSnapshotError(error?.message ?? "Failed to refresh records");
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Exactly what will be exported: every id in the snapshot, or the ids of
   * the rows ticked in the table.
   */
  const selectedIds = useMemo(() => {
    if (includeAll && allRecordIds) return allRecordIds;

    return records
      .filter((_, i) => selected.has(i))
      .map((record) => recordId(record))
      .filter(Boolean);
  }, [includeAll, allRecordIds, records, selected]);

  const selectedCount = selectedIds.length;
  const idsLoading = includeAll && !allRecordIds;

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const truncate = (text: string) =>
    text.length > CELL_TRUNCATE_LENGTH
      ? `${text.slice(0, CELL_TRUNCATE_LENGTH)}…`
      : text;

  /**
   * Server-side export pipeline runner (Phase 1).
   *
   * 1. Create a job (server validates + persists state).
   * 2. Upload the selected records in bounded batches — the records are
   *    reused from sessionStorage, so ZERO extra source-API requests.
   * 3. Drive /process until every batch is transformed into a stored part.
   * 4. Download the parts and zip them for the user.
   */
  const runExportPipeline = async () => {
    if (!activeProject || !key) return;

    const exportIds = selectedIds;

    if (exportIds.length === 0) return;

    // With a snapshot the server copies the records itself; without one we
    // fall back to uploading from the browser (legacy path).
    const snapshotId = snapshot?.id ?? null;

    /**
     * Exporting the entire snapshot needs no id list at all — the server
     * selects every record itself, so a 50k-record export still sends a
     * near-empty request body. Only an active search filter (a subset the
     * user chose deliberately) falls back to explicit ids.
     */
    const exportingEntireSnapshot = includeAll && search.trim().length === 0;

    const selectedRecords = records.filter((_, i) => selected.has(i));

    const batches: any[][] = [];

    if (!snapshotId) {
      for (let i = 0; i < selectedRecords.length; i += PIPELINE_BATCH_SIZE) {
        batches.push(selectedRecords.slice(i, i + PIPELINE_BATCH_SIZE));
      }
    }

    setPipeline({
      phase: snapshotId ? "processing" : "uploading",
      uploaded: 0,
      totalBatches: Math.max(
        1,
        Math.ceil(exportIds.length / PIPELINE_BATCH_SIZE),
      ),
      processed: 0,
      error: null,
    });

    try {
      // 1. Create the job. With a snapshot the authoritative counts are
      //    derived server-side, so client totals are not trusted.
      const createRes = await fetch("/api/export-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: activeProject,
          direction: exportDirection,
          resource: resourceParam,
          cfg: exportDirection === "shopify_to_wp" ? wpImportSettings : null,
          ...(snapshotId
            ? {
                snapshotId,
                selection: exportingEntireSnapshot
                  ? { mode: "all" }
                  : { mode: "ids", ids: exportIds },
              }
            : {
                totalItems: selectedRecords.length,
                totalBatches: batches.length,
              }),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null);
        throw new Error(err?.message ?? "Failed to create export job");
      }

      const created = await createRes.json();
      const jobId = created.id as string;

      setPipeline((prev) => ({
        ...prev,
        totalBatches: created.totalBatches || prev.totalBatches,
      }));

      // 2. Only needed on the legacy browser-upload path. With a snapshot
      //    the server seeds the batches itself from server-side records.
      if (!snapshotId) {
        for (let i = 0; i < batches.length; i++) {
          const res = await fetch(`/api/export-jobs/${jobId}/batches`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seq: i + 1, items: batches[i] }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message ?? "Failed to upload export data");
          }

          setPipeline((prev) => ({ ...prev, uploaded: i + 1 }));
        }
      }

      // 3. Process batches until done.
      setPipeline((prev) => ({ ...prev, phase: "processing", processed: 0 }));

      let partCount = 0;

      for (;;) {
        const res = await fetch(`/api/export-jobs/${jobId}/process`, {
          method: "POST",
        });

        const state = await res.json().catch(() => null);

        if (!res.ok || !state) {
          throw new Error(state?.message ?? "Failed to prepare import files");
        }

        setPipeline((prev) => ({
          ...prev,
          processed: state.processed ?? prev.processed,
          totalBatches: state.total ?? prev.totalBatches,
        }));

        if (state.done) {
          partCount = state.partCount ?? 0;
          break;
        }
      }

      // 4. Download all parts and zip them (on demand, sequential).
      setPipeline((prev) => ({ ...prev, phase: "downloading" }));

      const zip = new JSZip();

      for (let part = 1; part <= partCount; part++) {
        const res = await fetch(`/api/export-jobs/${jobId}/parts/${part}`);

        if (!res.ok) {
          throw new Error(`Failed to download part ${part}`);
        }

        const filename =
          res.headers
            .get("Content-Disposition")
            ?.match(/filename="(.+)"/)?.[1] ?? `${key}-part${part}`;

        zip.file(filename, await res.text());
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        exportDirection === "shopify_to_wp"
          ? `${key}-wordpress-import.zip`
          : `${key}-shopify-import.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setPipeline({
        phase: "idle",
        uploaded: 0,
        totalBatches: 0,
        processed: 0,
        error: null,
      });
    } catch (error: any) {
      console.error(error?.message ?? "Export pipeline failed");
      setPipeline((prev) => ({
        ...prev,
        phase: "error",
        error: error?.message ?? "Export pipeline failed",
      }));
    } finally {
      setLoading(false);
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

    setShowPaymentModal(false);

    // Brief pause to let the verified payment propagate server-side before
    // the import generation reads it. Awaited (with a promise) instead of a
    // fire-and-forget setTimeout so errors surface and ordering is guaranteed.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await runExportPipeline();
  };

  if (initialLoading && !selectedData) {
    return <GlobalLoader />;
  }

  if (!activeProject)
    return (
      <EmptyState
        icon={FolderOpen}
        title="No project selected"
        description="Pick a project from the top bar to view its exportable records."
      />
    );

  if (!selectedData && !initialLoading) {
    return (
      <EmptyState
        icon={PackageOpen}
        title={`No ${params.resources as string} loaded`}
        description="Fetch this resource from the dashboard first, then come back here to prepare its import file."
      />
    );
  }

  const gridTemplate = `40px repeat(${columns.length}, minmax(120px, 1fr))`;

  const previewItem = visible[previewIndex] ?? visible[0] ?? null;

  /** 1-based position of the previewed record across the whole result set. */
  const previewRowNumber = previewItem
    ? safePage * PAGE_SIZE + (visible[previewIndex] ? previewIndex : 0) + 1
    : null;

  /** Payment gate: decides free vs paid before starting the pipeline. */
  const startExport = async () => {
    if (!activeProject) return;

    setLoading(true);

    const itemIds = selectedIds;

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
      await runExportPipeline();
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

    setShowPaymentModal(true);
    setLoading(false);
  };

  /** True only while work is in flight, so an error re-enables the CTA. */
  const pipelineRunning =
    pipeline.phase === "uploading" ||
    pipeline.phase === "processing" ||
    pipeline.phase === "downloading";

  const pipelineBusy = loading || pipelineRunning;

  /** Ids are still being fetched — the CTA must not fire a partial export. */
  const ctaDisabled = pipelineBusy || idsLoading || selectedCount === 0;
  const ctaLabel =
    exportDirection === "shopify_to_wp"
      ? `Generate WP Import (${selectedCount} Record${selectedCount !== 1 ? "s" : ""})`
      : `Generate Shopify CSV (${selectedCount} Record${selectedCount !== 1 ? "s" : ""})`;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* ================= HEADER ================= */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5">
            {ResourceIcon ? (
              <ResourceIcon size={20} className="text-primary/70" />
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-primary/90">
                Export {params.resources as string}
              </h1>

              <ToolTip
                content={
                  <div className="space-y-2 text-xs max-w-xs">
                    <p className="font-semibold text-orange-400">
                      Selection &amp; pricing
                    </p>
                    <p className="pt-2">
                      Items you&apos;ve already paid for (or received free) are
                      never charged again, even if your current selection also
                      includes new items.
                    </p>
                  </div>
                }
                trigger={
                  <InfoIcon size={15} className="shrink-0 text-primary/35" />
                }
                side="bottom"
              />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-primary/50">
              <span className="rounded-md border border-primary/10 bg-primary/5 px-1.5 py-0.5 font-medium text-primary/60">
                {exportDirection === "shopify_to_wp" ? "Shopify" : "WordPress"}
              </span>
              <ArrowRight size={13} className="text-primary/30" />
              <span className="rounded-md border border-primary/10 bg-primary/5 px-1.5 py-0.5 font-medium text-primary/60">
                {exportDirection === "shopify_to_wp" ? "WordPress" : "Shopify"}
              </span>

              <span className="mx-1 hidden h-3 w-px bg-primary/15 sm:block" />

              <span>
                {(snapshot?.total ?? records.length).toLocaleString()} record
                {(snapshot?.total ?? records.length) !== 1 ? "s" : ""}
              </span>

              {selectedCount > 0 && (
                <span className="font-medium text-blue-600">
                  · {selectedCount.toLocaleString()} selected
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ================= RECORDS ================= */}
        <section className="min-w-0 overflow-hidden rounded-sm border border-primary/10 bg-background shadow-sm">
          {/* ============ TOOLBAR ============ */}
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
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-primary/15 bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-primary/30 focus:border-primary/40"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={refreshSnapshot}
                disabled={refreshing || pipelineBusy}
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
                onClick={() => {
                  setSelected(new Set(filtered.map((_, i) => i)));
                  // Selecting everything shown means everything stored.
                  if (hasUnshownRecords) setIncludeAll(true);
                }}
                className="rounded-md font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
              >
                Select all {filtered.length.toLocaleString()}
              </button>

              <span className="h-3.5 w-px bg-primary/15" />

              <button
                type="button"
                onClick={() => {
                  setSelected(new Set());
                  setIncludeAll(false);
                }}
                disabled={selected.size === 0 && !includeAll}
                className="rounded-md font-medium text-primary/50 transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear selection
              </button>
            </div>
          </div>

          {/* Partial snapshot notice: the snapshot holds more than the browser. */}
          {hasUnshownRecords && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-blue-50/50 px-5 py-3">
              <p className="text-xs text-primary/70">
                Showing the first{" "}
                <span className="font-medium text-primary/90">
                  {records.length.toLocaleString()}
                </span>{" "}
                of{" "}
                <span className="font-medium text-primary/90">
                  {snapshot!.total.toLocaleString()}
                </span>{" "}
                stored records.
              </p>

              <button
                type="button"
                onClick={() => setIncludeAll((prev) => !prev)}
                disabled={idsLoading}
                className="rounded-lg border border-primary/15 bg-background px-2.5 py-1.5 text-xs font-medium text-primary/80 transition-colors hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {idsLoading
                  ? "Loading records…"
                  : includeAll
                    ? "Export selected rows only"
                    : `Include all ${snapshot!.total.toLocaleString()} records`}
              </button>
            </div>
          )}

          {/* ================= TABLE ================= */}
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Header */}

                <div
                  className="grid border-b border-primary/10 bg-primary/[0.03] text-[11px] font-semibold uppercase tracking-wide text-primary/50"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div className="flex items-center justify-center px-2 py-2.5">
                    <Checkbox
                      checked={visible.length > 0 && allVisibleSelected}
                      onClick={toggleAll}
                    />
                  </div>

                  {columns.map((col) => (
                    <div key={col} className="truncate px-3 py-2.5 text-left">
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
                            className="truncate px-3 py-2 text-[13px] text-primary/80"
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

          {/* ================= FOOTER ================= */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-primary/10 px-5 py-3 text-xs">
            <span className="mr-auto text-primary/40">
              Page {(safePage + 1).toLocaleString()} of{" "}
              {totalPages.toLocaleString()} ·{" "}
              {filtered.length.toLocaleString()} record
              {filtered.length !== 1 ? "s" : ""}
            </span>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={(next) => {
                setPage(next);
                setPreviewIndex(0);
              }}
            />
          </div>
        </section>

        {/* ================= EXPORT SUMMARY SIDEBAR ================= */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-5">
          <div className="flex flex-col rounded-sm border border-primary/10 bg-background shadow-sm">
            <div className="border-b border-primary/10 px-5 py-4">
              <h3 className="text-sm font-semibold text-primary/90">
                Export summary
              </h3>
              <p className="mt-0.5 text-xs text-primary/45">
                Review before generating your import files
              </p>
            </div>

            <div className="flex flex-col gap-4 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary/55">Records selected</span>
                <span className="font-semibold text-primary/90">
                  {selectedCount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-primary/55">Output format</span>
                <span className="font-medium text-primary/80">
                  {exportDirection === "shopify_to_wp"
                    ? "WordPress WXR (.xml)"
                    : "Shopify import (.csv)"}
                </span>
              </div>
            </div>

            <div className="border-t border-primary/10 px-5 py-4">
              <button
                onClick={startExport}
                disabled={ctaDisabled}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pipelineBusy ? (
                  <>
                    <Loader2Icon size={16} className="animate-spin" />
                    {pipeline.phase === "uploading" &&
                      `Collecting ${pipeline.uploaded}/${pipeline.totalBatches}`}
                    {pipeline.phase === "processing" &&
                      `Preparing ${pipeline.processed}/${pipeline.totalBatches}`}
                    {pipeline.phase === "downloading" && "Packaging…"}
                    {loading &&
                      pipeline.phase === "idle" &&
                      "Checking eligibility…"}
                  </>
                ) : (
                  ctaLabel
                )}
              </button>

              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-primary/40">
                <ShieldCheck
                  size={13}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />
                Files are prepared on our servers and stay private to your
                account. Re-exports of paid items are always free.
              </p>

              {snapshotError && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {snapshotError}
                </div>
              )}

              {pipeline.phase === "error" && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {pipeline.error} — select the records and try again.
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-sm border border-primary/10 bg-background shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-5 py-4">
              <h3 className="text-sm font-semibold text-primary/90">
                Record preview
              </h3>

              {previewRowNumber !== null && (
                <span className="text-[11px] tabular-nums text-primary/40">
                  Row {previewRowNumber.toLocaleString()}
                </span>
              )}
            </div>

            <ItemPreview item={previewItem} resource={key} />
          </div>
        </aside>
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
      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
        checked
          ? "border-blue-600 bg-blue-600"
          : "border-primary/25 bg-background hover:border-primary/50"
      }`}
    >
      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </button>
  );
}

/** Centered placeholder card used for every "nothing to show yet" state. */
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-sm border border-primary/10 bg-background p-10 text-center shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/10 bg-primary/5">
        <Icon size={20} className="text-primary/40" />
      </div>

      <p className="text-sm font-semibold text-primary/80">{title}</p>

      <p className="mt-1 max-w-sm text-xs leading-relaxed text-primary/45">
        {description}
      </p>
    </div>
  );
}

/** Windowed page list with prev/next controls. Hidden for single-page results. */
function Pagination({
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

