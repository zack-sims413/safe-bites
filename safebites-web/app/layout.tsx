import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; 

const inter = Inter({ subsets: ["latin"] });

// 1. Viewport settings (Standard for PWAs)
export const viewport: Viewport = {
  themeColor: "#16a34a", // Sets the Android status bar color
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents zooming on inputs for a "native app" feel
};

// 2. Metadata with PWA links
export const metadata: Metadata = {
  title: "WiseBites | Eat without fear",
  description: "Find celiac-friendly dining with AI-powered reviews.",
  manifest: "/manifest.json", // Links to the file in public/ folder
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WiseBites",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png", // iPhone home screen icon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen">
            {children}
        </main>
      </body>
    </html>
  );
}