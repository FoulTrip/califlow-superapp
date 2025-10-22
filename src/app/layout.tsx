import type { Metadata } from "next";
import "./globals.css";
import { DarkModeProvider } from "@/context/DarkModeContext";
import { SocketProvider } from "@/context/SocketContext";
import SessionProviderWrapper from "@/context/SessionProviderWrapper";
import Navbar from "@/components/navbar/Navbar";

export const metadata: Metadata = {
  title: "Califlow - Tourist Management",
  description: "Real-time tourist monitoring and congestion alerts for Cali",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`antialiased`}>
        <SessionProviderWrapper>
          <SocketProvider>
            <DarkModeProvider>
              <Navbar />
              {children}
            </DarkModeProvider>
          </SocketProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
