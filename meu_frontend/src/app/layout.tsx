import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";

const geistSans = localFont({
  src: "./fonts/geist-sans.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/geist-mono.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Meu - trading system",
  description: "Manage autonomous trading agents, exchange connections and portfolio activity with Meu.",
  icons: { icon: "/img/meu-symbol.png", apple: "/img/meu-symbol.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Keep the boot script and ui-settings.tsx migration in sync.
            __html: `(function(){var d=document.documentElement;var t="sculpt-dark";try{var s=JSON.parse(localStorage.getItem("meu:ui-settings")||"{}");var v=s.look||s.colorTheme;if(v==="sculpt-light"||v==="ledger")t="sculpt-light"}catch(e){}d.dataset.theme=t;d.classList.toggle("dark",t!=="sculpt-light");d.style.setProperty("--radius","1rem")})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-sidebar`}
      >
        <TRPCReactProvider>
          <main>{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
