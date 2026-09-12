#!/usr/bin/env node
// Store an OpenAI API key for an account from the shell (validated against OpenAI):
//   node scripts/set-openai-key.mjs you@example.com sk-...
// Works before the person has signed in; the row is adopted on first Google sign-in.
import { openStore } from "../server/store.mjs";
import { fileURLToPath } from "node:url";
const [email, apiKey] = process.argv.slice(2);
if (!email?.includes("@") || !/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey || "")) {
  console.error("usage: set-openai-key.mjs <email> <sk-...>");
  process.exit(1);
}
const check = await fetch("https://api.openai.com/v1/models", {
  headers: { Authorization: `Bearer ${apiKey}` },
  signal: AbortSignal.timeout(15000),
});
if (!check.ok) {
  console.error(`OpenAI rejected the key (${check.status}).`);
  process.exit(1);
}
const store = openStore(fileURLToPath(new URL("../data/", import.meta.url)));
const user = store.provisionUser(email);
store.setOpenaiKey(user.id, apiKey);
console.log(
  `Stored key ${store.publicUser(store.getUser(user.id)).openaiKeyHint} for ${email}`,
);
store.close();
