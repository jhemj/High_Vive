"use client";

import { useState } from "react";

type Locale = "ko" | "en";
type CredentialOptions = {
  challenge: string;
  rpId?: string;
  rp?: { id: string; name: string };
  user?: { id: string; name: string; displayName: string };
  pubKeyCredParams?: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: Array<{ type: "public-key"; id: string }>;
};

function decode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function encode(value: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function jsonFetch(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Authentication failed.");
  return result;
}

function requestOptions(options: CredentialOptions): PublicKeyCredentialRequestOptions {
  return {
    challenge: decode(options.challenge),
    rpId: options.rpId,
    timeout: options.timeout,
    userVerification: options.userVerification,
    allowCredentials: options.allowCredentials?.map((credential) => ({ ...credential, id: decode(credential.id) })),
  };
}

async function authenticate(challengeId: string, options: CredentialOptions) {
  const credential = await navigator.credentials.get({ publicKey: requestOptions(options) }) as PublicKeyCredential | null;
  if (!credential) throw new Error("No Passkey assertion was returned.");
  const response = credential.response as AuthenticatorAssertionResponse;
  return jsonFetch("/api/v1/auth/passkey/verify", {
    phase: "authenticate",
    challengeId,
    response: {
      id: encode(credential.rawId),
      clientDataJSON: encode(response.clientDataJSON),
      authenticatorData: encode(response.authenticatorData),
      signature: encode(response.signature),
      userHandle: response.userHandle ? encode(response.userHandle) : null,
    },
  });
}

export function PasskeyAuth({ locale, returnTo = "/?passport=1", onAuthenticated }: { locale: Locale; returnTo?: string; onAuthenticated: () => void }) {
  const [busy, setBusy] = useState<"register" | "login" | "">("");
  const [message, setMessage] = useState("");
  const ko = locale === "ko";

  async function register() {
    setBusy("register");
    setMessage("");
    try {
      if (!window.PublicKeyCredential) throw new Error(ko ? "이 브라우저는 Passkey를 지원하지 않습니다." : "This browser does not support Passkeys.");
      const started = await jsonFetch("/api/v1/auth/passkey/options", { mode: "register" });
      const options = started.publicKey as CredentialOptions;
      const credential = await navigator.credentials.create({ publicKey: {
        challenge: decode(options.challenge),
        rp: options.rp!,
        user: { ...options.user!, id: decode(options.user!.id) },
        pubKeyCredParams: options.pubKeyCredParams!,
        timeout: options.timeout,
        attestation: options.attestation,
        authenticatorSelection: options.authenticatorSelection,
      } }) as PublicKeyCredential | null;
      if (!credential) throw new Error("No Passkey credential was returned.");
      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = response.getPublicKey?.();
      const algorithm = response.getPublicKeyAlgorithm?.();
      if (!publicKey || !algorithm) throw new Error(ko ? "이 인증 장치의 공개키 형식은 지원되지 않습니다." : "This authenticator's public-key format is not supported.");
      const registered = await jsonFetch("/api/v1/auth/passkey/verify", {
        phase: "register",
        challengeId: started.challengeId,
        response: {
          id: encode(credential.rawId),
          clientDataJSON: encode(response.clientDataJSON),
          publicKeySpki: encode(publicKey),
          algorithm,
        },
      });
      await authenticate(registered.challengeId, registered.publicKey);
      window.localStorage.setItem("high-vive-passkey-id", encode(credential.rawId));
      onAuthenticated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  async function login() {
    setBusy("login");
    setMessage("");
    try {
      if (!window.PublicKeyCredential) throw new Error(ko ? "이 브라우저는 Passkey를 지원하지 않습니다." : "This browser does not support Passkeys.");
      const credentialId = window.localStorage.getItem("high-vive-passkey-id") || undefined;
      const started = await jsonFetch("/api/v1/auth/passkey/options", { mode: "authenticate", credentialId });
      await authenticate(started.challengeId, started.publicKey);
      onAuthenticated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  const signInPath = `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
  return <div className="auth-panel">
    <div><p className="eyebrow">HIGH-VIVE ACCOUNT</p><h3>{ko ? "평가 도구와 무관하게 로그인" : "Sign in independently of your AI tool"}</h3><p>{ko ? "Claude Code 사용자는 ChatGPT 계정이 필요 없습니다. Passkey로 바로 시작할 수 있습니다." : "Claude Code users do not need a ChatGPT account. Start directly with a Passkey."}</p></div>
    <div className="auth-actions">
      <button className="button button-primary" type="button" disabled={Boolean(busy)} onClick={login}>{busy === "login" ? "…" : ko ? "Passkey로 로그인" : "Sign in with Passkey"}</button>
      <button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={register}>{busy === "register" ? "…" : ko ? "새 Passkey 만들기" : "Create a new Passkey"}</button>
      <span>{ko ? "또는" : "or"}</span>
      <a className="button button-quiet" href={signInPath}>{ko ? "ChatGPT 계정으로 계속" : "Continue with ChatGPT"}</a>
    </div>
    <small>{ko ? "Passkey는 Windows Hello, Touch ID, 휴대전화 또는 비밀번호 관리자를 사용합니다." : "Passkeys use Windows Hello, Touch ID, your phone, or a password manager."}</small>
    {message ? <p className="auth-error" role="alert">{message}</p> : null}
  </div>;
}
