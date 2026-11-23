import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

export const metadata = { title: "Ascend — demo AI coach funnel", description: "Portfolio demo funnel. Not a real product." };

export default function RootLayout({ children }) {
  const gtm = process.env.NEXT_PUBLIC_GTM_ID;
  return (
    <html lang="en">
      <head>
        {gtm && (
          <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
        )}
      </head>
      <body>
        <div className="demo-bar">Portfolio demo — not a real product. Payments run in test mode only.</div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
