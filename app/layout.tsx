import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;

  return {
    title: "Stackd — Know every tool in your stack",
    description: "Your personal operating system for discovering, organizing, visualizing, and optimizing every software tool you use.",
    openGraph: {
      title: "Stackd — Know every tool in your stack",
      description: "Discover, organize, visualize, and optimize every software tool you use.",
      type: "website",
      images: [{ url: image, width: 1731, height: 909, alt: "Stackd — Know every tool in your stack." }],
    },
    twitter: { card: "summary_large_image", title: "Stackd — Know every tool in your stack", description: "Your personal technology stack, beautifully accounted for.", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
