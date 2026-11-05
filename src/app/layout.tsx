import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaSupport } from "@/components/pwa/PwaSupport";

export const metadata: Metadata = {
  title: "InvStock — Practice the market",
  description: "A professional stock-market simulator. Learn, trade and build your portfolio with virtual money.",
  applicationName: "InvStock",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "InvStock" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" }
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<PwaSupport /></body></html>;
}
