import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "John Fabric — Shirt Configurator",
  description: "Design your perfect shirt",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
