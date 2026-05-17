import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ruize Ma",
    template: "%s | Ruize Ma",
  },
  description:
    "A refined AI systems lab showcasing agent workflows, biomedical reasoning, NBA roster intelligence, and predictive modeling demos by Ruize Ma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#080A12] text-zinc-100">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
