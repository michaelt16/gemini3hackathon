import type { Metadata } from "next";
import { Inter, Crimson_Pro } from "next/font/google";
import "./globals.css";
import { NavigationLoadingProvider } from "@/components/NavigationLoading";
import ThemeWrapper from "@/components/ThemeWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Living Memory — Where Your Family Stories Become Forever",
  description: "An AI companion that helps your family capture, preserve, and relive the stories that matter most. Built with Google Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${crimsonPro.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeWrapper>
          <NavigationLoadingProvider>
            {children}
          </NavigationLoadingProvider>
        </ThemeWrapper>
      </body>
    </html>
  );
}
