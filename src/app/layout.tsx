import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NexSchoola — Modern School Management for Ghana",
    template: "%s | NexSchoola",
  },
  description:
    "The all-in-one school management platform built for Ghanaian schools. Manage students, teachers, fees, exams, attendance, and more — all in one place.",
  keywords: ["school management", "Ghana", "education", "SaaS", "NexSchoola"],
  authors: [{ name: "NexSchoola" }],
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: "https://nexschoola.com",
    siteName: "NexSchoola",
    title: "NexSchoola — Modern School Management for Ghana",
    description: "The all-in-one school management platform built for Ghanaian schools.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
