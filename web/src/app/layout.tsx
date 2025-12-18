import type { Metadata } from "next";
import "./globals.css";
import { ApplicationLayout } from "@tetrastack/react-glass-components";
import { AppNav } from "@/components/app-shell-nav";

export const metadata: Metadata = {
  title: "Catalyst",
  description: "Preview environments and compute management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased bg-background text-on-background">
        <ApplicationLayout
          className="bg-gradient-to-br from-background via-surface to-surface-variant text-on-background"
          header={
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/40 text-primary font-semibold grid place-items-center">
                TS
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm text-on-surface-variant">Catalyst</span>
                <span className="text-base font-semibold text-on-surface">
                  Preview Platform
                </span>
              </div>
            </div>
          }
          nav={<AppNav />}
        >
          <div className="max-w-6xl mx-auto w-full">{children}</div>
        </ApplicationLayout>
      </body>
    </html>
  );
}
