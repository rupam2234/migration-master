import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { resources?: string };
}): Promise<Metadata> {
  const resource = params.resources
    ? params.resources.replaceAll("-", " ").replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      )
    : "Export";

  return {
    title: `Export ${resource}`,
  };
}

export default function ExportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
