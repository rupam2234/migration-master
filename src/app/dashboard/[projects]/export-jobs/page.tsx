"use client";

import { useEffect, useState } from "react";
import { useProjectContext } from "@/context";
import JobDetails from "./JobDetails";

interface ExportJob {
  id: string;
  shop_domain: string;
  item_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ExportJobsPage() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { activeProject } = useProjectContext();

  // Fetch jobs list
  useEffect(() => {
    async function fetchJobs() {
      if (!activeProject) return;
      try {
        const res = await fetch("/api/export-jobs", {
          headers: { shop: activeProject },
        });
        const data = await res.json();
        setJobs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [activeProject]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600">Loading export jobs…</div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">No export jobs found.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Jobs table */}
      <div className="lg:col-span-2 overflow-x-auto rounded-lg border border-primary/10">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Items
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr
                key={job.id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedJobId === job.id ? "bg-gray-100" : ""}`}
                onClick={() => setSelectedJobId(job.id)}
              >
                <td className="px-4 py-2 text-sm text-gray-800">
                  {job.id.split("-")[0]}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {job.item_count}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800">
                  {job.status}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {new Date(job.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-1">
        {selectedJobId ? (
          <JobDetails jobId={selectedJobId} shopDomain={activeProject!} />
        ) : (
          <div className="text-center text-gray-400">
            Select a job to view details
          </div>
        )}
      </div>
    </div>
  );
}
