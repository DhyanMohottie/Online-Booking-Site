import type { Metadata } from "next";
import { Oswald, Open_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"], weight: ["400", "500", "600"] });
const openSans = Open_Sans({ variable: "--font-opensans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StayFinder - Hotel Booking Demo",
  description: "Educational hotel booking demo: search, book, manage hotels and review stays.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${oswald.variable} ${openSans.variable} overflow-x-hidden font-sans antialiased`}>
        <Header />
        <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
