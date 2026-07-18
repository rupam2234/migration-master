import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ProjectProvider } from "@/context/project-context";
import styles from "./(home)/style.module.css";
import {
  Barlow_Condensed,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
} from "next/font/google";

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
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
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
      <html
        lang="en"
        className={`${plex.variable} ${mono.variable} ${barlow.variable}`}
      >
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
