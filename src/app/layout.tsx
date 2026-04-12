import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const soraDisplay = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SafeFlow AU - Privacy-First Family Finance",
  description:
    "Track expenses, manage cashflow, and monitor investments with complete privacy. Your data stays on your device.",
  keywords: [
    "finance",
    "budget",
    "expense tracker",
    "Australia",
    "privacy",
    "local-first",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* S-1: Content Security Policy — mitigate XSS in this local-data app */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; connect-src 'self' http://127.0.0.1:* http://localhost:* ws://localhost:* wss://localhost:* https://apis.google.com https://*.googleapis.com https://*.googleusercontent.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://accounts.google.com;"
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${geistMono.variable} ${soraDisplay.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
