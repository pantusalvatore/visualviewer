import type { Metadata, Viewport } from "next";
import { SettingsProvider } from "@/components/settings";
import { themeInitScript } from "@/lib/settings-keys";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Carico — schede di allenamento", template: "%s · Carico" },
  description: "Crea, salva ed esegui le tue schede di allenamento in palestra.",
  applicationName: "Carico",
  appleWebApp: { capable: true, title: "Carico", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f1ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <SettingsProvider>{children}</SettingsProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
