import { headers } from "next/headers";
import { ConnectClient } from "./connect-client";

export const dynamic = "force-dynamic";

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const values = await headers();
  const locale = (values.get("cf-ipcountry") || "").toUpperCase() === "KR" || (values.get("accept-language") || "").toLowerCase().startsWith("ko") ? "ko" : "en";
  const { code = "" } = await searchParams;
  return <ConnectClient initialCode={code} locale={locale} />;
}
