import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Briefly: Stay Informed. Stay Ahead. Briefly.", template: "%s | Briefly" },
  description: "The 60 stories that matter from India and the world, summarised and linked to their original publishers.",
  openGraph: { title: "Briefly", description: "Your daily briefing, all in one place.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf7f1" }, { media: "(prefers-color-scheme: dark)", color: "#1a1512" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <body>
        <ThemeProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-foreground focus:px-3 focus:py-2 focus:text-background">
            Skip to content
          </a>
          <Navbar />
          <main id="main" className="min-h-[72vh]">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
