"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, METRICS, PROTOCOL_VERSION } from "../packages/protocol/runtime.mjs";
import { PasskeyAuth } from "./passkey-auth";

type Locale = "ko" | "en";
type Platform = "windows" | "macos" | "ubuntu";
type WitnessTool = "codex" | "claude-code";
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

const copy = {
  ko: {
    benchmark: "HIGH-VIVE · AI WITNESS BENCHMARK",
    title: "바이브코더 리더보드",
    subtitle: "당신과 함께 일한 AI가 평가하는 바이브코딩 실력.",
    official: "OFFICIAL",
    officialHelp: "Challenge-bound · 신뢰도 60+ · 현행 Protocol",
    all: "전체",
    participants: "참가자",
    serverLlm: "서버 LLM",
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
    emptyBody: "첫 Challenge-bound 평가를 시작해 High-Vive 기록을 만드세요.",
    methodology: "평가 방법",
    methodTitle: "실력과 신뢰를 분리한 AI Witness 벤치마크",
    methodBody: "로컬 Codex 또는 Claude Code가 10개 원점수를 평가하고, 서버는 고정된 calibration으로 OVR과 HV Rating을 계산합니다. Reliability는 소유권·commitment·challenge·proof만 반영하며 실력 점수에 더하지 않습니다.",
    steps: [
      ["LOCAL SCAN", "선택한 AI 코딩 에이전트의 전체 로컬 이력을 읽기 전용으로 집계합니다."],
      ["COMMIT", "원문 대신 canonical evidence Merkle root를 먼저 등록합니다."],
      ["CHALLENGE", "서버 seed로 표본을 결정론적으로 선택하고 proof를 연결합니다."],
      ["AI WITNESS", "로컬 Codex 또는 Claude Code가 지표별 점수·confidence·근거·한계를 작성합니다."],
      ["SERVER RATING", "서버가 OVR·HV Rating·Reliability·Provisional Tier를 재계산합니다."],
    ],
    transparency: "투명성",
    transparencyBody: "특정 기기와 평가 시점에 발견된 로컬 AI 코딩 에이전트 이력을 분석한 AI Witness 평가입니다. 신원, 전체 업무 이력, 실제 성과 또는 고용 적합성을 보증하지 않습니다.",
    modalTitle: "공식 Passport 만들기",
    modalLead: "원문은 기기에 남기고, commitment와 공개 manifest만 등록한 뒤 자동 공개합니다.",
    profileStep: "1. 공개 handle",
    cliStep: "2. 로컬 평가",
    publishStep: "3. 자동 공개",
    handle: "handle",
    displayName: "공개 이름",
    saveProfile: "프로필 저장",
    agentChoice: "평가 에이전트",
    detectedEnvironment: "접속 환경 자동 감지",
    changeEnvironment: "환경 직접 선택",
    codexStart: "Codex 앱에서 바로 시작",
    codexStartHelp: "Codex가 설치·스캔·평가 준비를 순서대로 진행합니다.",
    claudeStart: "Claude Code 앱에서 바로 시작",
    claudeStartHelp: "Claude Desktop의 Code 세션에 High-Vive 평가 지시를 바로 채웁니다.",
    terminalFallback: "터미널로 시작",
    terminalHelp: "Node.js가 없어도 설치 스크립트가 필요한 환경을 준비합니다.",
    copyCommand: "한 줄 명령 복사",
    copied: "복사됨",
    assessmentStatus: "평가 상태",
    waiting: "CLI 평가를 기다리는 중",
    published: "공개 완료",
    close: "닫기",
    signIn: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
    signInButton: "로그인",
    signOut: "로그아웃",
    signedIn: "로그인됨",
    privacy: "Codex·Claude Code 대화 원문, 로컬 파일, 절대 경로, tool arguments는 서버로 전송되지 않습니다.",
    noSelection: "표시할 Passport가 없습니다.",
  },
  en: {
    benchmark: "HIGH-VIVE · AI WITNESS BENCHMARK",
    title: "VIBE CODER LEADERBOARD",
    subtitle: "Vibe-coding skill, evaluated by the AI that works with you.",
    official: "OFFICIAL",
    officialHelp: "Challenge-bound · Reliability 60+ · Current Protocol",
    all: "All",
    participants: "Players",
    serverLlm: "Server LLM",
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
    emptyBody: "Start the first challenge-bound assessment and establish the High-Vive record.",
    methodology: "Method",
    methodTitle: "An AI Witness benchmark that separates skill from trust",
    methodBody: "Local Codex or Claude Code scores ten raw metrics. The server applies fixed calibration to calculate OVR and HV Rating. Reliability reflects ownership, commitment, challenge, and proofs only; it is never added to skill.",
    steps: [
      ["LOCAL SCAN", "Read-only aggregation of the selected AI coding agent's full local history."],
      ["COMMIT", "Register a canonical evidence Merkle root, not transcripts."],
      ["CHALLENGE", "Use a server seed for deterministic samples and proofs."],
      ["AI WITNESS", "Local Codex or Claude Code writes metric scores, confidence, evidence, and limits."],
      ["SERVER RATING", "The server recalculates OVR, HV Rating, Reliability, and Provisional Tier."],
    ],
    transparency: "Transparency",
    transparencyBody: "An AI Witness assessment of local AI coding-agent history found on a specific device at a specific time. It does not prove identity, complete work history, real-world outcomes, or hiring fitness.",
    modalTitle: "Create an official Passport",
    modalLead: "Raw history stays on your device. The commitment and public manifest are registered and published automatically.",
    profileStep: "1. Public handle",
    cliStep: "2. Local assessment",
    publishStep: "3. Automatic publish",
    handle: "Handle",
    displayName: "Display name",
    saveProfile: "Save profile",
    agentChoice: "Assessment agent",
    detectedEnvironment: "Detected environment",
    changeEnvironment: "Choose another environment",
    codexStart: "Start in the Codex app",
    codexStartHelp: "Codex guides setup, scanning, and assessment preparation.",
    claudeStart: "Start in the Claude Code app",
    claudeStartHelp: "Opens a Claude Desktop Code session with the High-Vive assessment instructions prefilled.",
    terminalFallback: "Start from a terminal",
    terminalHelp: "The installer prepares the required runtime even when Node.js is missing.",
    copyCommand: "Copy one-line command",
    copied: "Copied",
    assessmentStatus: "Assessment status",
    waiting: "Waiting for the CLI assessment",
    published: "Published",
    close: "Close",
    signIn: "Your sign-in session expired. Please sign in again.",
    signInButton: "Sign in",
    signOut: "Sign out",
    signedIn: "Signed in",
    privacy: "Codex and Claude Code transcripts, local files, absolute paths, and tool arguments are not uploaded.",
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

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "windows";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const value = `${nav.userAgentData?.platform || ""} ${navigator.platform || ""} ${navigator.userAgent || ""}`.toLowerCase();
  if (value.includes("mac")) return "macos";
  if (value.includes("linux") || value.includes("ubuntu")) return "ubuntu";
  return "windows";
}

function ToolBadges({ tools = [] }: { tools?: string[] }) {
  const normalized = Array.from(new Set(tools.length ? tools : ["codex"]));
  return <span className="tool-badges">{normalized.map((tool) => <b className={`tool-badge tool-${tool}`} key={tool} title={tool === "codex" ? "Codex" : tool}>{tool === "codex" ? "CX" : tool === "claude-code" ? "CL" : tool.slice(0, 2).toUpperCase()}</b>)}</span>;
}

export function HighViveApp({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [category, setCategory] = useState("__all__");
  const [passports, setPassports] = useState<Passport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ id: string; displayName: string; provider: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [handle, setHandle] = useState("ngmptdz");
  const [displayName, setDisplayName] = useState("ngmptdz");
  const [profileReady, setProfileReady] = useState(false);
  const [assessmentState, setAssessmentState] = useState<AssessmentState | null>(null);
  const [platform, setPlatform] = useState<Platform>("windows");
  const [witnessTool, setWitnessTool] = useState<WitnessTool>("codex");
  const [serverOrigin, setServerOrigin] = useState(DEFAULT_SERVER);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = copy[locale];

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
        setProfileReady(true);
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
    fetch("/api/v1/leaderboards?pageSize=100", { headers: { "x-high-vive-locale": locale } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error?.message || "Leaderboard unavailable");
        if (active) {
          setPassports(result.passports || []);
          setSelectedId((current) => result.passports?.some((item: Passport) => item.id === current) ? current : result.passports?.[0]?.id || "");
        }
      })
      .catch((error) => active && setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [locale, assessmentState?.passport?.status]);

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

  const visible = useMemo(
    () => category === "__all__" ? passports : passports.filter((passport) => passport.category === category),
    [category, passports],
  );
  const selected = passports.find((passport) => passport.id === selectedId) || visible[0] || passports[0] || null;
  const topThree = visible.slice(0, 3);
  const podium = [topThree[1], topThree[0], topThree[2]].filter(Boolean) as Passport[];
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
    setComposerOpen(true);
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
          {viewer ? <span className="header-account" title={viewer.displayName}><small>{t.signedIn}</small><b>{viewer.displayName}</b><button type="button" onClick={signOut}>{t.signOut}</button></span> : <button className="button button-quiet header-signin" type="button" onClick={openComposer}>{t.signInButton}</button>}
          <button className="button button-outline header-cta" onClick={openComposer}>{t.register}</button>
        </div>
      </header>

      <main id="top">
        <section className="league-dashboard" aria-labelledby="leaderboard-title">
          <div className="ranking-main">
            <div className="league-titlebar">
              <div><p className="season-kicker">{t.benchmark}</p><h1 id="leaderboard-title">{t.title}</h1><p className="leaderboard-subtitle">{t.subtitle}</p></div>
              <dl className="season-meta">
                <div><dt>{t.participants}</dt><dd>{passports.length}</dd></div>
                <div><dt>{t.serverLlm}</dt><dd>0</dd></div>
                <div><dt>{t.rankBasis}</dt><dd>HV</dd></div>
              </dl>
            </div>

            <div className="field-tabs" aria-label="Category filter">
              <button className={category === "__all__" ? "is-active" : ""} onClick={() => setCategory("__all__")}>{t.all}</button>
              {CATEGORIES.map((item) => <button key={item.key} className={category === item.key ? "is-active" : ""} onClick={() => setCategory(item.key)}>{item[locale]}</button>)}
            </div>

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
                  <span className="card-avatar">{passport.handle.slice(0, 2).toUpperCase()}</span><span className="card-name">{passport.displayName}</span>
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
                  <span className="table-trainer"><span className="mini-shield">{passport.handle.slice(0, 2).toUpperCase()}</span><span><strong>{passport.displayName}</strong><small>@{passport.handle} · {passport.evidenceLabel}</small><ToolBadges tools={passport.evaluator.tools} /></span></span>
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
              <div className="scout-identity"><div className="scout-avatar">{selected.handle.slice(0, 2).toUpperCase()}</div><div><span>{categoryLabel(selected.category, locale)}</span><h2>{selected.displayName}</h2><p>@{selected.handle} · {selected.protocolVersion}</p></div><div className="scout-overall"><strong>{selected.hvRating}</strong><span>HV RATING</span></div></div>
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

      <footer className="site-footer"><p><strong>{t.transparency}</strong> {t.transparencyBody}</p><p>PROTOCOL {PROTOCOL_VERSION} · SERVER LLM CALLS 0</p></footer>

      {composerOpen ? <div className="modal-backdrop"><section className="passport-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <div className="modal-heading"><div><p className="eyebrow">{t.register}</p><h2 id="composer-title">{t.modalTitle}</h2><p>{t.modalLead}</p></div><button className="modal-close" aria-label={t.close} onClick={() => setComposerOpen(false)}>×</button></div>
        {!authChecked ? <div className="auth-loading">…</div> : !viewer ? <PasskeyAuth locale={locale} onAuthenticated={refreshViewer} /> : <><div className="onboarding-steps">
          <section className={profileReady ? "is-complete" : "is-active"}><span>01</span><h3>{t.profileStep}</h3>
            <form onSubmit={saveProfile}><label>{t.handle}<input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} pattern="[a-z0-9_]{3,24}" maxLength={24} required /></label><label>{t.displayName}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required /></label><button className="button button-outline" disabled={busy}>{t.saveProfile}</button></form>
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
            <div className="terminal-option"><b>{t.terminalFallback}</b><small>{t.terminalHelp}</small><pre className="cli-command">{terminalCommand}</pre><button className="button button-outline" type="button" disabled={!profileReady} onClick={copyCommand}>{copied ? t.copied : t.copyCommand}</button></div>
            <p className="assessment-live"><b>{t.assessmentStatus}</b><span>{assessmentState?.assessment?.status || t.waiting}</span><small>{assessmentState?.commitment ? `${assessmentState.commitment.sessionCount} sessions · ${assessmentState.commitment.activeDays} active days` : t.waiting}</small></p>
          </section>
          <section className={assessmentState?.passport?.status === "PUBLISHED" ? "is-complete" : assessmentState?.passport ? "is-active" : ""}><span>03</span><h3>{t.publishStep}</h3>
            {assessmentState?.passport ? <div className="publish-preview"><dl><div><dt>HV RATING</dt><dd>{assessmentState.passport.hvRating}</dd></div><div><dt>OVR</dt><dd>{assessmentState.passport.ovr}</dd></div><div><dt>REL</dt><dd>{assessmentState.passport.reliabilityScore}</dd></div><div><dt>EVIDENCE</dt><dd>{assessmentState.passport.evidenceLevel}</dd></div></dl><strong className="auto-published">{assessmentState.passport.status === "PUBLISHED" ? t.published : assessmentState.passport.status}</strong></div> : <p>{t.waiting}</p>}
          </section>
        </div>
        <p className="privacy-note"><strong>LOCAL-FIRST</strong> {t.privacy}</p>{message ? <p className="form-message" role="status">{message}</p> : null}</>}
      </section></div> : null}
    </div>
  );
}
