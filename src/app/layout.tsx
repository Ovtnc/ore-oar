import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") || "https://oar-ore.com";

export const metadata: Metadata = {
  title: "Oar & Ore",
  description: "Özel üretim lüks pirinç takı mağazası",
  metadataBase: new URL(baseUrl),
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full bg-[#111111] text-zinc-100">
        <div className="site-ambient" aria-hidden="true" />
        <AuthProvider>
          <CartProvider>
            <div className="relative z-10">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
