import { Footer, Header } from "@/components";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header nav={false} />
      <main>{children}</main>
      <Footer />
    </>
  );
}
