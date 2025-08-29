import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { 
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { ConvexProvider } from "./providers/convex-provider";
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
    <ClerkProvider>
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
                  <SignedOut>
                    <SignInButton>
                      <button className="btn-sage-secondary text-sm">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button className="btn-sage-primary text-sm">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              </div>
            </div>
          </header>
          <ConvexProvider>
            {children}
          </ConvexProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
