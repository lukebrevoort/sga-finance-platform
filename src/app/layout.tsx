import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SGA Finance Platform | Stevens Institute of Technology",
  description: "Automate budget request slideshows and spreadsheets for Stevens SGA Finance Department",
  keywords: ["SGA", "Stevens", "Finance", "Budget", "PowerPoint", "Excel"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        {/* Header */}
        <header className="bg-[#A32638] text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <img 
                  src="/sgalogo.jpeg" 
                  alt="Stevens SGA Logo" 
                  className="w-12 h-12 rounded-full bg-white object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold">SGA Finance Platform</h1>
                  <p className="text-red-200 text-sm">Stevens Institute of Technology</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-400 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm">
                  Built for the SGA Finance Department
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Stevens Institute of Technology Student Government Association
                </p>
              </div>
              <div className="text-sm">
                <p>Questions? Contact the VP of Finance</p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
