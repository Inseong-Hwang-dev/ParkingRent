import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GoogleMapsProvider } from "@/components/providers/google-maps-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ParkSpace – Find & List Parking in Australia",
    template: "%s | ParkSpace",
  },
  description:
    "Australia's free peer-to-peer parking marketplace. Find affordable parking spaces or list yours — no fees, no fuss.",
  keywords: ["parking", "parking space", "rent parking", "Melbourne parking", "Australia parking"],
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "ParkSpace",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
        <Toaster />
      </body>
    </html>
  );
}
