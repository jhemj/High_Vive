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
    methodBody: "High-Vive는 축적된 AI 협업 이력에서 실제 작업 방식을 평가합니다. 평가 결과는 비교 가능한 HV Rating과 티어로 정리되며, 새 Passport가 등록될 때 리그 순위가 갱신됩니다. 오래된 평가의 신뢰도는 시간이 지나면 서서히 낮아집니다.",
    steps: [
      ["AUTOMATED LOCAL SCAN", "Codex 또는 Claude Code에 축적된 전체 로컬 작업 이력을 읽기 전용으로 자동 분석합니다. 한 번의 멋진 결과가 아니라 평소의 작업 방식을 봅니다."],
      ["YOUR AI KNOWS YOUR VIBE", "당신과 실제로 일해 온 로컬 AI가 10개 지표로 Vibe Coding 역량을 평가하고, 강점과 보완점, 근거와 한계를 함께 설명합니다."],
      ["SERVER RATING", "평가 결과를 Passport로 등록하면 전 세계 바이브코더들과 OVR·HV Rating·Reliability·Provisional Tier를 비교할 수 있습니다."],
    ],
    transparency: "평가 범위",
    transparencyBody: "특정 기기와 평가 시점에 발견된 로컬 AI 코딩 에이전트 이력을 분석한 AI Witness 평가입니다. 신원, 전체 업무 이력, 실제 성과 또는 고용 적합성을 보증하지 않습니다.",
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
    personalSettings: "개인 설정",
    settingsTitle: "프로필 설정",
    settingsLead: "표시할 국가와 리더보드 대표 분야를 언제든 바꿀 수 있습니다. 국가와 분야 선택은 개인 실력 점수를 바꾸지 않습니다.",
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
    methodBody: "High-Vive benchmarks how you actually work across accumulated AI collaboration history. Your result becomes a comparable HV Rating and tier, and the league updates whenever a new Passport is published. The reliability of older assessments gradually decreases over time.",
    steps: [
      ["AUTOMATED LOCAL SCAN", "Your full local Codex or Claude Code work history is analyzed automatically in read-only mode. High-Vive measures how you normally work—not one polished result."],
      ["YOUR AI KNOWS YOUR VIBE", "The local AI that has actually worked with you evaluates your Vibe Coding across ten dimensions and explains your strengths, growth areas, evidence, and limits."],
      ["SERVER RATING", "Publish the result as a Passport to compare OVR, HV Rating, Reliability, and Provisional Tier with vibe coders worldwide."],
    ],
    transparency: "Assessment scope",
    transparencyBody: "An AI Witness assessment of local AI coding-agent history found on a specific device at a specific time. It does not prove identity, complete work history, real-world outcomes, or hiring fitness.",
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
    personalSettings: "Settings",
    settingsTitle: "Profile settings",
    settingsLead: "Change the country shown on your profile and the primary category where you compete. Neither choice changes your individual skill score.",
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
  domainClarity: { ko: "업무 분야와 세부 맥락·용어·기준을 명확하게 정의하는 능력", en: "Defines the work domain, terminology, context, and standards clearly." },
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
  const item = CATEGORIES.find((candidate) => candidate.key === category);
  return item?.[locale] || category;
}

function tierLabel(tier: string, locale: Locale) {
  return locale === "ko" ? tierKo[tier] || tier : tier;
}

