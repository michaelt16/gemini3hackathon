import type { Metadata } from "next";
import { Crimson_Pro, Lora } from "next/font/google";
import "./globals.css";
import { NavigationLoadingProvider } from "@/components/NavigationLoading";

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Memory Keeper - Preserve Family Stories",
  description: "Transform cherished photos into living memories with AI-powered storytelling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${crimsonPro.variable} ${lora.variable} antialiased`}
        style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
        suppressHydrationWarning
      >
        <NavigationLoadingProvider>
        {children}
        </NavigationLoadingProvider>
      </body>
    </html>
  );
}
