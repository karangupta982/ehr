import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EHR Integration Dashboard",
  description: "Cerbo & ModMed sandbox integrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="min-h-screen flex">
            <aside className="w-[240px] border-r p-4 hidden sm:block">
              <nav className="flex flex-col gap-2 text-sm">
                <a className="hover:underline" href="/">Dashboard</a>
                <a className="hover:underline" href="/patients">Patients</a>
                <a className="hover:underline" href="/appointments">Appointments</a>
              </nav>
            </aside>
            <main className="flex-1 p-4">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
