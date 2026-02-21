import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import StatusBar from "@/components/StatusBar";
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
  icons: {
    icon: "/favicon.ico",
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
          <div className="app-shell">
            <StatusBar />
            {children}
          </div>
        </KeysProvider>
      </body>
    </html>
  );
}
