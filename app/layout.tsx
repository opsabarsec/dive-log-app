import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dive Log App",
  description: "Track your diving adventures with location-based logging",
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
