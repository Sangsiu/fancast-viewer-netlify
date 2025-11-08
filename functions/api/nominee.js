// netlify/functions/nominee.ts
import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const FANCA = "https://api.fanca.io/event/nominee";
  const keyCategory = event.queryStringParameters?.keyCategory ?? "627";
  const typeSort = event.queryStringParameters?.typeSort ?? "1";
  const typePeriod = event.queryStringParameters?.typePeriod ?? "1";

  const url = new URL(FANCA);
  url.searchParams.set("keyCategory", keyCategory);
  url.searchParams.set("typeSort", typeSort);
  url.searchParams.set("typePeriod", typePeriod);

  const headers: Record<string, string> = {
    "user-agent": "Dart/3.7 (dart:io)",
    "x-api-token": process.env.X_API_TOKEN || "",
    "connection": "Keep-Alive",
    "community-tab-index": "0",
    "accept-encoding": "gzip",
    "system-language": "en-US",
    "content-type": "application/json",
    "community-translate-type": "true",
    "app-ver": "1.0.35",
    "device-model": "2107113SI",
    "flavor": "product",
    "build-mode": "release",
    "accept-language": "en-US",
    "version": "1.0.35",
    "device": "1",
    "package": "com.contentsmadang.fancast",
    "os-ver": "9",
    "brightness": "light",
    "community-display-type": "list",
    "select-language": "en",
    "accept": "application/json, text/plain, */*",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "x-requested-with": "XMLHttpRequest",
  };
  if (process.env.X_FINGERPRINT) headers["fingerprint"] = process.env.X_FINGERPRINT;

  const r = await fetch(url.toString(), { headers, method: "GET" });
  const t = await r.text();
  let j: any; try { j = JSON.parse(t); } catch { j = { raw: t }; }

  const list = Array.isArray(j) ? j : (j.data || j.list || j.results || j.items || []);
  const nominee = (Array.isArray(list) ? list : []).map((it: any, i: number) => ({
    keyNominee: it.keyNominee ?? it.id ?? it.key ?? String(i + 1),
    rank: it.rank ?? it.position ?? it.order ?? it.sort ?? i + 1,
    subject: it.subject ?? it.name ?? it.title ?? it.nomineeName ?? it.stageName ?? "-",
    etc: it.etc ?? it.brand ?? it.group ?? it.team ?? it.category ?? "",
    count: it.count ?? it.votes ?? it.voteCount ?? it.point ?? it.total ?? 0,
    percent: typeof it.percent === "number" ? it.percent : undefined
  }));

  if (!nominee.some(n => typeof n.percent === "number")) {
    const total = nominee.reduce((s, n) => s + (+n.count || 0), 0);
    nominee.forEach(n => n.percent = total ? +( (n.count || 0)/total*100 ).toFixed(2) : 0);
  }

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nominee }, null, 2)
  };
};
export default handler;
