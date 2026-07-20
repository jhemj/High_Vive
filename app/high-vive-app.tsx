
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, METRICS } from "../packages/protocol/runtime.mjs";
import { COUNTRY_CODES, countryFlag, countryLabel } from "../packages/shared/countries";
import { PasskeyAuth } from "./passkey-auth";

type Locale = "ko" | "en";
type Platform = "windows" | "macos" | "ubuntu";
type WitnessTool = "codex" | "claude-code";
type BoardMode = "overall" | "category" | "country";
type LocalizedText = { ko: string; en: string };
type Scores = Record<string, number>;

type Passport = {
  id: string;
  handle: string;
  nickname: string;
  displayName: string;
  country: string;
  timezone: string;
  category: string;
  subfields: string[];
  summary: LocalizedText;
  strengths: { ko: string[]; en: string[] };
  weaknesses: { ko: string[]; en: string[] };
  rawScores: Scores;
  calibratedScores: Scores;
  ovr: number;
  hvRating: number;
  tier: string;
  tierDivision: string | null;
  reliabilityScore: number;
  evidenceLevel: string;
  evidenceLabel: string;
  evaluator: { tools?: string[]; model?: string; codexVersion?: string; agentVersion?: string };
  limitations: string[];
  protocolVersion: string;
  isDemo: boolean;
  official: boolean;
  publishedAt: string | null;
  createdAt: string;
};

type AssessmentState = {
  assessment?: { id: string; status: string; expiresAt: string; protocolVersion: string };
  commitment?: { historyRoot: string; sessionCount: number; activeDays: number } | null;
  passport?: { id: string; status: string; hvRating: number; ovr: number; reliabilityScore: number; evidenceLevel: string } | null;
};

type PassportHistoryPoint = {
  id: string;
  hvRating: number;
  ovr: number;
  reliabilityScore: number;
  tier: string;
  tierDivision: string | null;
  category: string;
  evidenceLevel: string;
  publishedAt: string | null;
};

type PassportOverview = {
  current: PassportHistoryPoint | null;
  highest: PassportHistoryPoint | null;
  history: PassportHistoryPoint[];
  latestAssessedAt: string | null;
  nextEligibleAt: string | null;
  canAssessNow: boolean;
};

type CountryRanking = {
  rank: number;
  country: string;
  participants: number;
  averageHvRating: number;
  averageOvr: number;
  averageReliability: number;
  topHvRating: number;
};

type CategoryRanking = {
  rank: number;
  category: string;
  participants: number;
  averageHvRating: number;
  averageOvr: number;
  averageReliability: number;
  topHvRating: number;
};

