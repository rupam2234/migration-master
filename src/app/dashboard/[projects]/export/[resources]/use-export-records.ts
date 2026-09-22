import { useEffect, useMemo, useState } from "react";
import { isShopifyProject } from "@/lib/dashboard-routes";
import { requiresScope, scopeStorageKey } from "@/lib/sharedResources";
import { recordId, type ExportDirection, type SnapshotMeta } from "./export-config";
import { loadAllRecordIds, loadWorkingRows, requestSnapshot } from "./export-api";

export type UseExportRecordsArgs = {
  activeProject: string | null;
  resourceKey: string;
  resourceParam: string;
};

/**
 * Owns record state on the export screen: snapshot lifecycle, working-set
 * rows, full-id list, and id selection.
 */
export function useExportRecords({
  activeProject,
  resourceKey,
  resourceParam,
}: UseExportRecordsArgs) {
  const [selectedData, setSelectedData] = useState<any>();
  const [initialLoading, setInitialLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<SnapshotMeta | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [includeAll, setIncludeAll] = useState(false);
  const [allRecordIds, setAllRecordIds] = useState<string[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const exportDirection: ExportDirection = isShopifyProject(activeProject)
    ? "shopify_to_wp"
    : "wp_to_shopify";

  const resourceScope = useMemo(() => {
    if (!activeProject || !requiresScope(resourceKey)) return undefined;
    if (typeof window === "undefined") return undefined;
    return (
      sessionStorage.getItem(scopeStorageKey(activeProject, resourceKey)) ??
      undefined
    );
  }, [activeProject, resourceKey]);

  useEffect(() => {
    if (!activeProject || !resourceKey) return;
    let cancelled = false;

    (async () => {
      const localRows = (() => {
        try {
          const shopifyCached = sessionStorage.getItem(
            `shopif_asset_cache:${activeProject}-${resourceKey}`,
          );
          if (shopifyCached) return JSON.parse(shopifyCached).data;
          const wpCached = sessionStorage.getItem(
            `wp-cache:${activeProject}:${resourceParam}`,
          );
          if (wpCached) return JSON.parse(wpCached).data;
        } catch {
          return null;
        }
        return null;
      })();

      if (localRows) {
        setSelectedData(localRows);
        setInitialLoading(false);
      }

      try {
        const { res, data } = await requestSnapshot({
          project: activeProject,
          direction: exportDirection,
          resource: resourceParam,
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

        const rows = Array.isArray(data.preview) ? data.preview : [];

        if (!localRows) {
          setSelectedData(rows);
          if (data.totalPages > 1) {
            const rest = await loadWorkingRows(data.snapshotId, data.totalPages);
            if (cancelled) return;
            setSelectedData([...rows, ...rest]);
          }
        } else if (Array.isArray(localRows)) {
          const rest =
            data.totalPages > 1
              ? await loadWorkingRows(data.snapshotId, data.totalPages)
              : [];
          if (cancelled) return;
          const seen = new Set(localRows.map((r: any) => recordId(r)));
          setSelectedData([
            ...localRows,
            ...[...rows, ...rest].filter((r: any) => !seen.has(recordId(r))),
          ]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, resourceKey, resourceParam, resourceScope]);

  const records = useMemo(() => {
    if (!selectedData) return [];
    return Array.isArray(selectedData) ? selectedData : [selectedData];
  }, [selectedData]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    records.forEach((r) => Object.keys(r as object).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [records]);

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [records, search]);

  const handleSearch = (value: string) => setSearch(value);

  useEffect(() => {
    setSelected(new Set(records.map((_, i) => i)));
  }, [records]);

  useEffect(() => {
    if (!includeAll || allRecordIds || !snapshot) return;
    let cancelled = false;
    (async () => {
      try {
        const ids = await loadAllRecordIds(snapshot.id);
        if (!cancelled) setAllRecordIds(ids);
      } catch (error: any) {
        if (!cancelled)
          setSnapshotError(error?.message ?? "Failed to load record ids");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includeAll, allRecordIds, snapshot]);

  const hasUnshownRecords = Boolean(snapshot && snapshot.total > records.length);

  const selectedIds = useMemo(() => {
    if (includeAll && allRecordIds) return allRecordIds;
    return records
      .filter((_, i) => selected.has(i))
      .map((record) => recordId(record))
      .filter(Boolean);
  }, [includeAll, allRecordIds, records, selected]);

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

  return {
    exportDirection,
    records,
    columns,
    filtered,
    search,
    handleSearch,
    selected,
    setSelected,
    snapshot,
    snapshotError,
    initialLoading,
    refreshing,
    hasUnshownRecords,
    includeAll,
    setIncludeAll,
    allRecordIds,
    idsLoading: includeAll && !allRecordIds,
    selectedIds,
    selectedCount: selectedIds.length,
    refreshSnapshot,
  };
}