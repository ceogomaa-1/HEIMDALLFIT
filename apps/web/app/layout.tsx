import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HEIMDALLFIT",
  description: "Luxury business infrastructure for elite coaches."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
