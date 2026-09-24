import { useState } from "react";
import { IDLE_PIPELINE, recordId, type ExportDirection, type PipelineState, type SnapshotMeta } from "./export-config";

export type UseCreditExportArgs = {
  activeProject: string | null;
  resourceKey: string;
  resourceParam: string;
  direction: ExportDirection;
  snapshot: SnapshotMeta | null;
  records: any[];
  selected: Set<number>;
  includeAll: boolean;
  allRecordIds: string[] | null;
  search: string;
  requiredCredits: number;
};

export function useCreditExport({
  activeProject,
  resourceKey,
  resourceParam,
  direction,
  snapshot,
  records,
  selected,
  includeAll,
  allRecordIds,
  search,
  requiredCredits,
}: UseCreditExportArgs) {
  const [pipeline, setPipeline] = useState<PipelineState>(IDLE_PIPELINE);
  const [busy, setBusy] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const selectedIds =
    includeAll && allRecordIds
      ? allRecordIds
      : records
          .filter((_, i) => selected.has(i))
          .map((record) => recordId(record))
          .filter(Boolean);

  const running =
    pipeline.phase === "processing" || 
    pipeline.phase === "downloading";

  const run = async (paymentTransactionId?: string) => {
    if (!activeProject || !resourceKey) return;
    const exportIds = selectedIds;
    if (exportIds.length === 0) return;

    const snapshotId = snapshot?.id ?? null;
    const exportingEntireSnapshot = includeAll && search.trim().length === 0;

    setBusy(true);
    setPipeline({
      phase: "processing",
      uploaded: 0,
      totalBatches: 1, // Will be updated after job creation
      processed: 0,
      error: null,
    });

    try {
      // Create paid export job
      const createRes = await fetch("/api/export-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: activeProject,
          direction,
          resource: resourceParam,
          resourceLabel: resourceKey,
          snapshotId,
          selection: exportingEntireSnapshot
            ? { mode: "all" }
            : { mode: "ids", ids: exportIds },
          requiredCredits,
          paymentTransactionId,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null);
        const errorMessage =
          err?.message ?? "We couldn’t start your export. Please try again in a moment.";
        
        // Check if it's an insufficient credits error
        if (errorMessage.includes("Insufficient credits")) {
          setShowPurchaseModal(true);
          // Don't throw the error, just show the modal
          return;
        }
        
        throw new Error(errorMessage);
      }

      const created = await createRes.json();
      const jobId = created.id as string;
      
      setPipeline((prev) => ({
        ...prev,
        totalBatches: created.totalBatches || prev.totalBatches,
      }));

      // Process the job
      setPipeline((prev) => ({ ...prev, phase: "processing", processed: 0 }));
      
      for (;;) {
        const res = await fetch(`/api/export-jobs/${jobId}/process`, {
          method: "POST",
        });
        if (!res.ok && res.status !== 202) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.message ?? "We couldn’t prepare your export. Please try again.");
        }

        const state = await res.json().catch(() => null);
        if (!state) {
          throw new Error("We couldn’t prepare your export. Please try again.");
        }

        if (res.status === 202 || state.queued) {
          setPipeline((prev) => ({ ...prev, phase: "processing" }));
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        
        setPipeline((prev) => ({
          ...prev,
          processed: state.processed ?? prev.processed,
          totalBatches: state.total ?? prev.totalBatches,
        }));
        
        if (state.done) {
          break;
        }
      }

      // Download the results
      setPipeline((prev) => ({ ...prev, phase: "downloading" }));
      
      // Download the export file
      const downloadRes = await fetch(`/api/export-jobs/${jobId}/download`);
      if (!downloadRes.ok) {
        throw new Error("Failed to download export file");
      }
      
      const blob = await downloadRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = 
        direction === "shopify_to_wp"
          ? `${resourceKey}-wordpress-import.zip`
          : `${resourceKey}-shopify-import.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setPipeline(IDLE_PIPELINE);
    } catch (error: any) {
      setPipeline((prev) => ({
        ...prev,
        phase: "error",
        error: error?.message ?? "Export pipeline failed",
      }));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setBusy(false);
    setPipeline(IDLE_PIPELINE);
  };

  return {
    pipeline,
    busy,
    running,
    selectedIds,
    run,
    cancel,
    showPurchaseModal,
    setShowPurchaseModal,
    requiredCredits,
  };
}

export type CreditExport = ReturnType<typeof useCreditExport>;