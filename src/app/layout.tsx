import type { Metadata } from "next";
import "./globals.css";
import { PaddleLoader } from "@/components/PaddleLoader";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: "🔥 ExRoast.fm - Turn Your Breakup Into a Savage Roast Song",
  description: "Zero sadness. 100% savage. Turn your breakup into a TikTok-viral AI roast song in seconds. Petty, brutal, hilarious.",
  keywords: ["breakup song", "roast my ex", "AI music", "savage roast", "petty revenge", "TikTok viral", "breakup revenge"],
  openGraph: {
    title: "🔥 ExRoast.fm - Roast Your Ex With AI Music",
    description: "Zero sadness. 100% savage. TikTok-viral AI roasts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-black min-h-screen font-sans">
        <ScrollToTop />
        <PaddleLoader />
        {children}
      </body>
    </html>
  );
}
