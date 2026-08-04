import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-accent" });

export const metadata: Metadata = {
  title: { default: "Command Deck", template: "%s — Command Deck" },
  description: "Track every expense in one place — budgets, bills and net worth.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="min-h-full antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
