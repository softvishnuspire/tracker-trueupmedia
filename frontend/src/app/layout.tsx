import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { PageLoadingProvider } from "@/components/ui/TopProgressBar";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Tracker",
  description: "Next-generation media management and workflow automation platform.",
  icons: {
    icon: '/favicon.jpeg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={plusJakartaSans.className}>
        <PageLoadingProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PageLoadingProvider>
      </body>
    </html>
  );
}


