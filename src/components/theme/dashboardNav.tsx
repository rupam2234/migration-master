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
              className={`flex ${isActive ? "bg-primary/10 text-primary" : "text-primary/80"} text-sm hover:bg-primary/10 px-2 rounded-sm font-medium ${collapsed ? "justify-center" : ""} items-center gap-2 py-1 hover:text-primary/60 my-2`}
            >
              <span>{item?.icon ?? <PiIcon size={16} />}</span>
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
    </div>
  );
}

