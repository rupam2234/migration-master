"use client";

import { useMemo, useState } from "react";
import { Lock, Check } from "lucide-react";
import { ResourceKey } from "@/app";
import { useProjectContext } from "@/context";
import { useParams } from "next/navigation";
import { generateWXR } from "@/lib";

const PREVIEW_LIMIT = 7;
const CELL_TRUNCATE_LENGTH = 60;

export default function ExportResources() {
  const params = useParams();
  const { shopifyData } = useProjectContext();

  const key = (params.resources as string).toUpperCase() as ResourceKey;
  const data = shopifyData[key];

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const records = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }, [data]);

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

  const visible = filtered.slice(0, PREVIEW_LIMIT);
  const hiddenCount = Math.max(filtered.length - PREVIEW_LIMIT, 0);
  // Fake rows just to give the blurred section some visual bulk — never real data
  const placeholderRowCount = Math.min(hiddenCount, 4);

  const toggleRow = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === visible.length
        ? new Set()
        : new Set(visible.map((_, i) => i)),
    );
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

  const handleGenerateWordPressImport = () => {
    // const wxr = generateWXR(key.toLowerCase(), data, );
  }

  if (!data) {
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
        <h1 className="text-sm font-semibold capitalize text-primary/80">
          Exported {params.resources as string} From Shopify
          {selected.size > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({selected.size} selected)
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          {/* Generate export buttons */}
          <button className="rounded-sm text-sm px-2 py-1 hover:bg-blue-600/60 bg-blue-600/80 text-white" onClick={handleGenerateWordPressImport}>
            Generate WordPress Import
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelected(new Set());
        }}
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
                  checked={
                    visible.length > 0 && selected.size === visible.length
                  }
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

            {/* Visible (unlocked) rows */}
            {visible.map((row, i) => {
              const isSelected = selected.has(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleRow(i)}
                  className={`grid border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div
                    className="flex items-center justify-center px-2 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onClick={() => toggleRow(i)}
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

            {/* Blurred placeholder rows — visual only, no real data ever rendered here */}
            {hiddenCount > 0 &&
              Array.from({ length: placeholderRowCount }).map((_, i) => (
                <div
                  key={`locked-${i}`}
                  className="grid border-b border-gray-100 select-none"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div className="px-2 py-2" />
                  {columns.map((col) => (
                    <div key={col} className="px-3 py-2">
                      <span className="inline-block w-20 h-3 rounded bg-gray-300 blur-sm">
                        &nbsp;
                      </span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        {hiddenCount > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-6">
            <div className="pointer-events-auto flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  +{hiddenCount} more {hiddenCount === 1 ? "record" : "records"}{" "}
                  locked
                </span>
              </div>
              <p className="text-xs text-gray-400 max-w-xs">
                Unlocks once billing is set up for this project.
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Showing {visible.length} of {filtered.length} records
      </p>
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
