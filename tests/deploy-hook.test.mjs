import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import express from "express";
import {
  classify,
  registerDeployHook,
  verifySignature,
} from "../server/deploy-hook.mjs";
const sign = (secret, body) =>
  "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
test("signatures are checked over the raw body", () => {
  const body = Buffer.from('{"ref":"refs/heads/main"}');
  assert.equal(verifySignature("s3cret", body, sign("s3cret", body)), true);
  assert.equal(verifySignature("s3cret", body, sign("other", body)), false);
  assert.equal(verifySignature("s3cret", body, "sha256=short"), false);
  assert.equal(verifySignature("", body, sign("", body)), false);
  assert.equal(verifySignature("s3cret", body, undefined), false);
});
test("only a push to main deploys", () => {
  assert.equal(
    classify("push", { ref: "refs/heads/main", after: "abcdef0123" }).deploy,
    true,
  );
  assert.equal(classify("push", { ref: "refs/heads/accounts" }).deploy, false);
  assert.equal(classify("ping", {}).deploy, false);
  assert.equal(
    classify("pull_request", { ref: "refs/heads/main" }).deploy,
    false,
  );
});
test("the hook route rejects bad signatures and starts a deploy for main", async () => {
  const app = express();
  const started = [];
  registerDeployHook(app, {
    secret: "s3cret",
    raw: express.raw({ type: "*/*" }),
    start: async () => (started.push(1), { ok: true }),
    log: { log() {} },
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers) =>
    fetch(base + "/hooks/github", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    });
  const body = JSON.stringify({ ref: "refs/heads/main", after: "0123456789" });
  let r = await post(body, { "x-github-event": "push" });
  assert.equal(r.status, 401);
  r = await post(body, {
    "x-github-event": "push",
    "x-hub-signature-256": sign("s3cret", body),
  });
  assert.equal(r.status, 202);
  assert.equal((await r.json()).deployed, true);
  const other = JSON.stringify({ ref: "refs/heads/accounts" });
  r = await post(other, {
    "x-github-event": "push",
    "x-hub-signature-256": sign("s3cret", other),
  });
  assert.equal((await r.json()).deployed, false);
  assert.equal(started.length, 1, "one deploy started");
  server.close();
});
