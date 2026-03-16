import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import MaintenanceMode from "@/components/maintenance-mode";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Circuito AI",
  description:
    "Chat with AI to generate Arduino and ESP32 code instantly. Flash firmware directly from your browser. No IDE needed.",
  keywords: [
    "Arduino code generator",
    "ESP32",
    "AI coding assistant",
    "firmware flash",
    "IoT",
    "hardware AI",
    "embedded systems",
  ],
  authors: [{ name: "Circuito AI" }],
  openGraph: {
    title: "Circuito AI — AI-Powered Arduino & ESP32 Code Generator",
    description:
      "Chat with AI to generate Arduino and ESP32 code. Flash firmware from your browser.",
    type: "website",
  },
  icons: {
    icon: "/brand/master-logo.png",
    apple: "/brand/master-logo.png",
  },
};

import { IoTAssistant } from "@/components/IoTAssistant";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          <MaintenanceMode>
            {children}
            <IoTAssistant />
          </MaintenanceMode>
        </Providers>
      </body>
    </html>
  );
}
