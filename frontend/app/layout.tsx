import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import AuthBootstrap from "@/components/AuthBootstrap";

export const metadata: Metadata = {
  title: "AgroSphere — AI Crop Intelligence for African Farmers",
  description:
    "AI-powered crop recommendation and agricultural decision support " +
    "for smallholder farmers across Africa.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-agro-bg text-agro-text antialiased font-sans">
        <AuthBootstrap />
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#1A1612",
              border:     "1px solid #2E2620",
              color:      "#F7F0E6",
              fontFamily: "DM Sans, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}