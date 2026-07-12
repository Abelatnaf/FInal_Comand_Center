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
        {/* Resolve saved appearance preferences before first paint so there is
            no flash of the wrong look. Reads localStorage: theme ("light" |
            "dark" | absent = OS), glass (0–100 → --glass-blur px), accent
            (name → --blue/--blue-hover), reduceMotion ("true"). Mirrors the
            values written by components/settings/AppearanceSettings. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=document.documentElement,s=localStorage;" +
              "var t=s.getItem('theme');if(t==='light'||t==='dark'){d.dataset.theme=t;}" +
              "var g=s.getItem('glass');if(g!==null){var px=Math.round(Math.max(0,Math.min(100,+g))/100*40);d.style.setProperty('--glass-blur',px+'px');}" +
              "var a=s.getItem('accent'),M={blue:['#007aff','#0071e3'],purple:['#af52de','#9a3fc8'],indigo:['#5856d6','#4a48c4'],teal:['#30b0c7','#2a9cb0'],pink:['#ff2d55','#e02648'],orange:['#ff9500','#e68600']};if(a&&M[a]){d.style.setProperty('--blue',M[a][0]);d.style.setProperty('--blue-hover',M[a][1]);}" +
              "if(s.getItem('reduceMotion')==='true'){d.dataset.reduceMotion='true';}" +
              "}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
