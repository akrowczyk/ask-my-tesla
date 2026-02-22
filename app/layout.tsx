import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import StatusBar from "@/components/StatusBar";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import { KeysProvider } from "@/lib/keys";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Ask My Tesla",
  description:
    "AI-powered conversational interface for your Tesla. Chat with your car using natural language.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ask My Tesla",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <KeysProvider>
          <ServiceWorkerRegistrar />
          <div className="app-shell">
            <StatusBar />
            {children}
          </div>
        </KeysProvider>
      </body>
    </html>
  );
}