const copy = {
  ko: {
    benchmark: "HIGH-VIVE · AI WITNESS BENCHMARK",
    title: "바이브코더 리더보드",
    subtitle: "당신과 함께 일한 AI가 평가하는 바이브코딩 실력.",
    official: "OFFICIAL",
    officialHelp: "검증 절차 완료 · 신뢰도 60+ · 최신 평가 기준",
    all: "전체",
    overallBoard: "전체 랭킹",
    categoryBoard: "분야별",
    countryBoard: "국가별",
    countryRank: "국가 대항 순위",
    countryRankHelp: "각 국가 공식 참가자의 평균 HV Rating으로 비교하는 재미용 랭킹입니다.",
    countryPlayerRank: "국가별 개인 랭킹",
    countryPlayerRankHelp: "국가를 선택해 해당 국가 바이브코더의 순위를 확인하세요.",
    viewCountryRank: "국가 순위 보기",
    categoryRank: "분야 대항 순위",
    categoryRankHelp: "각 분야 공식 참가자의 평균 HV Rating으로 비교하는 재미용 랭킹입니다.",
    categoryPlayerRank: "분야별 개인 랭킹",
    categoryPlayerRankHelp: "분야를 선택해 해당 분야 바이브코더의 순위를 확인하세요.",
    viewCategoryRank: "분야 순위 보기",
    country: "국가 / 지역",
    countryPlayers: "참가자 수",
    countryAverage: "평균 HV",
    countryTop: "최고 HV",
    participants: "참가자",
    rankBasis: "순위 기준",
    rank: "순위",
    coder: "바이브코더",
    rating: "HV RATING",
    tier: "잠정 티어",
    ovr: "보정 OVR",
    reliability: "검증 신뢰도",
    evidence: "증거 단계",
    assessed: "평가일",
    strengths: "강점",
    gaps: "보완점",
    attributes: "AI 협업 능력치",
    rawCalibrated: "RAW · CALIBRATED",
    profile: "프로필 열기",
    register: "내 패스포트 등록",
    emptyOfficial: "아직 공식 Passport가 없습니다.",
    emptyBody: "첫 Passport 평가를 시작하고 전 세계 바이브코더들과 실력을 비교해 보세요.",
    methodology: "HIGH-VIVE란?",
    methodTitle: "당신과 함께 일한 AI가 증명하는 Vibe Coding Benchmark",
    methodBody: "High-Vive는 축적된 AI 협업 이력에서 오직 바이브코딩 행동만 평가합니다. 프로젝트 주제·제품명·업종·기술 스택·기능 내용은 진단 문구와 점수에서 제외합니다. 평가 결과는 비교 가능한 HV Rating과 티어로 정리됩니다.",
    steps: [
      ["AUTOMATED LOCAL SCAN", "Codex 또는 Claude Code에 축적된 전체 로컬 작업 이력을 읽기 전용으로 자동 분석합니다. 한 번의 멋진 결과가 아니라 평소의 작업 방식을 봅니다."],
      ["SKILL-ONLY DIAGNOSIS", "로컬 AI가 10개 행동 지표만 점수화합니다. 공개 요약·강점·보완점은 그 점수로 다시 구성되어 프로젝트 내용이 섞이지 않습니다."],
      ["SERVER RATING", "평가 결과를 Passport로 등록하면 전 세계 바이브코더들과 OVR·HV Rating·Reliability·Provisional Tier를 비교할 수 있습니다."],
    ],
    transparency: "평가 범위",
    transparencyBody: "특정 기기와 평가 시점에 발견된 로컬 AI 코딩 에이전트 이력에서 협업 행동만 분석한 AI Witness 평가입니다. 프로젝트 내용, 신원, 전체 업무 이력, 실제 성과 또는 고용 적합성은 평가하지 않습니다.",
    modalTitle: "내 High-Vive Passport 만들기",
    modalLead: "나와 함께 일한 로컬 AI가 작업 이력을 평가하고, 공개 가능한 결과만 Passport와 리더보드에 등록합니다.",
    profileStep: "1. 공개 프로필 만들기",
    cliStep: "2. AI 평가 시작하기",
    publishStep: "3. 리더보드 등록",
    handle: "내 고유 주소 (Handle)",
    handlePlaceholder: "예: vibe_master",
    handleHelp: "프로필 주소에 사용되는 나만의 ID입니다. 영문 소문자·숫자·밑줄(_) 3~24자만 사용할 수 있어요.",
    displayName: "리더보드 닉네임",
    displayNamePlaceholder: "예: 바이브마스터",
    displayNameHelp: "Passport와 리더보드에 크게 표시되는 이름입니다. 한글과 영문 모두 사용할 수 있어요.",
    saveProfile: "프로필 만들고 다음",
    agentChoice: "어떤 AI와 주로 일했나요?",
    detectedEnvironment: "지금 사용 중인 기기",
    changeEnvironment: "다른 기기에서 진행",
    codexStart: "Codex로 평가 시작",
    codexStartHelp: "Codex가 전체 작업 이력을 안전하게 살펴보고 Passport 평가를 진행합니다.",
    claudeStart: "Claude Code로 평가 시작",
    claudeStartHelp: "Claude Code가 전체 작업 이력을 안전하게 살펴보고 Passport 평가를 진행합니다.",
    assessmentNotice: "평가는 작업 이력의 양에 따라 최대 10분 정도 걸릴 수 있습니다. 완료 표시가 나타날 때까지 이 창을 닫지 마세요. 재평가 제한은 실제 Passport 등록 완료 시점부터 7일이며, 오류로 끝난 시도는 차감되지 않습니다.",
    privacyTitle: "내 데이터 보호",
    personalSettings: "내 정보",
    settingsTitle: "내 정보",
    settingsLead: "현재 Passport와 성장 기록을 확인하고 공개 범위와 프로필 설정을 관리하세요.",
    currentPassport: "현재 Passport",
    currentHvRating: "현재 HV Rating",
    currentTier: "현재 티어",
    highestTier: "역대 최고 티어",
    scoreHistory: "점수 변화 이력",
    noScoreHistory: "아직 공개된 Passport 기록이 없습니다.",
    latestAssessment: "최근 평가일",
    nextAssessment: "다음 평가 가능일",
    availableNow: "지금 평가 가능",
    profileSettings: "프로필 설정",
    passportVisibility: "Passport 공개 설정",
    publicPassport: "공개",
    publicPassportHelp: "리더보드, 국가·분야 순위와 공개 프로필에 표시됩니다.",
    privatePassport: "비공개",
    privatePassportHelp: "계정과 평가 기록은 유지하고 모든 공개 순위와 프로필에서 즉시 숨깁니다.",
    dangerZone: "계정 및 데이터 영구 삭제",
    deleteAccount: "계정 영구 삭제",
    deleteAccountHelp: "계정, 로그인 수단, 평가 세션, Passport와 증거 기록을 복구할 수 없게 삭제합니다.",
    deleteConfirmTitle: "정말 모든 데이터를 삭제할까요?",
    deleteConfirmBody: "이 작업은 되돌릴 수 없습니다. 확인하려면 아래에 내 Handle을 정확히 입력하세요.",
    deletePermanent: "모든 데이터 영구 삭제",
    cancel: "취소",
    countryHelp: "리더보드와 국가 랭킹에 표시할 국가 또는 지역을 선택하세요.",
    preferredCategory: "내 대표 분야",
    preferredCategoryHelp: "분야별 리더보드에서 경쟁할 분야입니다. 원본 AI 평가 분야는 Passport 이력에 그대로 보존됩니다.",
    saveChanges: "변경사항 저장",
    terminalFallback: "앱에서 열리지 않나요?",
    terminalHelp: "아래 명령을 복사해 터미널에 붙여넣으면 같은 평가를 시작할 수 있습니다.",
    copyCommand: "평가 명령 복사",
    copied: "복사됨",
    assessmentStatus: "현재 진행 상황",
    waiting: "평가 시작을 기다리고 있어요",
    published: "리더보드 등록 완료",
    close: "닫기",
    signIn: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
    signInButton: "로그인",
    signOut: "로그아웃",
    signedIn: "로그인됨",
    privacy: "대화 원문과 로컬 파일은 내 기기에 그대로 남습니다. 공개하기로 선택한 평가 결과와 확인용 정보만 High-Vive에 등록됩니다.",
    noSelection: "표시할 Passport가 없습니다.",
  },
  en: {
    benchmark: "HIGH-VIVE · AI WITNESS BENCHMARK",
    title: "VIBE CODER LEADERBOARD",
    subtitle: "Vibe-coding skill, evaluated by the AI that works with you.",
    official: "OFFICIAL",
    officialHelp: "Verification complete · Reliability 60+ · Current criteria",
    all: "All",
    overallBoard: "Overall",
    categoryBoard: "Categories",
    countryBoard: "Countries",
    countryRank: "Country standings",
    countryRankHelp: "A just-for-fun ranking based on each country's mean HV Rating across eligible public players.",
    countryPlayerRank: "Players by country",
    countryPlayerRankHelp: "Choose a country to see how its vibe coders rank against one another.",
    viewCountryRank: "View country standings",
    categoryRank: "Category standings",
    categoryRankHelp: "A just-for-fun ranking based on the mean HV Rating of eligible players in each category.",
    categoryPlayerRank: "Players by category",
    categoryPlayerRankHelp: "Choose a category to see how its vibe coders rank against one another.",
    viewCategoryRank: "View category standings",
    country: "Country / region",
    countryPlayers: "Players",
    countryAverage: "Average HV",
    countryTop: "Top HV",
    participants: "Players",
    rankBasis: "Ranked by",
    rank: "Rank",
    coder: "Vibe coder",
    rating: "HV RATING",
    tier: "Provisional Tier",
    ovr: "Calibrated OVR",
    reliability: "Reliability",
    evidence: "Evidence",
    assessed: "Assessed",
    strengths: "Strengths",
    gaps: "Gaps",
    attributes: "AI Collaboration Attributes",
    rawCalibrated: "RAW · CALIBRATED",
    profile: "Open profile",
    register: "Create my Passport",
    emptyOfficial: "No official Passports yet.",
    emptyBody: "Start the first Passport assessment and compare your skills with vibe coders worldwide.",
    methodology: "WHAT IS HIGH-VIVE?",
    methodTitle: "The Vibe Coding Benchmark Witnessed by the AI That Works With You",
    methodBody: "High-Vive evaluates only vibe-coding behaviors across accumulated AI collaboration history. Project topics, product names, industries, technology stacks, and feature content are excluded from both narrative and scoring. The result becomes a comparable HV Rating and tier.",
    steps: [
      ["AUTOMATED LOCAL SCAN", "Your full local Codex or Claude Code work history is analyzed automatically in read-only mode. High-Vive measures how you normally work—not one polished result."],
      ["SKILL-ONLY DIAGNOSIS", "The local AI scores ten behavioral dimensions only. Public summaries, strengths, and growth areas are rebuilt from those scores so project content cannot enter the diagnosis."],
      ["SERVER RATING", "Publish the result as a Passport to compare OVR, HV Rating, Reliability, and Provisional Tier with vibe coders worldwide."],
    ],
    transparency: "Assessment scope",
    transparencyBody: "An AI Witness assessment of collaboration behaviors found in local AI coding-agent history on a specific device at a specific time. Project content, identity, complete work history, real-world outcomes, and hiring fitness are not assessed.",
    modalTitle: "Create My High-Vive Passport",
    modalLead: "The local AI that works with you evaluates your work history. Only the public result is added to your Passport and the leaderboard.",
    profileStep: "1. Create your public profile",
    cliStep: "2. Start your AI assessment",
    publishStep: "3. Join the leaderboard",
    handle: "Your unique URL (Handle)",
    handlePlaceholder: "e.g. vibe_master",
    handleHelp: "Your unique profile ID. Use 3–24 lowercase letters, numbers, or underscores only.",
    displayName: "Leaderboard nickname",
    displayNamePlaceholder: "e.g. Vibe Master",
    displayNameHelp: "The name shown prominently on your Passport and the leaderboard. Any language is welcome.",
    saveProfile: "Create profile and continue",
    agentChoice: "Which AI do you work with most?",
    detectedEnvironment: "Device you're using now",
    changeEnvironment: "Continue on another device",
    codexStart: "Start assessment with Codex",
    codexStartHelp: "Codex safely reviews your full work history and prepares your Passport assessment.",
    claudeStart: "Start assessment with Claude Code",
    claudeStartHelp: "Claude Code safely reviews your full work history and prepares your Passport assessment.",
    assessmentNotice: "The assessment can take up to 10 minutes depending on your history. Keep this window open until completion appears. The seven-day reassessment limit starts only after a Passport is successfully published; failed attempts do not count.",
    privacyTitle: "Your data stays yours",
    personalSettings: "My info",
    settingsTitle: "My info",
    settingsLead: "Review your current Passport and growth history, then manage visibility and profile settings.",
    currentPassport: "Current Passport",
    currentHvRating: "Current HV Rating",
    currentTier: "Current tier",
    highestTier: "All-time highest tier",
    scoreHistory: "Rating history",
    noScoreHistory: "You do not have a published Passport yet.",
    latestAssessment: "Latest assessment",
    nextAssessment: "Next assessment",
    availableNow: "Available now",
    profileSettings: "Profile settings",
    passportVisibility: "Passport visibility",
    publicPassport: "Public",
    publicPassportHelp: "Shown on leaderboards, country and category standings, and your public profile.",
    privatePassport: "Private",
    privatePassportHelp: "Keeps your account and history while immediately hiding them from every public ranking and profile.",
    dangerZone: "Permanently delete account and data",
    deleteAccount: "Permanently delete account",
    deleteAccountHelp: "Permanently removes your account, sign-in methods, assessments, Passports, and evidence records.",
    deleteConfirmTitle: "Delete all of your data?",
    deleteConfirmBody: "This cannot be undone. Enter your exact Handle below to confirm.",
    deletePermanent: "Permanently delete all data",
    cancel: "Cancel",
    countryHelp: "Choose the country or region shown on leaderboards and in country standings.",
    preferredCategory: "My primary category",
    preferredCategoryHelp: "This is where you compete on category leaderboards. Your original AI-assessed category remains in Passport history.",
    saveChanges: "Save changes",
    terminalFallback: "App not opening?",
    terminalHelp: "Copy the command below into your terminal to start the same assessment.",
    copyCommand: "Copy assessment command",
    copied: "Copied",
    assessmentStatus: "Current progress",
    waiting: "Waiting for the assessment to start",
    published: "Added to the leaderboard",
    close: "Close",
    signIn: "Your sign-in session expired. Please sign in again.",
    signInButton: "Sign in",
    signOut: "Sign out",
    signedIn: "Signed in",
    privacy: "Your transcripts and local files stay on your device. High-Vive receives only the assessment result and verification details you choose to publish.",
    noSelection: "No Passport to display.",
  },
} as const;

