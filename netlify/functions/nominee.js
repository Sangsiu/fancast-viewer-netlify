// netlify/functions/nominee.js
const FANCA = "https://api.fanca.io/event/nominee";

// normalisasi ke shape index.html
function normalize(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  const list = input.data || input.list || input.results || input.items || [];
  const arr = Array.isArray(list) ? list : [];
  return arr.map((it, i) => ({
    keyNominee: it?.keyNominee ?? it?.id ?? it?.key ?? String(i + 1),
    rank: it?.rank ?? it?.position ?? it?.order ?? it?.sort ?? (i + 1),
    subject: it?.subject ?? it?.name ?? it?.title ?? it?.nomineeName ?? it?.stageName ?? "-",
    etc: it?.etc ?? it?.brand ?? it?.group ?? it?.team ?? it?.category ?? "",
    count: it?.count ?? it?.votes ?? it?.voteCount ?? it?.point ?? it?.total ?? 0,
    percent: typeof it?.percent === "number" ? it.percent : undefined,
  }));
}

const demo = [
  { keyNominee: "a", rank: 1, subject: "Demo A", etc: "Brand X", count: 12345, percent: 55.5 },
  { keyNominee: "b", rank: 2, subject: "Demo B", etc: "Brand Y", count: 10023, percent: 40.2 },
  { keyNominee: "c", rank: 3, subject: "Demo C", etc: "Brand Z", count: 1200,  percent: 4.3  },
];

exports.handler = async (event) => {
  try {
    if (process.env.USE_DEMO === "1") {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nominee: demo, meta: { demo: true } }, null, 2),
      };
    }

    const keyCategory = event.queryStringParameters?.keyCategory ?? "627";
    const typeSort = event.queryStringParameters?.typeSort ?? "1";
    const typePeriod = event.queryStringParameters?.typePeriod ?? "1";

    const url = new URL(FANCA);
    url.searchParams.set("keyCategory", keyCategory);
    url.searchParams.set("typeSort", typeSort);
    url.searchParams.set("typePeriod", typePeriod);

    // Izinkan override via env supaya mudah eksperimen
    const ORIGIN = process.env.ORIGIN || "https://api.fanca.io";
    const REFERER = process.env.REFERER || "https://api.fanca.io/";

    const headers = {
      "user-agent": "Dart/3.7 (dart:io)",
      "x-api-token": process.env.X_API_TOKEN || "",
      connection: "Keep-Alive",
      "community-tab-index": "0",
      "accept-encoding": "gzip, deflate, br",
      "system-language": "en-US",
      "content-type": "application/json",
      "community-translate-type": "true",
      "app-ver": "1.0.35",
      "device-model": "2107113SI",
      flavor: "product",
      "build-mode": "release",
      "accept-language": "en-US",
      version: "1.0.35",
      device: "1",
      package: "com.contentsmadang.fancast",
      "os-ver": "9",
      brightness: "light",
      "community-display-type": "list",
      "select-language": "en",
      accept: "application/json, text/plain, */*",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "x-requested-with": "XMLHttpRequest",

      // Tambahan yang sering dicek WAF
      origin: ORIGIN,
      referer: REFERER,
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "sec-ch-ua": '"Chromium";v="129", "Not?A_Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    };

    if (process.env.X_FINGERPRINT) headers["fingerprint"] = process.env.X_FINGERPRINT;

    const r = await fetch(url.toString(), { headers, method: "GET", redirect: "follow" });

    // kumpulkan header upstream untuk debug
    const uh = {};
    ["content-type", "server", "cf-ray", "cf-cache-status", "vary"].forEach((k) => {
      const v = r.headers.get(k);
      if (v) uh[k] = v;
    });

    const text = await r.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    let nominee = normalize(parsed?.data ?? parsed);

    if (nominee.length && !nominee.some(n => typeof n.percent === "number" && n.percent > 0)) {
      const total = nominee.reduce((s, n) => s + (Number(n.count) || 0), 0);
      nominee = nominee.map(n => ({
        ...n,
        percent: total ? +(((Number(n.count) || 0) / total) * 100).toFixed(2) : 0,
      }));
    }

    // Balikkan 200 supaya UI tetap jalan, tapi sertakan meta untuk diagnosis
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        {
          nominee,
          meta: {
            upstreamStatus: r.status,
            upstreamReason: r.statusText,
            upstreamHeaders: uh,
            params: { keyCategory, typeSort, typePeriod },
            upstreamSample: nominee.length ? undefined : (parsed?.message || parsed?.raw || parsed),
            usedOrigin: ORIGIN,
            usedReferer: REFERER,
            usedFingerprint: !!process.env.X_FINGERPRINT,
          },
        },
        null,
        2
      ),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nominee: demo, meta: { demo: true, error: String(err) } }, null, 2),
    };
  }
};