function dateLabel(value: string | null, locale: Locale) {
  if (!value) return "--";
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function evidenceClass(level: string) {
  return `evidence-${level.toLowerCase()}`;
}

const platformLabels: Record<Platform, string> = { windows: "Windows", macos: "macOS", ubuntu: "Ubuntu" };
const DEFAULT_SERVER = "https://high-vive-league.ngmptdz.chatgpt.site";
const LEADERBOARD_CACHE_KEY = "league-v13";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "windows";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const value = `${nav.userAgentData?.platform || ""} ${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
  if (value.includes("mac")) return "macos";
  if (value.includes("linux") || value.includes("ubuntu")) return "ubuntu";
  return "windows";
}

function friendlyAssessmentStatus(status: string | undefined, locale: Locale) {
  if (!status) return locale === "ko" ? "평가 시작을 기다리고 있어요" : "Waiting for the assessment to start";
  const labels: Record<string, LocalizedText> = {
    DRAFT: { ko: "평가 준비 중", en: "Preparing your assessment" },
    COMMITTED: { ko: "작업 이력 확인 완료", en: "Work history confirmed" },
    CHALLENGED: { ko: "AI가 작업 이력을 평가하는 중", en: "Your AI is evaluating your work history" },
    ASSESSED: { ko: "평가 결과 준비 완료", en: "Assessment result ready" },
    SUBMITTED: { ko: "리더보드 등록 처리 중", en: "Adding your result to the leaderboard" },
    PUBLISHED: { ko: "리더보드 등록 완료", en: "Added to the leaderboard" },
    EXPIRED: { ko: "평가 시간이 지나 다시 시작해야 해요", en: "This assessment expired—please start again" },
    FAILED: { ko: "평가를 완료하지 못했어요", en: "The assessment could not be completed" },
    CANCELLED: { ko: "평가가 취소됐어요", en: "Assessment cancelled" },
    REVOKED: { ko: "공개가 중단된 평가예요", en: "This assessment is no longer published" },
  };
  return labels[status]?.[locale] || status;
}

function ToolBadges({ tools = [] }: { tools?: string[] }) {
  const normalized = Array.from(new Set(tools.length ? tools : ["codex"]));
  return <span className="tool-badges">{normalized.map((tool) => <b className={`tool-badge tool-${tool}`} key={tool} title={tool === "codex" ? "Codex" : tool}>{tool === "codex" ? "CX" : tool === "claude-code" ? "CL" : tool.slice(0, 2).toUpperCase()}</b>)}</span>;
}

export function HighViveApp({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [boardMode, setBoardMode] = useState<BoardMode>("overall");
  const [category, setCategory] = useState("__all__");
  const [passports, setPassports] = useState<Passport[]>([]);
  const [participantTotal, setParticipantTotal] = useState(0);
  const [leaderboardVersion, setLeaderboardVersion] = useState(0);
  const [countries, setCountries] = useState<CountryRanking[]>([]);
  const [categoryStandings, setCategoryStandings] = useState<CategoryRanking[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [standingsView, setStandingsView] = useState<"country" | "category" | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewer, setViewer] = useState<{ id: string; displayName: string; provider: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [profileCategory, setProfileCategory] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [assessmentState, setAssessmentState] = useState<AssessmentState | null>(null);
  const [platform, setPlatform] = useState<Platform>("windows");
  const [witnessTool, setWitnessTool] = useState<WitnessTool>("codex");
  const [serverOrigin, setServerOrigin] = useState(DEFAULT_SERVER);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = copy[locale];
  const categoryFilter = boardMode === "category" && category !== "__all__" ? category : "";
  const countryFilter = boardMode === "country" ? selectedCountry : "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("high-vive-locale");
      if (stored === "ko" || stored === "en") setLocale(stored);
      setPlatform(detectPlatform());
      setServerOrigin(window.location.origin);
      const params = new URLSearchParams(window.location.search);
      if (params.get("passport") === "1") {
        setComposerOpen(true);
        params.delete("passport");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refreshViewer = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/me", { headers: { "x-high-vive-locale": locale }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setViewer(null);
        return;
      }
      setViewer(result.user);
      if (result.profile) {
        setHandle(result.profile.handle);
        setDisplayName(result.profile.displayName);
        setCountry(result.profile.country || result.suggestedCountry || "");
        setProfileCategory(result.profile.preferredCategory || "");
        setProfileReady(true);
      } else {
        setCountry(result.suggestedCountry || "");
      }
      setAssessmentState(result.latestAssessment || null);
    } catch {
      setViewer(null);
    } finally {
      setAuthChecked(true);
    }
  }, [locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshViewer(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshViewer]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ pageSize: "100", v: `${LEADERBOARD_CACHE_KEY}-${leaderboardVersion}` });
    if (categoryFilter) params.set("category", categoryFilter);
    if (countryFilter) params.set("country", countryFilter);
    fetch(`/api/v1/leaderboards?${params}`, { headers: { "x-high-vive-locale": locale } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error?.message || "Leaderboard unavailable");
        if (active) {
          setPassports(result.passports || []);
          setParticipantTotal(Number(result.pagination?.total || 0));
          setCountries(result.countries || []);
          setCategoryStandings(result.categoryStandings || []);
          setSelectedCountry((current) => result.countries?.some((item: CountryRanking) => item.country === current) ? current : result.countries?.[0]?.country || "");
          setSelectedId((current) => result.passports?.some((item: Passport) => item.id === current) ? current : result.passports?.[0]?.id || "");
        }
      })
      .catch((error) => active && setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [locale, assessmentState?.passport?.status, leaderboardVersion, categoryFilter, countryFilter]);

  useEffect(() => {
    const viewerId = viewer?.id;
    if (!composerOpen || !viewerId) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/v1/me", { headers: { "x-high-vive-locale": locale }, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 401) setViewer(null);
          throw new Error(result?.error?.message || t.signIn);
        }
        if (!active) return;
        if (result.profile) {
          setHandle(result.profile.handle);
          setDisplayName(result.profile.displayName);
          setCountry(result.profile.country || result.suggestedCountry || "");
          setProfileCategory(result.profile.preferredCategory || "");
          setProfileReady(true);
        }
        setAssessmentState(result.latestAssessment || null);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : t.signIn);
      }
    };
    void poll();
    const timer = window.setInterval(poll, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [composerOpen, locale, t.signIn, viewer?.id]);

  const visible = useMemo(() => {
    if (boardMode === "category") return passports.filter((passport) => passport.category === category);
    if (boardMode === "country") return passports.filter((passport) => passport.country === selectedCountry);
    return passports;
  }, [boardMode, category, passports, selectedCountry]);
  const selected = visible.find((passport) => passport.id === selectedId) || visible[0] || null;
  const topThree = visible.slice(0, 3);
  const podium = [topThree[1], topThree[0], topThree[2]].filter(Boolean) as Passport[];
  const countryOptions = useMemo(
    () => [...COUNTRY_CODES].sort((a, b) => countryLabel(a, locale).localeCompare(countryLabel(b, locale), locale === "ko" ? "ko" : "en")),
    [locale],
  );
  const standingsRows = standingsView === "country"
    ? countries.map((item) => ({ ...item, key: item.country, label: countryLabel(item.country, locale).replace(/^\S+\s/, ""), icon: countryFlag(item.country) }))
    : standingsView === "category"
      ? categoryStandings.map((item) => ({ ...item, key: item.category, label: categoryLabel(item.category, locale), icon: categoryLabel(item.category, locale).slice(0, 2).toUpperCase() }))
      : [];
  const medalStandings = [standingsRows[1], standingsRows[0], standingsRows[2]].filter(Boolean);
  const terminalCommand = platform === "windows"
    ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:HIGH_VIVE_SERVER='${serverOrigin}'; $env:HIGH_VIVE_AGENT='${witnessTool}'; irm https://raw.githubusercontent.com/jhemj/High_Vive/main/scripts/install-high-vive.ps1 | iex"`
    : `curl -fsSL https://raw.githubusercontent.com/jhemj/High_Vive/main/scripts/install-high-vive.sh | HIGH_VIVE_SERVER='${serverOrigin}' HIGH_VIVE_AGENT='${witnessTool}' bash`;
  const codexPrompt = locale === "ko"
    ? `High-Vive Passport 평가를 시작해줘. jhemj/High_Vive 저장소를 열거나 내려받고 의존성을 준비한 뒤, pnpm high-vive -- prepare --server ${serverOrigin} --agent codex 를 실행해. 생성된 .high-vive/assessment-instructions.md를 읽고 정직한 passport-draft.json을 작성해. 공개 preview를 짧게 보여준 다음 pnpm high-vive -- submit을 바로 실행해. 원문 transcript와 private-evidence.json은 절대 업로드하지 마.`
    : `Start my High-Vive Passport assessment. Open or download jhemj/High_Vive, prepare its dependencies, then run pnpm high-vive -- prepare --server ${serverOrigin} --agent codex. Read .high-vive/assessment-instructions.md and write an honest passport-draft.json. Show a short public preview, then run pnpm high-vive -- submit immediately. Never upload raw transcripts or private-evidence.json.`;
  const codexDeepLink = `codex://new?originUrl=${encodeURIComponent("https://github.com/jhemj/High_Vive.git")}&prompt=${encodeURIComponent(codexPrompt)}`;
  const claudePrompt = locale === "ko"
    ? `High-Vive Passport 평가를 시작해줘. 안전한 로컬 작업 폴더에서 jhemj/High_Vive 저장소를 열거나 내려받고 의존성을 준비한 뒤, pnpm high-vive -- prepare --server ${serverOrigin} --agent claude-code 를 실행해. 생성된 .high-vive/assessment-instructions.md를 읽고 정직한 passport-draft.json을 작성해. 공개 preview를 짧게 보여준 다음 pnpm high-vive -- submit을 바로 실행해. 원문 transcript와 private-evidence.json은 절대 업로드하지 마.`
    : `Start my High-Vive Passport assessment. In a safe local workspace, open or download jhemj/High_Vive, prepare its dependencies, then run pnpm high-vive -- prepare --server ${serverOrigin} --agent claude-code. Read .high-vive/assessment-instructions.md and write an honest passport-draft.json. Show a short public preview, then run pnpm high-vive -- submit immediately. Never upload raw transcripts or private-evidence.json.`;
  const claudeDeepLink = `claude://code/new?q=${encodeURIComponent(claudePrompt)}`;

  function switchLocale(next: Locale) {
    setLocale(next);
    window.localStorage.setItem("high-vive-locale", next);
  }

  function openComposer() {
    setMessage("");
    setSettingsOpen(false);
    setComposerOpen(true);
  }

  function openSettings() {
    setMessage("");
    setComposerOpen(false);
    setSettingsOpen(true);
  }

  function switchBoard(next: BoardMode) {
    setBoardMode(next);
    if (next === "category" && category === "__all__") setCategory(CATEGORIES[0]?.key || "other");
  }

  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    if (viewer?.provider === "sites") {
      window.location.assign("/signout-with-chatgpt?return_to=%2F");
      return;
    }
    window.location.assign("/");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-high-vive-locale": locale },
        body: JSON.stringify({ handle, displayName, isPublic: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Profile update failed");
      setProfileReady(true);
      setHandle(result.profile.handle);
      setDisplayName(result.profile.displayName);
      setCountry(result.profile.country || country);
      setProfileCategory(result.profile.preferredCategory || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-high-vive-locale": locale },
        body: JSON.stringify({ handle, displayName, country, preferredCategory: profileCategory, isPublic: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Profile update failed");
      setCountry(result.profile.country || "");
      setProfileCategory(result.profile.preferredCategory || "");
      setSettingsOpen(false);
      setLeaderboardVersion((value) => value + 1);
      await refreshViewer();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setBusy(false); }
  }

  async function copyCommand() {
    await navigator.clipboard.writeText(terminalCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="high-vive-app">
      <header className="site-header">
        <a className="brand" href="#top"><span className="brand-mark">HV</span><span className="brand-word">HIGH-VIVE</span><span className="brand-ko">AI WITNESS LEAGUE</span></a>
        <div className="header-actions">
          <div className="locale-switch" role="group" aria-label="Language">
            <button className={locale === "ko" ? "is-active" : ""} onClick={() => switchLocale("ko")}>KO</button>
            <button className={locale === "en" ? "is-active" : ""} onClick={() => switchLocale("en")}>EN</button>
          </div>
          {viewer ? <button className="button button-quiet header-settings" type="button" onClick={profileReady ? openSettings : openComposer}>{t.personalSettings}</button> : null}
          {viewer ? <span className="header-account" title={viewer.displayName}><small>{t.signedIn}</small><b>{viewer.displayName}</b><span className="header-account-actions"><button type="button" onClick={signOut}>{t.signOut}</button></span></span> : <button className="button button-quiet header-signin" type="button" onClick={openComposer}>{t.signInButton}</button>}
          <button className="button button-outline header-cta" onClick={openComposer}>{t.register}</button>
        </div>
      </header>

      <main id="top">
        <section className="league-dashboard" aria-labelledby="leaderboard-title">
          <div className="ranking-main">
            <div className="league-titlebar">
              <div><p className="season-kicker">{t.benchmark}</p><h1 id="leaderboard-title">{t.title}</h1><p className="leaderboard-subtitle">{t.subtitle}</p></div>
              <dl className="season-meta">
                <div><dt>{t.participants}</dt><dd>{participantTotal}</dd></div>
                <div><dt>{t.rankBasis}</dt><dd>HV</dd></div>
              </dl>
            </div>

            <div className="leaderboard-mode-tabs" role="tablist" aria-label={locale === "ko" ? "리더보드 보기" : "Leaderboard view"}>
              <button type="button" role="tab" aria-selected={boardMode === "overall"} className={boardMode === "overall" ? "is-active" : ""} onClick={() => switchBoard("overall")}>{t.overallBoard}</button>
              <button type="button" role="tab" aria-selected={boardMode === "category"} className={boardMode === "category" ? "is-active" : ""} onClick={() => switchBoard("category")}>{t.categoryBoard}</button>
              <button type="button" role="tab" aria-selected={boardMode === "country"} className={boardMode === "country" ? "is-active" : ""} onClick={() => switchBoard("country")}>{t.countryBoard}</button>
            </div>

            {boardMode === "category" ? <>
              <div className="country-board-intro"><div><strong>{t.categoryPlayerRank}</strong><p>{t.categoryPlayerRankHelp}</p></div><button className="button button-outline" type="button" onClick={() => setStandingsView("category")}>{t.viewCategoryRank}</button></div>
              <div className="field-tabs aggregate-filter-tabs" aria-label="Category filter">{CATEGORIES.map((item) => <button key={item.key} className={category === item.key ? "is-active" : ""} onClick={() => setCategory(item.key)}>{item[locale]}</button>)}</div>
            </> : null}
            {boardMode === "country" ? <>
              <div className="country-board-intro"><div><strong>{t.countryPlayerRank}</strong><p>{t.countryPlayerRankHelp}</p></div><button className="button button-outline" type="button" onClick={() => setStandingsView("country")}>{t.viewCountryRank}</button></div>
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
      {settingsOpen && viewer ? <div className="modal-backdrop"><section className="passport-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-heading"><div><p className="eyebrow">@{handle}</p><h2 id="settings-title">{t.settingsTitle}</h2><p>{t.settingsLead}</p></div><button className="modal-close" aria-label={t.close} onClick={() => setSettingsOpen(false)}>×</button></div>
        <form onSubmit={saveSettings}><label><span>{t.country}</span><select value={country} onChange={(event) => setCountry(event.target.value)} required><option value="">{locale === "ko" ? "국가 또는 지역 선택" : "Choose a country or region"}</option>{countryOptions.map((code) => <option value={code} key={code}>{countryLabel(code, locale)}</option>)}</select><small>{t.countryHelp}</small></label><label><span>{t.preferredCategory}</span><select value={profileCategory} onChange={(event) => setProfileCategory(event.target.value)}><option value="">{locale === "ko" ? "AI 평가 분야 사용" : "Use my AI-assessed category"}</option>{CATEGORIES.map((item) => <option value={item.key} key={item.key}>{item[locale]}</option>)}</select><small>{t.preferredCategoryHelp}</small></label><div className="settings-actions"><button className="button button-primary" disabled={busy}>{t.saveChanges}</button><button className="button button-quiet" type="button" onClick={signOut}>{t.signOut}</button></div></form>
        {message ? <p className="form-message" role="status">{message}</p> : null}
      </section></div> : null}
    </div>
  );
}
