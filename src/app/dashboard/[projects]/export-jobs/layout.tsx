import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Export Jobs",
};

export default function ExportJobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
