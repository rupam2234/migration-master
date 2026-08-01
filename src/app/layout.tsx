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
import Script from "next/script";

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
    "Prepare WordPress ready import files of your products, customers, orders, pages, blogs and media library from shopify store to significantly reduce migration time and configuration required. Avoids broken links and images + preserve SEO.",
  creator: "FlipCraft Devs",
  publisher: "Migration Master",
  category: "WordPress",
  openGraph: {
    siteName: "Migration Master",
    images: "/images/migration-master-opengraph-image.png",
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
        <head>
          <Script
            id="crisp-chat"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                  window.$crisp=[];
                  window.CRISP_WEBSITE_ID="0bdf8210-d4d7-46ab-ac91-6e36735e28e5";
                  (function(){
                    d=document;
                    s=d.createElement("script");
                    s.src="https://client.crisp.chat/l.js";
                    s.async=1;
                    d.getElementsByTagName("head")[0].appendChild(s);
                  })();
                `,
            }}
          />
        </head>
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
