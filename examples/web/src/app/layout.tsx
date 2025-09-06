import type { Metadata } from "next";
import { Header } from "@/components";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextJS Starter",
  description: "A NextJS starter with authentication, database, AI SDK, and testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}