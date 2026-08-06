import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// The display serif, used for exactly two things: the one hero figure per
// screen and page titles. A high-contrast serif numeral is the strongest
// premium signal available for the cost of one font load -- and Newsreader
// is chosen over the more decorative options specifically because it has
// real lining figures, which a money app cannot do without.
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal"],
  // Named for the family, not the role: globals.css aliases it to
  // --font-display, and a variable that references itself is a cycle CSS
  // silently discards.
  variable: "--font-newsreader",
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
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-full antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
