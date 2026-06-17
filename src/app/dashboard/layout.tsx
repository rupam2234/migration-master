import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib";
import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";
import { unstable_cache } from "next/cache";

const REVALIDATE_IN = 5 * 60; // 5 min

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { name, id, email } = user;
  const userData = {
    name,
    id,
    email,
  };

  const getProjects = unstable_cache(
    async (user_id: string) => {
      const result = await pool.query(
        `SELECT shop_domain FROM shop_credentials WHERE user_id = $1`,
        [user_id],
      );

      return result;
    },
    ["user_projects"],
    { revalidate: REVALIDATE_IN, tags: ["user-projects"] }, // tags can be used to revalidate later
  );

  const result = await getProjects(id);

  const projects: string[] = result?.map((x) => x.shop_domain);

  return (
    <DashboardShell user={userData} projects={projects ?? []}>
      {children}
    </DashboardShell>
  );
}
