import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

// @ts-ignore
import "./globals.css";

import { LanguageProvider } from "@/components/language-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Outlook Kanban - Gestão de Emails",
  description:
    "Organize os seus emails do Outlook num quadro Kanban com arrastar e largar",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-PT">
      <body className={inter.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}