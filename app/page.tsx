import { headers } from "next/headers";
import { HighViveApp } from "./high-vive-app";

export default async function Home() {
  const requestHeaders = await headers();
  const country = (requestHeaders.get("cf-ipcountry") ?? requestHeaders.get("x-country") ?? "").toUpperCase();
  const acceptLanguage = requestHeaders.get("accept-language") ?? "";
  const initialLocale = country ? (country === "KR" ? "ko" : "en") : /^ko(?:-|,|;|$)/i.test(acceptLanguage) ? "ko" : "en";
  return <HighViveApp initialLocale={initialLocale} />;
}
