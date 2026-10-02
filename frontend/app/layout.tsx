import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mhesh — The Operating System for Kenyan Political Campaigns",
  description: "Verified profiles, AI-generated campaign material, and escrow-protected campaign work for Kenya 2027.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
