"use client";

import Link from "next/link";

export function DashboardFooter({ collapsed }: { collapsed: boolean }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex items-center gap-2 text-sm text-primary/60 whitespace-nowrap">
      <span
        className="shrink-0 flex hover:cursor-pointer items-center justify-center text-[18px]"
        title={`Migration Master | ${year}`}
      >
        ©
      </span>

      <span
        className={`overflow-hidden transition-all duration-200 ${
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        }`}
      >
        <Link href={"/"}>Migration Master | {year}</Link>
      </span>
    </div>
  );
}
