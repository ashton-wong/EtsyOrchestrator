import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "EtsyOrchestrator", description: "Autonomous venture generator" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b px-6 py-3 flex gap-6 items-center">
          <span className="font-bold text-lg">EtsyOrchestrator</span>
          <a href="/" className="text-sm text-gray-600 hover:text-black">Dashboard</a>
          <a href="/runs" className="text-sm text-gray-600 hover:text-black">Runs</a>
          <a href="/analytics" className="text-sm text-gray-600 hover:text-black">Analytics</a>
          <a href="/settings" className="text-sm text-gray-600 hover:text-black">Settings</a>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
