import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Manrope is the typeface named in the Dial identity file (400 to 800).
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Dial — Your computer is one phone call away", template: "%s · Dial" },
  description: "Tell Dial what you need. Review it. Get it done. Dial prepares your job application from your saved profile, reads it back on the phone, and sends it only after you say yes.",
};
export const viewport: Viewport = { themeColor: "#f6f3eb", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
