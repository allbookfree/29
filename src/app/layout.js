import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/sidebar.css";
import "@/styles/components.css";
import "@/styles/modal.css";
import "@/styles/pages.css";
import "@/styles/home.css";
import "@/styles/metadata.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "PromptStudio — AI Prompt & Metadata Generator",
  description:
    "Generate AI image prompts and extract Microstock metadata from images with AI-powered analysis.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
