import { getCurrentUser, pool } from "@/lib";
import { Hammer, TriangleAlert } from "lucide-react";

export default async function UnderConstruction({
  params,
}: {
  params: { projects: string };
}) {
  const user = await getCurrentUser();
  const isShopifyProject = params.projects.toLowerCase().includes(".myshopify.com");

  if (isShopifyProject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-primary/60">
        <TriangleAlert size={48} className="mb-4 text-amber-500/60" />
        <h2 className="mb-2 text-xl font-semibold text-primary/80">
          Migration path is not suitable for this project
        </h2>
        <p className="max-w-md text-center text-sm">
          WordPress to Shopify migrations are only shown for WordPress projects.
        </p>
      </div>
    );
  }

  if (user) {
    const result = await pool.query(
      `
        SELECT
          project_name,
          source_platform,
          destination_platform,
          source_address,
          destination_address,
          source_status,
          destination_status,
          source_credentials,
          metadata
        FROM migration_connections
        WHERE user_id = $1 AND project_name = $2
        LIMIT 1
      `,
      [user.id, params.projects],
    );

    const project = result?.[0];

    if (project) {
      return (
        <div className="max-w-3xl space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              {project.project_name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {project.source_platform} {"->"} {project.destination_platform}
            </p>
            {project.source_status !== "CONNECTED" && (
              <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Waiting for the WordPress connector to connect
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Source" value={project.source_address} />
            <InfoCard label="Destination" value={project.destination_address} />
            <InfoCard label="Source status" value={project.source_status} />
            <InfoCard
              label="Destination status"
              value={project.destination_status}
            />
            <InfoCard
              label="Connector site"
              value={project.source_credentials?.siteUrl || "Not connected yet"}
            />
            <InfoCard
              label="Connector plugin"
              value={project.source_credentials?.pluginVersion || "Not connected yet"}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-primary/60">
      <Hammer size={48} className="mb-4 text-primary/40" />
      <h2 className="mb-2 text-xl font-semibold text-primary/80">
        Under Construction
      </h2>
      <p className="max-w-md text-center text-sm">
        This migration path is currently being built. Check back later for updates!
      </p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-gray-900">
        {value || "Not set"}
      </p>
    </div>
  );
}
