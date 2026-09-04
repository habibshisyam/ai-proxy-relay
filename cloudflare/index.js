export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Diagnostic endpoint
    if (url.pathname === "/__health") {
      return json({
        ok: true,
        runtime: "cloudflare-workers",
        headers: Object.fromEntries(request.headers.entries()),
      });
    }

    const target = request.headers.get("x-relay-target");
    let relayPath = request.headers.get("x-relay-path") || "/";

    if (!target) {
      return json({ error: "Missing x-relay-target header" }, 400);
    }
    if (!/^https?:\/\//i.test(target)) {
      return json({ error: "x-relay-target must start with http:// or https://" }, 400);
    }

    // 2. Health-check shim (intercept 9Router false-positive 503)
    const healthHosts = (env?.HEALTH_HOSTS || "httpbin.org,api.httpbin.org,www.google.com")
      .split(",")
      .map((s) => s.trim().toLowerCase());

    try {
      const host = new URL(target).hostname.toLowerCase();
      if (healthHosts.includes(host)) {
        return json({
          ok: true,
          service: "relay-health-shim",
          target: host,
          status: "passed",
        });
      }
    } catch (_) {}

    // 3. Upstream URL target
    relayPath += url.search;
    const targetUrl = target.replace(/\/+$/, "") + (relayPath.startsWith("/") ? relayPath : "/" + relayPath);

    // 4. Inbound header sanitation
    const headers = new Headers(request.headers);
    const dropHeaders = [
      "x-relay-target", "x-relay-path", "host",
      "connection", "keep-alive", "proxy-connection",
      "content-length", "transfer-encoding", "accept-encoding",
      "te", "trailer", "upgrade",
      "cf-connecting-ip", "cf-ipcountry", "cf-ray", "cf-visitor", "cf-request-id",
      "x-forwarded-for", "x-forwarded-proto", "x-real-ip",
    ];
    for (const h of dropHeaders) headers.delete(h);
    headers.set("accept-encoding", "identity");

    const init = {
      method: request.method,
      headers,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }

    // 5. Cloudflare timeout guard: 25s
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    try {
      const upstream = await fetch(targetUrl, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // 6. Outbound header sanitation
      const resHeaders = new Headers(upstream.headers);
      for (const h of [
        "content-encoding", "content-length", "transfer-encoding",
        "connection", "keep-alive", "proxy-connection", "te", "trailer", "upgrade",
      ]) {
        resHeaders.delete(h);
      }

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: resHeaders,
      });
    } catch (error) {
      clearTimeout(timer);
      const aborted = error.name === "AbortError";
      return json(
        {
          error: aborted ? "Upstream timeout after 25s" : error.message,
          target: targetUrl,
        },
        aborted ? 504 : 502
      );
    }
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
