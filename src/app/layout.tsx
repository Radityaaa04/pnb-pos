import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatus } from "@/components/NetworkStatus";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LowStockNotifier } from "@/components/LowStockNotifier";
import { PageTransition } from "@/components/PageTransition";
import { createClient } from "@/lib/supabase/server";
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
  title: "PNB-POS | Sistem Point of Sale",
  description: "Aplikasi kasir modern berbasis web dengan dukungan offline dan sinkronisasi real-time.",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role = null;
  let userName = null;

  if (user) {
    const { data } = await supabase.from("profiles").select("role, name").eq("id", user.id).single();
    role = data?.role;
    userName = data?.name;
  }

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="font-sans h-screen overflow-hidden flex flex-col md:flex-row bg-background transition-colors duration-300">
        <ThemeProvider>
          {!user ? (
            <main className="flex-1 h-full overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <PageTransition>{children}</PageTransition>
              </div>
              <Toaster richColors position="top-right" />
            </main>
          ) : (
            <>
              <div className="hidden md:flex h-full">
                <Sidebar role={role} userName={userName} />
              </div>
              <main className="flex-1 h-full overflow-hidden flex flex-col">
                <MobileNav role={role} userName={userName} />
                <div className="flex-1 overflow-y-auto">
                  <PageTransition>{children}</PageTransition>
                </div>
              </main>
              <NetworkStatus />
              <LowStockNotifier />
              <Toaster richColors position="top-right" />
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
