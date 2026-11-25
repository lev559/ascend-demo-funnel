import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import { PUBLIC } from "../lib/config";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ascend-demo-funnel.vercel.app";
export const metadata = {
  metadataBase: new URL(SITE),
  title: "Quietly: an AI coach you'd text on a bad day",
  description: "Say what's going on. Get questions, a chat and a plan written for your situation, from a coach who remembers.",
  openGraph: { type: "website", url: SITE, siteName: "Quietly", title: "Quietly: an AI coach you'd text on a bad day",
    description: "Say what's going on. Get a plan written for your situation, from a coach who remembers.", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Quietly AI coach" }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  icons: { icon: "/avatars/theo.svg" },
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#1C1730" };

export default function RootLayout({ children }) {
  const gtm = PUBLIC.gtmId;
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" />
        {gtm && (
          <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
        )}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
