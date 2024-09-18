import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Image from "next/image";
import Header from "@/components/custom-elements/header";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Migration Master",
  description:
    "A tool to streamline the migration of Shopify pages and posts to WordPress.",
  creator: "FlipCraft Devs",
  publisher: "Migration Master",
  category: "WordPress",
  openGraph: {
    siteName: "Migration Master",
    images: "/images/Migration-Master_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const date = new Date();
  const currentYear = date.getFullYear();
  return (
    <html lang="en">
      <head></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        <div className="grid grid-col-12 items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
          <main className="flex flex-col gap-8 row-start-1 items-center sm:items-start max-w-[800px] px-5">
            {/* <FirstStep /> */}
            {children}
          </main>
          <footer className="row-start-3 flex gap-6 text-[14px] flex-wrap items-center justify-center">
            <p className="flex items-center gap-2">
              <Image
                aria-hidden
                src="/images/dev-logo.svg"
                alt="dev-logo"
                width={16}
                height={16}
              />
              Copywrite {currentYear} | All Rights Reserved.
            </p>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="#"
            >
              <Image
                aria-hidden
                src="https://nextjs.org/icons/window.svg"
                alt="Window icon"
                width={16}
                height={16}
              />
              Contact
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="#"
            >
              <Image
                aria-hidden
                src="https://nextjs.org/icons/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
              />
              Privacy Policy
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
