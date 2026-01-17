import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudAdditive - Your Ideas, Printed in 3D",
  description: "Fast, precise 3D printing services for B2C and B2B customers. From functional prototypes to volume production in over 30+ industrial materials.",
  keywords: ["3D printing", "additive manufacturing", "prototyping", "STL", "PLA", "ABS", "PETG"],
  authors: [{ name: "CloudAdditive" }],
  openGraph: {
    title: "CloudAdditive - Your Ideas, Printed in 3D",
    description: "Fast, precise 3D printing services. From prototypes to production.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