const metricDescriptions: Record<string, LocalizedText> = {
  contextPackaging: { ko: "목표·배경·자료·제약·완료 기준을 AI가 실행할 수 있게 구성하는 능력", en: "Packages goals, context, evidence, constraints, and completion criteria for execution." },
  aiDelegation: { ko: "AI에게 맡길 일과 사람이 통제할 일을 적절히 분리하는 능력", en: "Divides work appropriately between AI execution and human control." },
  verificationDiscipline: { ko: "테스트·원천 근거·실행 결과로 AI 산출물을 검증하는 습관", en: "Checks AI output against tests, primary evidence, and execution results." },
  iterationQuality: { ko: "중간 결과를 관찰해 후속 지시를 정밀하게 개선하는 능력", en: "Turns intermediate results into precise, quality-improving follow-ups." },
  outcomeYield: { ko: "대화를 실제 사용 가능한 결과물로 완성하는 일관성", en: "Consistently converts AI collaboration into usable outcomes." },
  toolFluency: { ko: "파일·터미널·Git·브라우저·데이터 도구를 연결하는 능력", en: "Connects files, terminals, Git, browsers, and data tools." },
  domainClarity: { ko: "업무 분야의 맥락·용어·제약·품질 기준을 이해하고, AI의 도메인 오류를 발견·교정하는 능력", en: "Understands domain context, terminology, constraints, and quality standards, and catches domain-specific AI errors." },
  communicationQuality: { ko: "의도·우선순위·피드백·인수인계를 오해 없이 전달하는 능력", en: "Communicates intent, priorities, feedback, and handoffs clearly." },
  creativity: { ko: "제약에 맞는 새로운 구조와 실용적 대안을 탐색하는 능력", en: "Explores novel structures and practical alternatives under constraints." },
  tokenEfficiency: { ko: "토큰 대비 검증된 결과물과 개선 폭. 적게 쓰는 것 자체는 고득점이 아님", en: "Validated output and improvement per token; low use alone does not score high." },
};

