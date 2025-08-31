import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinHelm - AI Financial Intelligence for Sage Intacct",
  description: "Extend your Sage Intacct investment with AI-powered insights and intelligent automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-sage-dark">FinHelm</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button className="btn-sage-secondary text-sm">
                  Sign In
                </button>
                <button className="btn-sage-primary text-sm">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
