"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES, METRICS } from "../../../packages/protocol/runtime.mjs";

type ProfileData = {
  profile: { handle: string; displayName: string; bio: string; country: string; timezone: string };
  currentPassport: ProfilePassport | null;
  passports: ProfilePassport[];
};

type ProfilePassport = {
  id: string;
  handle: string;
  category: string;
  evidenceLevel: string;
  evidenceLabel: string;
  hvRating: number;
  ovr: number;
  reliabilityScore: number;
  summary: Record<"ko" | "en", string>;
  strengths: Record<"ko" | "en", string[]>;
  weaknesses: Record<"ko" | "en", string[]>;
  rawScores: Record<string, number>;
  calibratedScores: Record<string, number>;
  protocolVersion: string;
  evaluator: { model?: string; codexVersion?: string };
  limitations: string[];
  publishedAt: string | null;
  createdAt: string;
};

export function ProfileClient({ handle, locale }: { handle: string; locale: "ko" | "en" }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/v1/profiles/${encodeURIComponent(handle)}`).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Profile not found");
      setData(result);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [handle]);
  if (error) return <main className="profile-page"><section className="profile-empty"><h1>404</h1><p>{error}</p><Link className="button button-outline" href="/">High-Vive</Link></section></main>;
  if (!data) return <main className="profile-page"><section className="profile-empty"><p>LOADING PASSPORT…</p></section></main>;
  const passport = data.currentPassport;
  if (!passport) return <main className="profile-page"><section className="profile-empty"><h1>@{data.profile.handle}</h1><p>{locale === "ko" ? "공개된 Passport가 없습니다." : "No published Passport yet."}</p><Link className="button button-outline" href="/">High-Vive</Link></section></main>;
  const category = CATEGORIES.find((item) => item.key === passport.category);
  const maxRating = Math.max(1, ...data.passports.map((item) => item.hvRating));
  return <main className="profile-page">
    <header className="profile-header"><Link className="brand" href="/"><span className="brand-mark">HV</span><span className="brand-word">HIGH-VIVE</span></Link><Link className="button button-outline" href="/">LEADERBOARD</Link></header>
    <section className="profile-hero"><div className="profile-avatar">{passport.handle.slice(0, 2).toUpperCase()}</div><div><p className="eyebrow">{passport.evidenceLevel} · {passport.evidenceLabel}</p><h1>{data.profile.displayName}</h1><p>@{data.profile.handle} · {category?.[locale] || passport.category}</p><p>{data.profile.bio}</p></div><dl><div><dt>HV RATING</dt><dd>{passport.hvRating}</dd></div><div><dt>CALIBRATED OVR</dt><dd>{passport.ovr.toFixed(1)}</dd></div><div><dt>RELIABILITY</dt><dd>{passport.reliabilityScore.toFixed(1)}</dd></div></dl></section>
    <section className="profile-grid"><article className="profile-card narrative-card"><p className="eyebrow">CODEX WITNESS</p><blockquote>“{passport.summary[locale]}”</blockquote><div className="assessment-split"><section><h2>{locale === "ko" ? "강점" : "Strengths"}</h2><ul>{passport.strengths[locale].map((item: string) => <li key={item}>{item}</li>)}</ul></section><section><h2>{locale === "ko" ? "보완점" : "Gaps"}</h2><ul>{passport.weaknesses[locale].map((item: string) => <li key={item}>{item}</li>)}</ul></section></div></article>
      <article className="profile-card metrics-card"><p className="eyebrow">RAW / CALIBRATED</p><div className="profile-metrics">{METRICS.map((metric) => <div key={metric.key}><span>{metric[locale]}</span><b>{passport.rawScores[metric.key].toFixed(0)}</b><i><i style={{ width: `${passport.calibratedScores[metric.key]}%` }} /></i><small>C{passport.calibratedScores[metric.key].toFixed(1)}</small></div>)}</div></article>
      <article className="profile-card history-card"><p className="eyebrow">PASSPORT HISTORY</p><h2>{locale === "ko" ? "성장 기록" : "Growth history"}</h2><div className="growth-bars">{[...data.passports].reverse().map((item) => <div key={item.id} title={`${item.hvRating}`}><i style={{ height: `${Math.max(8, item.hvRating / maxRating * 100)}%` }} /><span>{item.hvRating}</span><small>{new Date(item.publishedAt || item.createdAt).toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { month: "short", year: "2-digit" })}</small></div>)}</div></article>
      <article className="profile-card evidence-card"><p className="eyebrow">EVIDENCE & LIMITS</p><dl><div><dt>LEVEL</dt><dd>{passport.evidenceLevel} · {passport.evidenceLabel}</dd></div><div><dt>PROTOCOL</dt><dd>{passport.protocolVersion}</dd></div><div><dt>MODEL</dt><dd>{passport.evaluator.model || "Codex"}</dd></div><div><dt>CODEX</dt><dd>{passport.evaluator.codexVersion || "reported locally"}</dd></div></dl><ul>{passport.limitations.map((item: string) => <li key={item}>{item}</li>)}</ul></article>
    </section>
    <footer className="site-footer"><p>{locale === "ko" ? "특정 기기와 시점에 발견된 로컬 Codex 이력 기반 AI Witness 평가입니다. 신원·전체 이력·실제 성과를 보증하지 않습니다." : "An AI Witness assessment of local Codex history found on one device at one time. It does not prove identity, complete history, or real-world outcomes."}</p></footer>
  </main>;
}
