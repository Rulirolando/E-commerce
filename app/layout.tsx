import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";
import Providers from "./components/Providers";

export const metadata: Metadata = {
  title: "Rulshop",
  description: "Rulshop - Belanja Online Terlengkap dan Terpercaya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storage = localStorage.getItem('theme-storage');
                  if (storage) {
                    const parsed = JSON.parse(storage);
                    if (parsed.state && parsed.state.isDarkMode === true) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.MIDTRANS_CLIENT_KEY}
          strategy="beforeInteractive"
        />
      </head>

      <body className="antialiased">
        <SessionProvider>
          <Providers>{children}</Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
