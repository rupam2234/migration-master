import { ReactNode } from "react";

export default function Container({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 md:px-10 lg:px-10 xl:px-0 2xl:px-0">{children}</div>
  );
}
