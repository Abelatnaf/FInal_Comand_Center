import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Deck — VMI Finance",
  description: "Personal finance command center for VMI cadet life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
