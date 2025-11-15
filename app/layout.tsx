import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PaddleLoader } from "@/components/PaddleLoader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "💔 HeartHeal - Turn Your Pain Into Songs That Heal",
  description: "Instant AI songs that say what you wish you could — sad, savage, healing, or funny. Transform your heartbreak into music in seconds.",
  keywords: ["breakup", "healing", "AI music", "heartbreak", "emotional healing", "sad songs", "savage songs"],
  openGraph: {
    title: "💔 HeartHeal - Heartbroken? Turn your pain into a song that heals",
    description: "Instant AI songs tailored to your emotions",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-gradient-to-br from-heartbreak-50 via-white to-gray-50 min-h-screen">
        <PaddleLoader />
        {children}
      </body>
    </html>
  );
}
