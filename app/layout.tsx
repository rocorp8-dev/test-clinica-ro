import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

export const metadata: Metadata = {
  title: "MdPulso | Plataforma de Gestión Médica Inteligente",
  description: "Sistema operativo de nivel clínico para la gestión integral de pacientes, citas y expedientes electrónicos.",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <LayoutWrapper>{children}</LayoutWrapper>
    </html>
  );
}
