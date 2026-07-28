"use client";

import { useProjectContext } from "@/context";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ConnectionDetails {
  shopDomain: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
}

export default function ProjectSettings() {
  const { activeProject, setActiveProject, allProjects, setAllProjects } =
    useProjectContext();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [details, setDetails] = useState<ConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchConnectionStatus = useCallback(async () => {
    if (!activeProject) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/shopify/connection-status?shop=${encodeURIComponent(activeProject)}`,
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to fetch connection status");
      }

      const data: ConnectionDetails = await res.json();
      setDetails(data);
    } catch (err: any) {
      setError(err?.message || "An error occurred fetching connection status");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  const handleResync = () => {
    if (!activeProject) return;
    setResyncing(true);
    // Redirect to Shopify connection authorization flow
    window.location.href = `/api/shopify/connect?shop=${encodeURIComponent(
      activeProject,
    )}`;
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetch("/api/shopify/delete-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shopDomain: activeProject }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to delete project");
      }

      // Clean context state
      const updatedProjects = allProjects.filter((p) => p !== activeProject);
      setAllProjects(updatedProjects);
      setActiveProject(updatedProjects.length > 0 ? updatedProjects[0] : null);

      setShowDeleteModal(false);
      router.push("/dashboard");
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  const status = details?.status || "CONNECTED";
  const isConnected = status === "CONNECTED";
  const isPending = status === "PENDING";

  return (
    <div className="max-w-3xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-sm font-semibold tracking-tight text-gray-900">
          Project Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View connection status, resync credentials, or manage this store
          project.
        </p>
      </div>

      {/* Shopify Connection Card */}
      <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="md:flex hidden h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Shopify Connection Status
              </h2>
              <p className="text-xs text-gray-500">
                Store Domain:{" "}
                <span className="font-mono text-gray-700">
                  {activeProject || "None"}
                </span>
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {loading ? (
            <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking...
            </div>
          ) : isConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Connected
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Pending Authorization
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 border border-red-200">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              Disconnected
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Details List */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
          <div className="rounded-lg bg-gray-50 p-3.5 border border-gray-100">
            <span className="text-gray-400 block font-medium">Shop Domain</span>
            <span className="mt-1 block font-mono font-semibold text-gray-800 truncate">
              {activeProject}
            </span>
          </div>

          <div className="rounded-lg bg-gray-50 p-3.5 border border-gray-100">
            <span className="text-gray-400 block font-medium">API Status</span>
            <span className="mt-1 flex items-center gap-1 font-medium text-gray-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Active GraphQL & REST Access
            </span>
          </div>

          {details?.createdAt && (
            <div className="rounded-lg bg-gray-50 p-3.5 border border-gray-100">
              <span className="text-gray-400 block font-medium">
                Connected Since
              </span>
              <span className="mt-1 block text-gray-700">
                {new Date(details.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}

          {details?.updatedAt && (
            <div className="rounded-lg bg-gray-50 p-3.5 border border-gray-100">
              <span className="text-gray-400 block font-medium">
                Last Status Check
              </span>
              <span className="mt-1 block text-gray-700">
                {new Date(details.updatedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={handleResync}
            disabled={resyncing || !activeProject}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {resyncing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Redirecting to Shopify...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Resync Connection
              </>
            )}
          </button>

          <button
            type="button"
            onClick={fetchConnectionStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Status
          </button>

          <a
            href={`https://${activeProject}/admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 hover:underline"
          >
            Open Shopify Admin
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Danger Zone: Delete Project Card */}
      <div className="rounded-sm border border-red-200 bg-red-50/30 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Danger Zone: Delete Project
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Deleting this project removes the Shopify connection, stored
                credentials, and recorded export history for{" "}
                <strong className="font-mono text-gray-900">
                  {activeProject}
                </strong>
                . This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-red-100 pt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setConfirmInput("");
              setDeleteError(null);
              setShowDeleteModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Confirm Project Deletion
                </h3>
                <p className="text-xs text-gray-500">
                  Store: <span className="font-mono">{activeProject}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete this project? To confirm, type{" "}
              <span className="font-semibold text-gray-900 underline">
                delete
              </span>{" "}
              below.
            </p>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder='Type "delete" to confirm'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-red-500 focus:outline-none"
            />

            {deleteError && (
              <p className="text-xs text-red-600 font-medium">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={
                  confirmInput.trim().toLowerCase() !== "delete" || deleting
                }
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
