// Every API call goes through here. The server always answers JSON, so a
// non-JSON body means something in front of it spoke instead: Cloudflare's
// error page while the service restarts after a deploy (502/503), or its
// security challenge (403). Those are turned into plain messages, and a
// request that never reached the server is retried after a short pause.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Statuses that mean the origin was unreachable, so the request did not run
// and can be repeated safely.
const ORIGIN_DOWN = new Set([502, 503, 521, 522, 523]);
const RETRY_DELAYS = [1500, 3000];
export function describeResponse(status, headers) {
  if (status === 403 && headers?.get?.("cf-mitigated"))
    return "Cloudflare asked for a security check. Reload the page to continue.";
  if (ORIGIN_DOWN.has(status) || status === 504 || status === 524)
    return "The server is restarting. Try again in a moment.";
  return `Unexpected response from the server (${status}).`;
}
export async function api(path, body, method = "POST") {
  const idempotent = method === "GET" || method === "PUT";
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (e) {
      if (idempotent && attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      throw Object.assign(
        new Error(
          "The server could not be reached. Check your connection and retry.",
        ),
        { status: 0, data: { error: e.message } },
      );
    }
    const type = response.headers.get("content-type") || "";
    if (type.includes("json")) {
      const data = await response.json();
      if (!response.ok)
        throw Object.assign(new Error(data.error || "Request failed"), {
          status: response.status,
          data,
        });
      return data;
    }
    if (ORIGIN_DOWN.has(response.status) && attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
      continue;
    }
    const text = await response.text().catch(() => "");
    const message = describeResponse(response.status, response.headers);
    throw Object.assign(new Error(message), {
      status: response.status,
      data: { error: message, body: text.slice(0, 200) },
    });
  }
}
