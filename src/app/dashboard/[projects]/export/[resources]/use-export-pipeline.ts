import { useState } from "react";
import JSZip from "jszip";
import { useProjectContext } from "@/context";
import {
  IDLE_PIPELINE,
  PIPELINE_BATCH_SIZE,
  recordId,
  type ExportDirection,
  type PipelineState,
  type SnapshotMeta,
} from "./export-config";

export type UseExportPipelineArgs = {
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
};


export function useExportPipeline({
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
}: UseExportPipelineArgs) {
  const { wpImportSettings } = useProjectContext();
  const [pipeline, setPipeline] = useState<PipelineState>(IDLE_PIPELINE);
  const [busy, setBusy] = useState(false);

  const selectedIds =
    includeAll && allRecordIds
      ? allRecordIds
      : records
          .filter((_, i) => selected.has(i))
          .map((record) => recordId(record))
          .filter(Boolean);

  const running =
    pipeline.phase === "uploading" ||
    pipeline.phase === "processing" ||
    pipeline.phase === "downloading";
  const run = async () => {
    if (!activeProject || !resourceKey) return;
    const exportIds = selectedIds;
    if (exportIds.length === 0) return;

    const snapshotId = snapshot?.id ?? null;
    const exportingEntireSnapshot = includeAll && search.trim().length === 0;
    const selectedRecords = records.filter((_, i) => selected.has(i));
    const batches: any[][] = [];
    if (!snapshotId) {
      for (let i = 0; i < selectedRecords.length; i += PIPELINE_BATCH_SIZE) {
        batches.push(selectedRecords.slice(i, i + PIPELINE_BATCH_SIZE));
      }
    }

    setBusy(true);
    setPipeline({
      phase: snapshotId ? "processing" : "uploading",
      uploaded: 0,
      totalBatches: Math.max(1, Math.ceil(exportIds.length / PIPELINE_BATCH_SIZE)),
      processed: 0,
      error: null,
    });

    try {
      const createRes = await fetch("/api/export-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: activeProject,
          direction,
          resource: resourceParam,
          cfg: direction === "shopify_to_wp" ? wpImportSettings : null,
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

      setPipeline((prev) => ({ ...prev, phase: "downloading" }));
      const zip = new JSZip();
      for (let part = 1; part <= partCount; part++) {
        const res = await fetch(`/api/export-jobs/${jobId}/parts/${part}`);
        if (!res.ok) throw new Error(`Failed to download part ${part}`);
        const filename =
          res.headers
            .get("Content-Disposition")
            ?.match(/filename="(.+)"/)?.[1] ?? `${resourceKey}-part${part}`;
        zip.file(filename, await res.text());
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
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

  return { pipeline, busy, running, selectedIds, run };
}

export type ExportPipeline = ReturnType<typeof useExportPipeline>;