const tierKo: Record<string, string> = {
  Iron: "아이언", Bronze: "브론즈", Silver: "실버", Gold: "골드", Platinum: "플래티넘",
  Emerald: "에메랄드", Diamond: "다이아몬드", Master: "마스터", Grandmaster: "그랜드마스터", Challenger: "챌린저",
};

function localized(value: LocalizedText | undefined, locale: Locale) {
  return value?.[locale] || value?.en || value?.ko || "";
}

function categoryLabel(category: string, locale: Locale) {
  const item = CATEGORIES.find((candidate) =>…6207 tokens truncated…me="country-board-intro"><div><strong>{t.countryPlayerRank}</strong><p>{t.countryPlayerRankHelp}</p></div><button className="button button-outline" type="button" onClick={() => setStandingsView("country")}>{t.viewCountryRank}</button></div>
              <div className="field-tabs aggregate-filter-tabs" aria-label={locale === "ko" ? "국가 선택" : "Country filter"}>{countries.map((nation) => <button key={nation.country} className={selectedCountry === nation.country ? "is-active" : ""} onClick={() => setSelectedCountry(nation.country)}>{countryFlag(nation.country)} {countryLabel(nation.country, locale).replace(/^\S+\s/, "")}</button>)}</div>
            </> : null}

            {!loading && visible.length === 0 ? (
              <div className="leaderboard-empty">
                <span>{t.official} · HV / 000</span><h2>{t.emptyOfficial}</h2><p>{t.emptyBody}</p>
                <button className="button button-primary" onClick={openComposer}>{t.register}</button>
              </div>
            ) : null}

            {podium.length ? <div className="podium-grid" aria-label="Top three">
              {podium.map((passport) => {
                const rank = visible.findIndex((item) => item.id === passport.id) + 1;
                return <button key={passport.id} className={`player-card rank-${rank} ${passport.id === selected?.id ? "is-selected" : ""}`} data-card-tier={passport.tier.toLowerCase()} onClick={() => setSelectedId(passport.id)}>
                  <span className="card-rank">#{rank}</span><span className="card-overall">{passport.hvRating}</span><span className="card-position">HV RATING</span>
                  <span className="card-avatar">{passport.handle.slice(0, 2).toUpperCase()}</span><span className="card-name">{passport.displayName}</span><span className="card-country">{countryLabel(passport.country, locale) || (locale === "ko" ? "국가 미설정" : "Country not set")}</span>
                  <ToolBadges tools={passport.evaluator.tools} /><span className="card-field">{categoryLabel(passport.category, locale)}</span>
                  <span className="card-tier" data-tier={passport.tier.toLowerCase()}>{tierLabel(passport.tier, locale).toUpperCase()} {passport.tierDivision || ""}</span>
                  <span className={`evidence-badge ${evidenceClass(passport.evidenceLevel)}`}>{passport.isDemo ? "DEMO" : passport.evidenceLabel}</span>
                  <span className="card-elo">OVR {passport.ovr.toFixed(1)} · REL {passport.reliabilityScore.toFixed(1)}</span>
                </button>;
              })}
            </div> : null}

            {visible.length ? <div className="ranking-table-shell">
              <div className="ranking-table-head"><span>{t.rank}</span><span>{t.coder}</span><span>{t.rating}</span><span>{t.tier}</span><span>{t.ovr}</span><span>{t.reliability}</span><span>{t.assessed}</span></div>
              <ol className="ranking-table">{visible.map((passport, index) => <li key={passport.id} className={passport.id === selected?.id ? "is-selected" : ""}>
                <button onClick={() => setSelectedId(passport.id)}>
                  <span className="table-rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="table-trainer"><span className="mini-shield">{passport.handle.slice(0, 2).toUpperCase()}</span><span><strong>{passport.displayName}</strong><small>@{passport.handle} · {countryLabel(passport.country, locale) || (locale === "ko" ? "국가 미설정" : "Country not set")} · {passport.evidenceLabel}</small><ToolBadges tools={passport.evaluator.tools} /></span></span>
                  <strong className="table-elo">{passport.hvRating}</strong>
                  <span className="table-tier" data-tier={passport.tier.toLowerCase()}>{tierLabel(passport.tier, locale)} {passport.tierDivision || ""}<small>{categoryLabel(passport.category, locale)}</small></span>
                  <strong className="table-score">{passport.ovr.toFixed(1)}</strong><span className="table-reliability">{passport.reliabilityScore.toFixed(1)}</span>
                  <time className="table-date">{dateLabel(passport.publishedAt || passport.createdAt, locale)}</time>
                </button>
              </li>)}</ol>
            </div> : null}
          </div>

          <aside className="scout-panel" aria-label="Passport details">
            {selected ? <>
              <div className="scout-status"><span>AI WITNESS PASSPORT</span><b className={evidenceClass(selected.evidenceLevel)}>● {selected.evidenceLabel}</b></div>
              <div className="scout-identity"><div className="scout-avatar">{selected.handle.slice(0, 2).toUpperCase()}</div><div><span>{categoryLabel(selected.category, locale)}</span><h2>{selected.displayName}</h2><p>@{selected.handle} · {countryLabel(selected.country, locale) || (locale === "ko" ? "국가 미설정" : "Country not set")} · {selected.protocolVersion}</p></div><div className="scout-overall"><strong>{selected.hvRating}</strong><span>HV RATING</span></div></div>
              <div className="scout-badges"><strong>{t.reliability} {selected.reliabilityScore.toFixed(1)}</strong><span className={`evidence-badge ${evidenceClass(selected.evidenceLevel)}`}>{selected.evidenceLevel} · {selected.evidenceLabel}</span><ToolBadges tools={selected.evaluator.tools} /></div>
              <div className="scout-tier-row"><span className="tier-crest" data-tier={selected.tier.toLowerCase()}>{selected.tier.slice(0, 1)}</span><div><span>{t.tier}</span><strong>{tierLabel(selected.tier, locale).toUpperCase()} {selected.tierDivision || ""}</strong></div><div><span>{t.ovr}</span><strong>{selected.ovr.toFixed(1)} / 100</strong></div></div>
              <blockquote>“{localized(selected.summary, locale)}”</blockquote>
              <div className="assessment-split"><section className="assessment-strengths"><h3>{t.strengths}</h3><ul>{selected.strengths[locale].map((item) => <li key={item}>{item}</li>)}</ul></section><section className="assessment-weaknesses"><h3>{t.gaps}</h3><ul>{selected.weaknesses[locale].map((item) => <li key={item}>{item}</li>)}</ul></section></div>
              <div className="attribute-title"><span>{t.attributes}</span><b>{t.rawCalibrated}</b></div>
              <div className="attribute-grid">{METRICS.map((metric) => <button className="attribute" key={metric.key} type="button" aria-label={`${metric[locale]} raw ${selected.rawScores[metric.key]}, calibrated ${selected.calibratedScores[metric.key]}. ${metricDescriptions[metric.key][locale]}`}>
                <strong>{selected.rawScores[metric.key]?.toFixed(0) || "--"}</strong><span>{metric[locale]} <b>C{selected.calibratedScores[metric.key]?.toFixed(1) || "--"}</b></span><i><i style={{ width: `${selected.calibratedScores[metric.key] || 0}%` }} /></i>
                <span className="attribute-tooltip" role="tooltip"><b>{metric[locale]}</b>{metricDescriptions[metric.key][locale]}<em>RAW {selected.rawScores[metric.key]?.toFixed(0)} · CALIBRATED {selected.calibratedScores[metric.key]?.toFixed(1)}</em></span>
              </button>)}</div>
              <dl className="scout-evidence"><div><dt>{t.evidence}</dt><dd>{selected.evidenceLevel} · {selected.evidenceLabel}</dd></div><div><dt>{t.reliability}</dt><dd>{selected.reliabilityScore.toFixed(1)} / 100</dd></div><div><dt>{t.assessed}</dt><dd>{dateLabel(selected.publishedAt || selected.createdAt, locale)}</dd></div></dl>
              <a className="button button-outline profile-link" href={`/u/${selected.handle}`}>{t.profile}</a>
              <p className="scout-disclaimer">{t.transparencyBody}</p>
            </> : <div className="scout-empty"><span>HV</span><p>{t.noSelection}</p></div>}
          </aside>
        </section>

        <section className="protocol-section" aria-labelledby="method-title"><div className="protocol-intro"><p className="eyebrow">{t.methodology}</p><h2 id="method-title">{t.methodTitle}</h2><p>{t.methodBody}</p></div><ol className="protocol-steps">{t.steps.map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol></section>
      </main>

      <footer className="site-footer"><p><strong>{t.transparency}</strong> {t.transparencyBody}</p></footer>

      {standingsView ? <div className="modal-backdrop"><section className="passport-modal standings-modal" role="dialog" aria-modal="true" aria-labelledby="standings-title">
        <div className="modal-heading"><div><p className="eyebrow">HIGH-VIVE FUN LEAGUE</p><h2 id="standings-title">{standingsView === "country" ? t.countryRank : t.categoryRank}</h2><p>{standingsView === "country" ? t.countryRankHelp : t.categoryRankHelp}</p></div><button className="modal-close" aria-label={t.close} onClick={() => setStandingsView(null)}>×</button></div>
        {standingsRows.length ? <><div className="medal-standings">{medalStandings.map((item) => <article className={`medal-card medal-rank-${item.rank}`} key={item.key}><span>{item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}</span><b>{item.icon}</b><h3>{item.label}</h3><strong>{item.averageHvRating.toFixed(1)}</strong><small>{item.participants} {t.countryPlayers}</small></article>)}</div><ol className="standings-list">{standingsRows.map((item) => <li key={item.key}><b>{String(item.rank).padStart(2, "0")}</b><span>{item.icon}</span><strong>{item.label}</strong><em>{item.averageHvRating.toFixed(1)}</em><small>{item.participants} {t.countryPlayers} · TOP {item.topHvRating}</small></li>)}</ol></> : <div className="leaderboard-empty"><h2>{t.emptyOfficial}</h2></div>}
      </section></div> : null}

      {composerOpen ? <div className="modal-backdrop"><section className="passport-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <div className="modal-heading"><div><p className="eyebrow">{t.register}</p><h2 id="composer-title">{t.modalTitle}</h2><p>{t.modalLead}</p></div><button className="modal-close" aria-label={t.close} onClick={() => setComposerOpen(false)}>×</button></div>
        {!authChecked ? <div className="auth-loading">…</div> : !viewer ? <PasskeyAuth locale={locale} onAuthenticated={refreshViewer} /> : <><div className="onboarding-steps">
          <section className={profileReady ? "is-complete" : "is-active"}><span>01</span><h3>{t.profileStep}</h3>
            <form onSubmit={saveProfile}><label><span>{t.handle}</span><input value={handle} placeholder={t.handlePlaceholder} onChange={(event) => setHandle(event.target.value.toLowerCase())} pattern="[a-z0-9_]{3,24}" maxLength={24} required /><small>{t.handleHelp}</small></label><label><span>{t.displayName}</span><input value={displayName} placeholder={t.displayNamePlaceholder} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required /><small>{t.displayNameHelp}</small></label><button className="button button-outline" disabled={busy}>{t.saveProfile}</button></form>
          </section>
          <section className={assessmentState?.assessment ? "is-complete" : profileReady ? "is-active" : ""}><span>02</span><h3>{t.cliStep}</h3>
            <p className="environment-detected"><b>{t.agentChoice}</b><span>{witnessTool === "codex" ? "Codex" : "Claude Code"}</span></p>
            <div className="platform-switch agent-switch" role="tablist" aria-label={t.agentChoice}>{(["codex", "claude-code"] as WitnessTool[]).map((item) => <button key={item} type="button" role="tab" aria-selected={witnessTool === item} className={witnessTool === item ? "is-active" : ""} onClick={() => setWitnessTool(item)}>{item === "codex" ? "Codex" : "Claude Code"}</button>)}</div>
            <p className="environment-detected"><b>{t.detectedEnvironment}</b><span>{platformLabels[platform]}</span></p>
            <div className="platform-switch" role="tablist" aria-label={t.changeEnvironment}>{(["windows", "macos", "ubuntu"] as Platform[]).map((item) => <button key={item} type="button" role="tab" aria-selected={platform === item} className={platform === item ? "is-active" : ""} onClick={() => setPlatform(item)}>{platformLabels[item]}</button>)}</div>
            {witnessTool === "codex" && platform !== "ubuntu" && profileReady ? <a className="button button-primary codex-launch" href={codexDeepLink}>{t.codexStart}</a> : null}
            {witnessTool === "codex" && platform !== "ubuntu" ? <small className="launch-help">{t.codexStartHelp}</small> : null}
            {witnessTool === "claude-code" && profileReady ? <a className="button button-primary codex-launch" href={claudeDeepLink}>{t.claudeStart}</a> : null}
            {witnessTool === "claude-code" ? <small className="launch-help">{t.claudeStartHelp}</small> : null}
            <p className="assessment-notice"><strong>{locale === "ko" ? "잠깐!" : "Please note"}</strong>{t.assessmentNotice}</p>
            <div className="terminal-option"><b>{t.terminalFallback}</b><small>{t.terminalHelp}</small><pre className="cli-command">{terminalCommand}</pre><button className="button button-outline" type="button" disabled={!profileReady} onClick={copyCommand}>{copied ? t.copied : t.copyCommand}</button></div>
            <p className="assessment-live"><b>{t.assessmentStatus}</b><span>{friendlyAssessmentStatus(assessmentState?.assessment?.status, locale)}</span><small>{assessmentState?.commitment ? (locale === "ko" ? `${assessmentState.commitment.sessionCount}개 작업 세션 · ${assessmentState.commitment.activeDays}일간 활동` : `${assessmentState.commitment.sessionCount} work sessions · ${assessmentState.commitment.activeDays} active days`) : t.waiting}</small></p>
          </section>
          <section className={assessmentState?.passport?.status === "PUBLISHED" ? "is-complete" : assessmentState?.passport ? "is-active" : ""}><span>03</span><h3>{t.publishStep}</h3>
            {assessmentState?.passport ? <div className="publish-preview"><dl><div><dt>HV RATING</dt><dd>{assessmentState.passport.hvRating}</dd></div><div><dt>OVR</dt><dd>{assessmentState.passport.ovr}</dd></div><div><dt>REL</dt><dd>{assessmentState.passport.reliabilityScore}</dd></div><div><dt>EVIDENCE</dt><dd>{assessmentState.passport.evidenceLevel}</dd></div></dl><strong className="auto-published">{friendlyAssessmentStatus(assessmentState.passport.status, locale)}</strong></div> : <p>{t.waiting}</p>}
          </section>
        </div>
        <p className="privacy-note"><strong>{t.privacyTitle}</strong> {t.privacy}</p>{message ? <p className="form-message" role="status">{message}</p> : null}</>}
      </section></div> : null}
      {settingsOpen && viewer ? <div className="modal-backdrop"><section className="passport-modal settings-modal my-info-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-heading"><div><p className="eyebrow">@{handle} · {profileIsPublic ? t.publicPassport : t.privatePassport}</p><h2 id="settings-title">{t.settingsTitle}</h2><p>{t.settingsLead}</p></div><button className="modal-close" aria-label={t.close} onClick={() => { setSettingsOpen(false); setDeleteConfirmOpen(false); setDeleteConfirmation(""); }}>×</button></div>
        <section className="my-passport-overview" aria-labelledby="my-passport-title">
          <div className="settings-section-heading"><p className="eyebrow">MY HIGH-VIVE</p><h3 id="my-passport-title">{t.currentPassport}</h3></div>
          {passportOverview.current ? <>
            <dl className="my-passport-stats">
              <div><dt>{t.currentHvRating}</dt><dd>{passportOverview.current.hvRating}</dd></div>
              <div><dt>{t.currentTier}</dt><dd>{tierLabel(passportOverview.current.tier, locale)} {passportOverview.current.tierDivision || ""}</dd></div>
              <div><dt>{t.highestTier}</dt><dd>{passportOverview.highest ? `${tierLabel(passportOverview.highest.tier, locale)} ${passportOverview.highest.tierDivision || ""}` : "--"}</dd></div>
              <div><dt>OVR · {t.reliability}</dt><dd>{passportOverview.current.ovr.toFixed(1)} · {passportOverview.current.reliabilityScore.toFixed(1)}</dd></div>
            </dl>
            <div className="rating-history-heading"><strong>{t.scoreHistory}</strong><span>{passportOverview.history.length} PASSPORT{passportOverview.history.length === 1 ? "" : "S"}</span></div>
            <RatingHistoryChart history={passportOverview.history} locale={locale} />
            <dl className="assessment-dates"><div><dt>{t.latestAssessment}</dt><dd>{dateLabel(passportOverview.latestAssessedAt, locale)}</dd></div><div><dt>{t.nextAssessment}</dt><dd>{passportOverview.canAssessNow ? t.availableNow : dateLabel(passportOverview.nextEligibleAt, locale)}</dd></div></dl>
          </> : <div className="my-info-empty"><p>{t.noScoreHistory}</p><button className="button button-outline" type="button" onClick={openComposer}>{t.register}</button></div>}
        </section>
        <form className="profile-settings-form" onSubmit={saveSettings}>
          <div className="settings-section-heading"><p className="eyebrow">PROFILE</p><h3>{t.profileSettings}</h3></div>
          <label><span>{t.country}</span><select value={country} onChange={(event) => setCountry(event.target.value)} required><option value="">{locale === "ko" ? "국가 또는 지역 선택" : "Choose a country or region"}</option>{countryOptions.map((code) => <option value={code} key={code}>{countryLabel(code, locale)}</option>)}</select><small>{t.countryHelp}</small></label>
          <label><span>{t.preferredCategory}</span><select value={profileCategory} onChange={(event) => setProfileCategory(event.target.value)}><option value="">{locale === "ko" ? "AI 평가 분야 사용" : "Use my AI-assessed category"}</option>{CATEGORIES.map((item) => <option value={item.key} key={item.key}>{item[locale]}</option>)}</select><small>{t.preferredCategoryHelp}</small></label>
          <fieldset className="visibility-settings"><legend>{t.passportVisibility}</legend><div className="visibility-options">
            <label className={profileIsPublic ? "is-selected" : ""}><input type="radio" name="passport-visibility" checked={profileIsPublic} onChange={() => setProfileIsPublic(true)} /><span><b>{t.publicPassport}</b><small>{t.publicPassportHelp}</small></span></label>
            <label className={!profileIsPublic ? "is-selected" : ""}><input type="radio" name="passport-visibility" checked={!profileIsPublic} onChange={() => setProfileIsPublic(false)} /><span><b>{t.privatePassport}</b><small>{t.privatePassportHelp}</small></span></label>
          </div></fieldset>
          <div className="settings-actions"><button className="button button-primary" disabled={busy}>{t.saveChanges}</button><button className="button button-quiet" type="button" onClick={signOut}>{t.signOut}</button></div>
        </form>
        <section className="danger-zone" aria-labelledby="danger-title"><div><h3 id="danger-title">{t.dangerZone}</h3><p>{t.deleteAccountHelp}</p></div>
          {!deleteConfirmOpen ? <button className="button button-danger" type="button" onClick={() => setDeleteConfirmOpen(true)}>{t.deleteAccount}</button> : <div className="delete-confirmation"><strong>{t.deleteConfirmTitle}</strong><p>{t.deleteConfirmBody}</p><label><span>@{handle}</span><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value.toLowerCase())} autoComplete="off" spellCheck={false} /></label><div className="settings-actions"><button className="button button-danger" type="button" disabled={busy || deleteConfirmation !== handle} onClick={deleteAccount}>{t.deletePermanent}</button><button className="button button-quiet" type="button" onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmation(""); }}>{t.cancel}</button></div></div>}
        </section>
        {message ? <p className="form-message" role="status">{message}</p> : null}
      </section></div> : null}
    </div>
  );
}
