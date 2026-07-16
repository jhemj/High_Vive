export const dynamic = "force-dynamic";

type RequestWithCloudflare = Request & {
  cf?: { country?: string };
};

export async function GET(request: Request) {
  const cloudflareRequest = request as RequestWithCloudflare;
  const country = (
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country") ??
    cloudflareRequest.cf?.country ??
    ""
  ).toUpperCase();
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const locale = country ? (country === "KR" ? "ko" : "en") : /^ko(?:-|,|;|$)/i.test(acceptLanguage) ? "ko" : "en";

  return Response.json({
    locale,
    country: country || null,
    source: country ? "country" : "accept-language",
  });
}
