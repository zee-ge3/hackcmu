import { OAuth2Client } from "google-auth-library";

const SESSION_COOKIE = "pairwise_session";
const DAY = 86_400_000;
export const cookie = (req, name) =>
  new RegExp(`(?:^|; )${name}=([^;]+)`).exec(req.headers.cookie || "")?.[1];

// Google sign-in, session cookies, and the per-user OpenAI key. Returns the
// middleware that protects everything registered after it.
export function registerAuth(
  app,
  { store, clientId, allowedEmails = [], devUserEmail = null },
) {
  const google = clientId ? new OAuth2Client(clientId) : null;
  const cookieOptions = (req) => ({
    httpOnly: true,
    sameSite: "lax",
    secure: req.headers["x-forwarded-proto"] === "https",
    maxAge: 30 * DAY,
    path: "/",
  });
  const allowed = (email) =>
    !allowedEmails.length || allowedEmails.includes(email.toLowerCase());
  const me = (req) => ({
    ...store.publicUser(req.user),
    ...(req.devFallbackKey ? { openaiKeyHint: "from .env" } : {}),
  });
  app.use("/api", (req, _res, next) => {
    req.user = store.userForSession(cookie(req, SESSION_COOKIE));
    if (!req.user && devUserEmail)
      req.user = store.upsertUser({
        sub: `dev:${devUserEmail}`,
        email: devUserEmail,
        name: "Development user",
      });
    if (req.user) {
      // A key that no longer decrypts (secret rotated) must not take every route down.
      try {
        req.openaiKey = store.openaiKey(req.user.id);
      } catch {
        req.openaiKey = null;
        store.setOpenaiKey(req.user.id, null);
      }
      if (!req.openaiKey && devUserEmail && process.env.OPENAI_API_KEY) {
        req.openaiKey = process.env.OPENAI_API_KEY;
        req.devFallbackKey = true;
      }
    }
    next();
  });
  app.get("/api/me", (req, res) =>
    res.json({
      user: req.user ? me(req) : null,
      googleClientId: clientId || null,
    }),
  );
  app.post("/api/auth/google", async (req, res) => {
    if (!google)
      return res.status(503).json({
        error: "Set GOOGLE_CLIENT_ID in .env and restart the server.",
      });
    const { credential } = req.body;
    if (typeof credential !== "string" || credential.length > 4096)
      return res
        .status(400)
        .json({ error: "A Google credential is required." });
    let payload;
    try {
      payload = (
        await google.verifyIdToken({ idToken: credential, audience: clientId })
      ).getPayload();
    } catch {
      return res
        .status(401)
        .json({ error: "Google sign-in could not be verified. Try again." });
    }
    if (!payload?.email || !payload.email_verified)
      return res
        .status(401)
        .json({ error: "Use a Google account with a verified email." });
    if (!allowed(payload.email))
      return res
        .status(403)
        .json({ error: "This Google account is not on the allow list." });
    const user = store.upsertUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });
    res.cookie(
      SESSION_COOKIE,
      store.createSession(user.id),
      cookieOptions(req),
    );
    req.user = user;
    req.devFallbackKey = false;
    res.json({ user: me(req) });
  });
  app.post("/api/auth/logout", (req, res) => {
    store.deleteSession(cookie(req, SESSION_COOKIE));
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });
  const requireUser = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Sign in with Google to continue." });
  app.put("/api/me/openai-key", requireUser, async (req, res) => {
    const apiKey = typeof req.body.key === "string" ? req.body.key.trim() : "";
    if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey))
      return res
        .status(400)
        .json({ error: "Enter an OpenAI API key that starts with sk-." });
    const check = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!check.ok)
      return res.status(400).json({
        error:
          check.status === 401
            ? "OpenAI rejected this key."
            : `OpenAI returned ${check.status} while checking the key.`,
      });
    store.setOpenaiKey(req.user.id, apiKey);
    req.user = store.getUser(req.user.id);
    req.devFallbackKey = false;
    res.json({ user: me(req) });
  });
  app.delete("/api/me/openai-key", requireUser, (req, res) => {
    store.setOpenaiKey(req.user.id, null);
    req.user = store.getUser(req.user.id);
    req.devFallbackKey = !!(devUserEmail && process.env.OPENAI_API_KEY);
    res.json({ user: me(req) });
  });
  app.delete("/api/me", requireUser, (req, res) => {
    store.deleteUser(req.user.id);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });
  return requireUser;
}
