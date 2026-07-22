"use client";

import { CopyrightIcon, LightbulbIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

type FooterNavItems = {
  icon: ReactNode;
  title: ReactNode;
};

export function DashboardFooter({ collapsed }: { collapsed: boolean }) {
  const year = new Date().getFullYear();

  const items: FooterNavItems[] = [
    {
      icon: <LightbulbIcon size={18} className="fill-orange-200" />,
      title: <Link href={"/blog"}>Blog & Support docs</Link>,
    },
    {
      icon: <CopyrightIcon size={18} className="fill-gray-300" />,
      title: <Link href={"/"}>Migration Master | {year}</Link>,
    },
  ];

  return (
    <div className="flex flex-col items-start justify-end gap-5">
      {items &&
        items.map((item, index) => {
          return (
            <div
              key={index}
              className="flex items-center justify-start gap-2 text-sm text-primary/60 whitespace-nowrap"
            >
              <span className="shrink-0 flex hover:cursor-pointer items-center justify-center text-[18px]">
                {item.icon}
              </span>
              <span
                className={`overflow-hidden hover:underline transition-all duration-200 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
              >
                {item.title}
              </span>
            </div>
          );
        })}
    </div>
  );
}
