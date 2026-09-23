"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useProjectContext } from "@/context";
import { GlobalLoader } from "@/components";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cachedData } from "@/lib/cache";
import { isShopifyProject } from "@/lib/dashboard-routes";
import { cn } from "@/lib/utils";
import { ArrowRight, FileTextIcon, RefreshCwIcon } from "lucide-react";
import JobDetails, { JobIdChip, StatusPill, type ExportJob } from "./JobDetails";

const COLUMNS: { label: string; className?: string }[] = [
  { label: "Job" },
  { label: "Items" },
  { label: "Status" },
  { label: "Created", className: "hidden sm:table-cell" },
];

/** How long a list payload is served from sessionStorage before re-fetching. */
const JOBS_CACHE_TTL_MS = 60_000;

/** In-flight requests per shop - collapses StrictMode double-mounts/clicks. */
const inflight = new Map<string, Promise<ExportJob[]>>();

async function requestJobs(shop: string): Promise<ExportJob[]> {
  const res = await fetch("/api/export-jobs", { headers: { shop } });
  if (!res.ok) throw new Error(`export-jobs request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function fetchJobs(shop: string): Promise<ExportJob[]> {
  const pending = inflight.get(shop);
  if (pending) return pending;

  const request = requestJobs(shop).finally(() => inflight.delete(shop));
  inflight.set(shop, request);
  return request;
}

export default function ExportJobsPage() {
  const { activeProject } = useProjectContext();
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async (shop: string, fresh = false) => {
    try {
      // Reuses the built TTL cache: navigating back to this page within the
      // window costs zero requests; the Refresh button passes fresh=true to
      // bypass and re-store it.
      const { response } = await cachedData<ExportJob[], [string]>({
        key: `rum-cache:export-jobs:${shop}`,
        fn: fetchJobs,
        args: [shop],
        ttl: JOBS_CACHE_TTL_MS,
        session_Storage: true,
        useCache: !fresh,
      });

      setJobs(response);
      setError(null);
      // Keep the selection across refreshes, drop it if the job disappeared.
      setSelectedJobId((id) =>
        id && response.some((job) => job.id === id) ? id : null,
      );
    } catch (e) {
      console.error(e);
      setError("Couldn't load export jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    setSelectedJobId(null);
    setLoading(true);
    loadJobs(activeProject);
  }, [activeProject, loadJobs]);

  const handleRefresh = () => {
    if (!activeProject || refreshing) return;
    setRefreshing(true);
    loadJobs(activeProject, true);
  };

  const selectJob = (id: string) => {
    setSelectedJobId(id);
    // The grid stacks below lg: bring the detail panel into view on phones/tablets.
    if (window.innerWidth < 1024) {
      document.getElementById("job-detail")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  if (!activeProject || loading) {
    return <GlobalLoader />;
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="mb-1 text-lg font-medium">{error}</p>
        <p className="mb-6 text-sm text-gray-500">
          Something went wrong while talking to the server.
        </p>
        <Button onClick={handleRefresh} loading={refreshing}>
          Try again
        </Button>
      </div>
    );
  }

  if (jobs.length === 0) {
    const homeHref = `/dashboard/${encodeURIComponent(activeProject)}/${
      isShopifyProject(activeProject) ? "shopify-to-wp" : "wp-to-shopify"
    }`;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
          <FileTextIcon className="h-[18px] w-[18px] text-gray-500" />
        </div>
        <p className="mb-1 text-lg font-medium">No export jobs yet</p>
        <p className="mb-6 max-w-md text-sm text-gray-500">
          Start a migration to export your store&apos;s content - finished jobs
          will appear here.
        </p>
        <Button asChild>
          <Link href={homeHref}>
            Start New Migration
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const selectedJob = selectedJobId
    ? (jobs.find((job) => job.id === selectedJobId) ?? null)
    : null;

  return (
    <div className="flex-1 space-y-6">
      <div className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Export Jobs
              </h1>
              <FileTextIcon size={16} className="text-muted-foreground" />
              <span className="inline-flex h-5 items-center rounded-md bg-primary/10 px-1.5 text-xs font-medium text-primary">
                {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Track and manage your migration export jobs. Click on a job to
              view details.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCwIcon size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && jobs.length > 0 && (
        <p className="text-sm text-red-600">
          {error} Showing the last loaded list.
        </p>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.label}
                        className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${col.className ?? ""}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => selectJob(job.id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-muted/60",
                        selectedJobId === job.id &&
                          "bg-primary/5 hover:bg-primary/10",
                      )}
                    >
                      <td className="px-4 py-3">
                        <JobIdChip id={job.id} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-foreground">
                        {job.item_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={job.status} />
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div id="job-detail" className="scroll-mt-20 lg:col-span-1">
          {selectedJob ? (
            <JobDetails job={selectedJob} />
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-sm border border-dashed border-border bg-muted/30 p-6 text-center">
              <FileTextIcon
                size={40}
                className="mb-3 text-muted-foreground/40"
              />
              <p className="text-sm text-muted-foreground">
                Select a job to view details
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Click on any job in the table to see its exported items, coupon
                and payment information
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

