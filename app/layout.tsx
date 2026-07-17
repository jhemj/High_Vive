import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const imageUrl = new URL("/og.png", origin).toString();
  const country = (requestHeaders.get("cf-ipcountry") ?? requestHeaders.get("x-country") ?? "").toUpperCase();
  const acceptLanguage = requestHeaders.get("accept-language") ?? "";
  const locale = country ? (country === "KR" ? "ko" : "en") : /^ko(?:-|,|;|$)/i.test(acceptLanguage) ? "ko" : "en";
  const description = locale === "ko"
    ? "로컬 Codex가 평가하는 바이브코더 AI 협업 벤치마크, Passport와 HV Rating 리더보드."
    : "A local-Codex AI collaboration benchmark, Passport, and HV Rating leaderboard for vibe coders.";

  return {
    metadataBase: new URL(origin),
    title: {
      default: "High-Vive — Vibe Coder Benchmark League",
      template: "%s · High-Vive",
    },
    description,
    applicationName: "High-Vive",
    keywords: ["vibe coder", "Codex", "AI benchmark", "leaderboard", "HV Rating", "AI Witness"],
    openGraph: {
      type: "website",
      title: "High-Vive — Vibe Coder Benchmark League",
      description,
      images: [{ url: imageUrl, width: 1730, height: 909, alt: "High-Vive TOP 3 benchmark league cards" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "High-Vive — Vibe Coder Benchmark League",
      description,
      images: [imageUrl],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const country = (requestHeaders.get("cf-ipcountry") ?? requestHeaders.get("x-country") ?? "").toUpperCase();
  const acceptLanguage = requestHeaders.get("accept-language") ?? "";
  const locale = country ? (country === "KR" ? "ko" : "en") : /^ko(?:-|,|;|$)/i.test(acceptLanguage) ? "ko" : "en";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
