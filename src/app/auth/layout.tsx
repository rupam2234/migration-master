import { Header } from "@/components";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <>
      <Header nav={false} />
      {children}
    </>
  );
}
