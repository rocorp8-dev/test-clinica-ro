import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Test Clínica - Gestión Médica",
  description: "Sistema de gestión para clínicas y consultorios médicos.",
};

import { Toaster } from 'sonner'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-[family-name:var(--font-geist-sans)]`}>
        <div className="min-h-screen bg-slate-50">
          <Sidebar />
          <div className="pl-64">
            <Header />
            <main>{children}</main>
          </div>
        </div>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
