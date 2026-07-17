import { headers } from "next/headers";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const values = await headers();
  const locale = (values.get("cf-ipcountry") || "").toUpperCase() === "KR" || (values.get("accept-language") || "").toLowerCase().startsWith("ko") ? "ko" : "en";
  return <ProfileClient handle={(await params).handle} locale={locale} />;
}
