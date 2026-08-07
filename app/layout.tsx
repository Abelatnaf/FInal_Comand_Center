import type { Metadata, Viewport } from "next";
import { Fraunces, Libre_Franklin } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// Body/UI. Libre Franklin is drawn from the Franklin Gothic lineage --
// literally a newspaper-headline typeface family -- which is the whole point
// of the "editorial ledger" direction: legible at small tabular sizes, real
// character at large ones, and not the Inter/Roboto/system-font default
// every AI-generated interface converges on.
const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-libre-franklin",
});

// The display serif, used for the one hero figure per screen, page titles,
// and the masthead wordmark. Fraunces carries real weight contrast and a
// genuine italic (not a faux-obliqued one), both load-bearing for the
// editorial voice this pass is going for. Named for the family, not the
// role: globals.css aliases it to --font-display, and a variable that
// references itself is a cycle CSS silently discards.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: { default: "Command Deck", template: "%s — Command Deck" },
  description: "Track every expense in one place — budgets, bills and net worth.",
};

export const viewport: Viewport = {
  themeColor: "#f4f1ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${libreFranklin.variable} ${fraunces.variable}`}>
      <body className="min-h-full antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
