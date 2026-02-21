import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: "NexCRM — Intelligent CRM Platform",
  description: "CRM moderno com integração WhatsApp, Google Agenda, Webhooks e Agentes de IA personalizados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#000000] text-[#F8FAFC] overflow-hidden`}
      >
        {/* Animated Mesh Gradient Background */}
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
          <div className="mesh-blob bg-blue-600/30 w-[60vw] h-[60vh] rounded-full top-[-10%] left-[-10%] mix-blend-screen" />
          <div className="mesh-blob bg-violet-600/20 w-[50vw] h-[50vh] rounded-full top-[40%] right-[-5%] mix-blend-screen" style={{ animationDelay: '-5s', animationDuration: '25s' }} />
          <div className="mesh-blob bg-indigo-500/20 w-[40vw] h-[40vh] rounded-full bottom-[-10%] left-[20%] mix-blend-screen" style={{ animationDelay: '-10s', animationDuration: '30s' }} />
        </div>

        <TooltipProvider delayDuration={0}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
