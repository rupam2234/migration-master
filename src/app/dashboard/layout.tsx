import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib";
import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";

const REVALIDATE_IN = 5 * 60; // 5 min

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Migration Master",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { id, name, email } = user;
  const userData = {
    name,
    id,
    email,
  };

  const getProjects = unstable_cache(
    async (user_id: string) => {
      const result = await pool.query(
        `
          SELECT shop_domain AS project_name
          FROM shopify_connections
          WHERE user_id = $1
          UNION
          SELECT project_name
          FROM migration_connections
          WHERE user_id = $1
          ORDER BY project_name
        `,
        [user_id],
      );

      return result;
    },
    ["user_projects"],
    { revalidate: REVALIDATE_IN, tags: ["user-projects"] }, // tags can be used to revalidate later
  );

  const result = await getProjects(id);

  const projects: string[] = result?.map((x) => x.project_name);

  return (
    <DashboardShell user={userData} projects={projects ?? []}>
      {children}
    </DashboardShell>
  );
}
