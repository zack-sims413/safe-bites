import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar"; // Make sure this import path is correct

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WiseBites",
  description: "Find safe gluten-free food, faster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Navbar is here, so it shows on Home, Profile, Login, EVERYTHING */}
        <Navbar />
        <main className="min-h-screen">
            {children}
        </main>
      </body>
    </html>
  );
}