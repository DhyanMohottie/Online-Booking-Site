import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StayFinder - Hotel Booking Demo",
  description: "Educational hotel booking demo: search, book, manage hotels and review stays.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <Header />
        <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-6">{children}</main>
        <footer className="mt-10 border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
          StayFinder is an educational demo. No real payments are processed.
        </footer>
      </body>
    </html>
  );
}
