import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const imageUrl = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: {
      default: "High-Vive — Vibe Coder Benchmark League",
      template: "%s · High-Vive",
    },
    description:
      "바이브코더의 AI 협업 역량을 비교하는 벤치마크, ELO, 티어 리더보드.",
    applicationName: "High-Vive",
    keywords: ["vibe coder", "Codex", "AI benchmark", "leaderboard", "ELO"],
    openGraph: {
      type: "website",
      title: "High-Vive — Vibe Coder Benchmark League",
      description: "Benchmark OVR, provisional ELO, and competitive tiers for vibe coders.",
      images: [{ url: imageUrl, width: 1730, height: 909, alt: "High-Vive TOP 3 benchmark league cards" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "High-Vive — Vibe Coder Benchmark League",
      description: "OVR · ELO · TIER — the competitive benchmark league for vibe coders.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
