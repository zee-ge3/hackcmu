// GitHub push webhook that starts a deploy on this machine. The request is
// authenticated with the HMAC GitHub signs every delivery with
// (X-Hub-Signature-256 over the raw body, using DEPLOY_WEBHOOK_SECRET); only a
// push to the deploy branch starts pairwise-deploy.service, which runs
// scripts/deploy.sh (fetch, fast-forward, test, build, restart).
import { createHmac, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
export function verifySignature(secret, rawBody, header) {
  if (!secret || typeof header !== "string") return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== header.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}
// A push to the deploy branch, or a ping (GitHub sends one when the hook is
// created) which is acknowledged without deploying.
export function classify(event, payload, branch = "main") {
  if (event === "ping") return { deploy: false, reason: "pong" };
  if (event !== "push") return { deploy: false, reason: `ignored ${event}` };
  if (payload?.ref !== `refs/heads/${branch}`)
    return { deploy: false, reason: `ignored push to ${payload?.ref}` };
  return {
    deploy: true,
    reason: `push to ${branch} (${String(payload.after || "").slice(0, 7)})`,
  };
}
export function startDeploy(unit = "pairwise-deploy.service") {
  return new Promise((resolve) => {
    execFile(
      "systemctl",
      ["--user", "start", "--no-block", unit],
      (error, _stdout, stderr) =>
        resolve(
          error ? { ok: false, error: stderr || error.message } : { ok: true },
        ),
    );
  });
}
export function registerDeployHook(
  app,
  { secret, branch = "main", raw, start = startDeploy, log = console } = {},
) {
  app.post("/hooks/github", raw, async (req, res) => {
    if (!secret)
      return res.status(404).json({ error: "Deploy hook not configured." });
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!verifySignature(secret, body, req.get("x-hub-signature-256")))
      return res.status(401).json({ error: "Bad signature." });
    let payload = {};
    try {
      payload = JSON.parse(body.toString("utf8") || "{}");
    } catch {
      return res.status(400).json({ error: "Body is not JSON." });
    }
    const what = classify(req.get("x-github-event"), payload, branch);
    if (!what.deploy) return res.json({ deployed: false, reason: what.reason });
    const started = await start();
    log.log(
      `deploy hook: ${what.reason} -> ${started.ok ? "deploy started" : "could not start deploy: " + started.error}`,
    );
    if (!started.ok) return res.status(500).json({ error: started.error });
    res.status(202).json({ deployed: true, reason: what.reason });
  });
}
