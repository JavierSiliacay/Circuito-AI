import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

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
  title: "Circuito AI — Arduino & ESP32 Cloud IDE",
  description:
    "Browser-based Arduino/ESP32 IDE with firmware flashing, circuit design, and a hardware-specialized AI assistant. Write, flash, and debug embedded code in the cloud.",
  keywords: [
    "Arduino IDE",
    "ESP32",
    "firmware flash",
    "circuit design",
    "embedded AI",
    "hardware assistant",
    "IoT",
    "cloud IDE",
  ],
  authors: [{ name: "Circuito AI" }],
  openGraph: {
    title: "Circuito AI — Arduino & ESP32 Cloud IDE",
    description:
      "Write, flash, and debug embedded code with an AI hardware assistant.",
    type: "website",
  },
};

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
