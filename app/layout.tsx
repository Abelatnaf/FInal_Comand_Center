import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Command Deck — Finance Command Center",
  description: "A personal finance command center for tracking spending, income, and net worth.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resolve saved appearance preferences before first paint so there is
            no flash of the wrong look. Reads localStorage: glass (0–100 →
            --glass-blur px), reduceMotion ("true"). The Wallet redesign
            committed to a single dark canvas, so there's no theme/accent
            preference to resolve anymore — see components/settings/AppearanceSettings. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=document.documentElement,s=localStorage;" +
              "var g=s.getItem('glass');if(g!==null){var px=Math.round(Math.max(0,Math.min(100,+g))/100*40);d.style.setProperty('--glass-blur',px+'px');}" +
              "if(s.getItem('reduceMotion')==='true'){d.dataset.reduceMotion='true';}" +
              "}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
