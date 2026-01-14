import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; 
import ScrollToTop from "../components/ScrollToTop";

const inter = Inter({ subsets: ["latin"] });

// 1. Viewport settings (Standard for PWAs)
export const viewport: Viewport = {
  themeColor: "#16a34a", // Sets the Android status bar color to match your brand green
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents zooming on inputs for a "native app" feel
};

// 2. Metadata with PWA links & Branding
export const metadata: Metadata = {
  title: "WiseBites | The Celiac Restaurant Navigator",
  description: "Find celiac-friendly dining with AI-powered reviews.",
  
  // PWA Configuration
  manifest: "/manifest.json", 
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WiseBites",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png", // Ensures the icon appears on iPhone home screens
  },
  
  // Open Graph (Link Previews for iMessage/Text/Slack)
  openGraph: {
    title: "WiseBites",
    description: "The Celiac Restaurant Navigator. Find celiac-friendly dining with AI-powered reviews.",
    siteName: "WiseBites",
    type: "website",
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
        <ScrollToTop />
        <Navbar />
        <main className="min-h-screen">
            {children}
        </main>
      </body>
    </html>
  );
}