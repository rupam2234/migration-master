import { redirect } from "next/navigation";

export default function DashboardProjectRoot({
  params,
}: {
  params: { projects: string };
}) {
  redirect(`/dashboard/${encodeURIComponent(params.projects)}/shopify-to-wp`);
}
