"use client";

import { useEffect, useState } from "react";
import { useProjectContext } from "@/context";

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
  const { activeProject } = useProjectContext();

  useEffect(() => {
    async function fetchJobs() {
      if (!activeProject) return;
      try {
        const res = await fetch("/api/export-jobs", {
          headers: {
            shop: activeProject,
          },
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
    <div>
      <h2 className="mb-4 text-sm font-semibold text-primary/80">
        Export Jobs
      </h2>
      <div className="overflow-x-auto rounded-lg border border-primary/10">
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
              <tr key={job.id} className="hover:bg-gray-50">
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
    </div>
  );
}
