"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function ConnectClient({ initialCode, locale }: { initialCode: string; locale: "ko" | "en" }) {
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function approve(event: FormEvent) {
    event.preventDefault();
    setState("busy");
    const response = await fetch("/api/v1/auth/complete", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userCode: code }),
    });
    const result = await response.json();
    if (!response.ok) {
      setState("error");
      setMessage(result?.error?.message || "Could not approve the device.");
      return;
    }
    setState("success");
    setMessage(locale === "ko" ? "CLI 연결이 승인됐습니다. 터미널로 돌아가세요." : "CLI access approved. Return to your terminal.");
  }

  return <main className="connect-page"><section><Link className="brand" href="/"><span className="brand-mark">HV</span><span className="brand-word">HIGH-VIVE</span></Link><p className="eyebrow">CLI DEVICE LOGIN</p><h1>{locale === "ko" ? "로컬 CLI 연결" : "Connect the local CLI"}</h1><p>{locale === "ko" ? "터미널에 표시된 일회용 코드를 확인하고 이 계정에 연결하세요." : "Confirm the one-time code shown in your terminal and link it to this account."}</p><form onSubmit={approve}><label>{locale === "ko" ? "일회용 코드" : "One-time code"}<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" maxLength={9} required /></label><button className="button button-primary" disabled={state === "busy" || state === "success"}>{state === "success" ? "APPROVED" : state === "busy" ? "…" : "AUTHORIZE CLI"}</button></form>{message ? <p className={`connect-message ${state}`}>{message}</p> : null}<small>{locale === "ko" ? "이 승인은 10분 후 만료되며 transcript 접근 권한을 서버에 부여하지 않습니다." : "This approval expires in 10 minutes and does not grant the server transcript access."}</small></section></main>;
}
