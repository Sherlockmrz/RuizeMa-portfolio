import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
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
  const themeScript = `
    (() => {
      try {
        const storedTheme = window.localStorage.getItem("ruize-theme");
        const theme = ["dark", "blue", "purple"].includes(storedTheme) ? storedTheme : "blue";
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
      } catch {
        document.documentElement.dataset.theme = "blue";
      }
    })();
  `;

  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-theme="blue"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
