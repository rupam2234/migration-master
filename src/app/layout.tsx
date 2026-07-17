import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ProjectProvider } from "@/context/project-context";
import styles from "./(home)/style.module.css";

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
  icons: ["/images/icon.svg"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProjectProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${styles["mm-root"]}  ${geistMono.variable} antialiased`}
        >
          <main className={`font-[family-name:var(--font-geist-sans)]`}>
            {children}
          </main>
        </body>
      </html>
    </ProjectProvider>
  );
}
