import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/lib/data";
import { DialogProvider } from "@/components/Dialog";
import Shell from "@/components/Shell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IPL Blok AJ",
  description: "Pencatatan IPL Blok AJ: iuran bulanan, pemasukan, dan pengeluaran",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <DataProvider>
          <DialogProvider>
            <Shell>{children}</Shell>
          </DialogProvider>
        </DataProvider>
      </body>
    </html>
  );
}
