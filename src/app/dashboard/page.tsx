"use client";

import { GlobalLoader } from "@/components";
import { useProjectContext } from "@/context";
import { ArrowRight, MousePointerClick, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { allProjects } = useProjectContext();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <GlobalLoader />;
  }

  if (!loading && (!allProjects || allProjects.length === 0)) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
          <MousePointerClick className="h-[18px] w-[18px] text-gray-500" />
        </div>
        <div>
          <p className="text-lg font-medium">Select a project</p>
          <p className="text-sm text-gray-500">
            Choose a store from the sidebar to view its dashboard
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[420px] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <ShoppingBag className="h-[18px] w-[18px] text-gray-500" />
      </div>
      <p className="mb-1 text-lg font-medium">No projects yet</p>
      <p className="mb-6 text-sm text-gray-500">
        Connect a Shopify store to start migrating its content to WordPress
      </p>

      <a
        href="/dashboard/new-project"
        className="flex w-full items-center justify-center
      gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white
      transition hover:bg-gray-800"
      >
        <span>Add a project</span>
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
