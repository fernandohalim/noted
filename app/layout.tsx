import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://noted-dev-app.vercel.app"),
  title: "noted.",
  description: "minimalist note-taking, fast and reliable.",
  keywords: ["notes", "markdown", "noted", "pwa"],
  appleWebApp: {
    capable: true,
    title: "noted.",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "noted.",
    description: "minimalist note-taking, fast and reliable.",
    url: "https://noted-dev-app.vercel.app",
    siteName: "noted.",
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geistMono.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
