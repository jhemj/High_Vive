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
  const [copied, setCopied] = useState(false);
  const ko = locale === "ko";

  function passkeyError(error: unknown, action: "register" | "login") {
    const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    if (name === "NotAllowedError") {
      if (action === "login" && !window.localStorage.getItem("high-vive-passkey-id")) {
        return ko
          ? "이 기기에 저장된 High-Vive 로그인 정보를 찾지 못했어요. 처음이라면 ‘Passkey로 새 계정 만들기’를 선택해 주세요."
          : "We couldn't find High-Vive sign-in details on this device. If you're new, choose ‘Create an account with Passkey’.";
      }
      return ko
        ? "로그인 창이 닫혔거나 시간이 지났습니다. 인앱 브라우저에서는 연결이 제한될 수 있으니 아래 주소를 복사해 Edge 또는 Chrome에서 다시 열어 주세요."
        : "The sign-in window was closed or timed out. In-app browsers can restrict Passkeys, so copy the address below and reopen it in Edge or Chrome.";
    }
    return error instanceof Error ? error.message : String(error);
  }

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
      setMessage(passkeyError(error, "register"));
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
      setMessage(passkeyError(error, "login"));
    } finally {
      setBusy("");
    }
  }

  async function copyBrowserLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const signInPath = `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
  return <div className="auth-panel">
    <div><p className="eyebrow">WELCOME TO HIGH-VIVE</p><h3>{ko ? "High-Vive 시작하기" : "Get started with High-Vive"}</h3><p>{ko ? "처음이라면 Passkey로 간편하게 가입하세요. 이미 가입했다면 기존 Passkey나 ChatGPT 계정으로 로그인할 수 있습니다. Codex와 Claude Code 모두 이용할 수 있어요." : "New here? Create an account with a Passkey. Returning users can sign in with an existing Passkey or ChatGPT. Both Codex and Claude Code are supported."}</p></div>
    <div className="auth-actions">
      <button className="button button-primary" type="button" disabled={Boolean(busy)} onClick={register}>{busy === "register" ? "…" : ko ? "Passkey로 새 계정 만들기" : "Create an account with Passkey"}</button>
      <button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={login}>{busy === "login" ? "…" : ko ? "Passkey로 로그인" : "Sign in with Passkey"}</button>
      <span>{ko ? "또는" : "or"}</span>
      <a className="button button-quiet" href={signInPath}>{ko ? "ChatGPT로 시작하기" : "Start with ChatGPT"}</a>
    </div>
    <small>{ko ? "Passkey는 비밀번호 대신 Windows Hello, Touch ID, 휴대전화 또는 비밀번호 관리자를 사용하는 안전한 로그인 방식입니다." : "A Passkey is a secure, password-free sign-in using Windows Hello, Touch ID, your phone, or a password manager."}</small>
    <button className="auth-copy-link" type="button" onClick={copyBrowserLink}>{copied ? (ko ? "주소 복사됨" : "Address copied") : (ko ? "Edge·Chrome용 주소 복사" : "Copy address for Edge or Chrome")}</button>
    {message ? <p className="auth-error" role="alert">{message}</p> : null}
  </div>;
}
