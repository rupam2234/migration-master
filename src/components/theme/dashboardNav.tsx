"use client";

import { PiIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export type NavItems = {
  title: string;
  link?: string;
  icon?: ReactNode;
};

export function DashboardNavigation({
  collapsed,
  navItems,
}: {
  collapsed: boolean;
  navItems: NavItems[];
}) {
  const pathname = usePathname();

  return (
    <div>
      {navItems &&
        navItems.map((item) => {
          const isActive = item.link && pathname === item.link;
          return (
            <Link
              href={item.link ?? "#"}
              key={item.title}
              className={`flex ${
                isActive ? "bg-primary/10 text-primary" : "text-primary/80"
              } text-sm hover:bg-primary/10 ${collapsed ? "px-1" : "px-2"} rounded-sm font-medium items-center gap-2 py-1 my-2 whitespace-nowrap transition-colors`}
            >
              <span className="shrink-0 flex items-center justify-center">
                {item.icon ?? <PiIcon size={12} />}
              </span>

              <span
                className={`overflow-hidden transition-all duration-200 ${
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
    </div>
  );
}
