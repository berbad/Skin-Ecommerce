import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import ChatWidget from "@/components/chat/ChatWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eternal Botanic",
  description: "Premium skincare products for all skin types",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${hanken.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <ChatWidget />
        </ErrorBoundary>
      </body>
    </html>
  );
}
