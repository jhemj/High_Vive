import type { Metadata } from "next";
import { HighViveApp } from "./high-vive-app";

export const metadata: Metadata = {
  title: "High-Vive — 바이브코더 벤치마크 리그",
  description:
    "Codex 활용 역량을 8개 지표, Benchmark OVR, ELO, 경쟁 티어로 비교하는 바이브코더 리그입니다.",
};

export default function Home() {
  return <HighViveApp />;
}
