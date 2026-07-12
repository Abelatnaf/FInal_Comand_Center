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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resolve the saved theme before first paint so there is no flash of
            the wrong appearance. Reads localStorage("theme"): "light" | "dark"
            | absent (= follow the OS). Sets data-theme only for an explicit
            choice, matching the CSS in globals.css. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
