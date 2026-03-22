import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "HelpHub - Reporting System",
  description: "Civic and Welfare Reporting System. Report issues, get help from volunteers, and track reports in real-time.",
  keywords: ["helphub reporting system", "reporting system", "civic issue reporting", "help hub", "volunteer assistance", "community help", "welfare app"],
  openGraph: {
    title: "HelpHub - Reporting System",
    description: "Civic and Welfare Reporting System",
    url: "https://helphub-reporting.vercel.app/",
    siteName: "HelpHub",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HelpHub",
  },
};

export const viewport: Viewport = {
  themeColor: "#6B4CE6",
};

import Navigation from "@/components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <Navigation />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
