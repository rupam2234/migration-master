"use client";

import { useProjectContext } from "@/context";
import { isShopifyProject } from "@/lib/dashboard-routes";
import { Loader2Icon, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Tags = "Check Status" | "Connected" | "Not Connected" | "Checking...";

type Status = {
  color: string;
};

const wpConnection: Record<Tags, Status> = {
  "Check Status": {
    color: "text-primary/60",
  },
  Connected: {
    color: "text-green-400",
  },
  "Not Connected": {
    color: "text-red-400",
  },
  "Checking...": {
    color: "text-primary/60",
  },
};

export default function WpToShopifyDashboard() {
  const { activeProject } = useProjectContext();
  const isSuitableProject = !isShopifyProject(activeProject);
  const [wpConnected, setWpConnection] =
    useState<keyof typeof wpConnection>("Check Status");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (loading || !activeProject) return;
    setWpConnection("Checking...");
    setLoading(true);

    const checkConnection = async () => {
      const res = await fetch("/api/wordpress/wordpress-connector/status", {
        headers: {
          "x-site": activeProject,
          "Content-Type": "Application/json",
        },
      });

      if (!res.ok) {
        const errorData: any = await res.json();
        console.log(errorData.message);
        setLoading(false);
      }

      const data: any = await res.json();

      setWpConnection(
        data.source_status === true ? "Connected" : "Not Connected",
      );

      setLoading(false);
    };

    checkConnection();
  }, [activeProject]);

  async function checkConnection() {
    if (loading || !activeProject) return;

    setLoading(true);
    setWpConnection("Checking...");

    const delayedReq = setTimeout(async () => {
      const res = await fetch("/api/wordpress/wordpress-connector/status", {
        headers: {
          "x-site": activeProject,
          "Content-Type": "Application/json",
        },
      });

      if (!res.ok) {
        const errorData: any = await res.json();
        console.log(errorData.message);
        setLoading(false);
      }

      const data: any = await res.json();

      setWpConnection(
        data.source_status === true ? "Connected" : "Not Connected",
      );

      setLoading(false);
    }, 1000);

    return () => clearTimeout(delayedReq);
  }

  if (!activeProject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-primary/60">
        <TriangleAlert size={48} className="mb-4 text-primary/40" />
        <h2 className="mb-2 text-xl font-semibold text-primary/80">
          No project selected
        </h2>
        <p className="max-w-md text-center text-sm">
          Pick a project from the sidebar to load the migration dashboard.
        </p>
      </div>
    );
  }

  if (!isSuitableProject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-primary/60">
        <TriangleAlert size={48} className="mb-4 text-amber-500/60" />
        <h2 className="mb-2 text-xl font-semibold text-primary/80">
          Migration path is not suitable for this project
        </h2>
        <p className="max-w-md text-center text-sm">
          WordPress to Shopify exports are only available for connected
          WordPress sites.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Export WordPress Contents
          </h2>

          <p className="mt-1 text-sm text-primary/50">
            Fetch data for each resource type and prepare individual Shopify
            import ready files.
          </p>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-primary/60">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {wpConnected === "Connected" && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${wpConnection[wpConnected].color} opacity-60`}
              />
            )}
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${wpConnection[wpConnected].color}`}
            />
          </span>

          <span
            className={`font-medium tracking-tight ${wpConnection[wpConnected].color}`}
          >
            {wpConnected}
          </span>

          <span className="h-3 w-px bg-primary/10" />

          <Loader2Icon
            className={`${loading ? "animate-spin text-primary/60" : "text-primary/30"} hover:text-primary/70 rounded-md p-0.5 cursor-pointer transition-colors duration-200`}
            size={18}
            onClick={checkConnection}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* {RESOURCE_KEYS.map((assetType) => {
          // const {
          //   label,
          //   description,
          //   icon: Icon,
          //   accent,
          // } = RESOURCE_CONFIG[assetType]; */}

        {/* return <></>;
        })} */}
      </div>
    </div>
  );
}
