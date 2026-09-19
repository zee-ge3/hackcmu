import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { api, describeResponse } from "../src/api.mjs";
// A stand-in for Cloudflare in front of a restarting origin: HTML error pages
// first, JSON once the service is back.
function serve(script) {
  let i = 0;
  const server = createServer((req, res) => {
    const step = script[Math.min(i++, script.length - 1)];
    res.writeHead(step.status, step.headers || { "content-type": "text/html" });
    res.end(step.body ?? "<!DOCTYPE html><html>error</html>");
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        calls: () => i,
        close: () => server.close(),
      }),
    ),
  );
}
test("an HTML error page during a restart is retried, then the JSON answer is returned", async () => {
  const s = await serve([
    { status: 502 },
    { status: 502 },
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: '{"ok":true}',
    },
  ]);
  try {
    const t0 = Date.now();
    assert.deepEqual(await api(s.url + "/api/x", { a: 1 }), { ok: true });
    assert.equal(s.calls(), 3);
    assert.ok(Date.now() - t0 >= 4000, "waited between retries");
  } finally {
    s.close();
  }
});
test("a persistent HTML page becomes a plain message instead of a JSON parse error", async () => {
  const s = await serve([{ status: 502 }]);
  try {
    await assert.rejects(api(s.url + "/api/x", {}), (e) => {
      assert.match(e.message, /server is restarting/i);
      assert.equal(e.status, 502);
      assert.match(e.data.body, /DOCTYPE/);
      return true;
    });
    assert.equal(s.calls(), 3, "two retries");
  } finally {
    s.close();
  }
});
test("a Cloudflare challenge is not retried and tells the user to reload", async () => {
  const s = await serve([
    {
      status: 403,
      headers: { "content-type": "text/html", "cf-mitigated": "challenge" },
    },
  ]);
  try {
    await assert.rejects(api(s.url + "/api/x", {}), /Reload the page/);
    assert.equal(s.calls(), 1);
  } finally {
    s.close();
  }
  assert.match(describeResponse(524, new Headers()), /restarting/);
  assert.match(describeResponse(418, new Headers()), /418/);
});
test("JSON errors from the app keep their message and status", async () => {
  const s = await serve([
    {
      status: 409,
      headers: { "content-type": "application/json" },
      body: '{"error":"Alex edited this file."}',
    },
  ]);
  try {
    await assert.rejects(
      api(s.url + "/api/x", {}, "PUT"),
      (e) => e.status === 409 && e.message === "Alex edited this file.",
    );
    assert.equal(s.calls(), 1);
  } finally {
    s.close();
  }
});
