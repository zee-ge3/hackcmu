import { DatabaseSync } from "node:sqlite";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DAY = 86_400_000;
const SESSION_DAYS = 30;

// The secret encrypts stored OpenAI keys. PAIRWISE_SECRET wins; otherwise one is
// generated once and kept next to the database.
function loadSecret(dir) {
  if (process.env.PAIRWISE_SECRET) return process.env.PAIRWISE_SECRET;
  const path = join(dir, ".secret");
  if (!existsSync(path))
    writeFileSync(path, randomBytes(32).toString("hex") + "\n", {
      mode: 0o600,
    });
  return readFileSync(path, "utf8").trim();
}

export function openStore(dir, { file = "pairwise.sqlite" } = {}) {
  mkdirSync(dir, { recursive: true });
  const key = createHash("sha256").update(loadSecret(dir)).digest();
  const db = new DatabaseSync(file === ":memory:" ? file : join(dir, file));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      picture TEXT,
      openai_key TEXT,
      openai_key_hint TEXT,
      created_at INTEGER NOT NULL,
      last_login INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      name TEXT NOT NULL,
      summary TEXT NOT NULL,
      skills TEXT NOT NULL,
      full_text TEXT NOT NULL,
      reviewed_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      title TEXT NOT NULL,
      language TEXT,
      created_at INTEGER NOT NULL,
      finished_at INTEGER NOT NULL,
      feedback TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS resumes_user ON resumes(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS interviews_user ON interviews(user_id, finished_at);
  `);
  const q = (sql) => db.prepare(sql);
  const hash = (token) => createHash("sha256").update(token).digest("hex");
  const hint = (apiKey) => `${apiKey.slice(0, 3)}…${apiKey.slice(-4)}`;
  const encrypt = (text) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
  };
  const decrypt = (blob) => {
    const raw = Buffer.from(blob, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  };
  const publicUser = (row) =>
    row
      ? {
          id: row.id,
          email: row.email,
          name: row.name,
          picture: row.picture,
          openaiKeyHint: row.openai_key_hint,
          createdAt: row.created_at,
        }
      : null;
  const publicResume = (row) =>
    row
      ? {
          id: row.id,
          filename: row.filename,
          profile: {
            name: row.name,
            summary: row.summary,
            skills: JSON.parse(row.skills),
            fullText: row.full_text,
          },
          reviewedText: row.reviewed_text,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  const publicInterview = (row) =>
    row
      ? {
          id: row.id,
          mode: row.mode,
          title: row.title,
          language: row.language,
          createdAt: row.created_at,
          finishedAt: row.finished_at,
          feedback: JSON.parse(row.feedback),
        }
      : null;
  const getUser = (id) => q("SELECT * FROM users WHERE id = ?").get(id) || null;
  const getResume = (userId, id) =>
    publicResume(
      q("SELECT * FROM resumes WHERE user_id = ? AND id = ?").get(userId, id),
    );
  const getInterview = (userId, id) =>
    publicInterview(
      q("SELECT * FROM interviews WHERE user_id = ? AND id = ?").get(
        userId,
        id,
      ),
    );
  return {
    publicUser,
    getUser,
    upsertUser({ sub, email, name = null, picture = null }) {
      const now = Date.now();
      const existing = q("SELECT id FROM users WHERE google_sub = ?").get(sub);
      if (existing)
        q(
          "UPDATE users SET email = ?, name = ?, picture = ?, last_login = ? WHERE id = ?",
        ).run(email, name ?? null, picture ?? null, now, existing.id);
      else
        q(
          "INSERT INTO users (id, google_sub, email, name, picture, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).run(
          randomUUID(),
          sub,
          email,
          name ?? null,
          picture ?? null,
          now,
          now,
        );
      return q("SELECT * FROM users WHERE google_sub = ?").get(sub);
    },
    deleteUser(id) {
      q("DELETE FROM users WHERE id = ?").run(id);
    },
    createSession(userId) {
      const token = randomBytes(32).toString("base64url");
      const now = Date.now();
      q(
        "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
      ).run(hash(token), userId, now, now + SESSION_DAYS * DAY);
      q("DELETE FROM sessions WHERE expires_at < ?").run(now);
      return token;
    },
    userForSession(token) {
      if (typeof token !== "string" || !token) return null;
      return (
        q(
          "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
        ).get(hash(token), Date.now()) || null
      );
    },
    deleteSession(token) {
      if (typeof token === "string" && token)
        q("DELETE FROM sessions WHERE token_hash = ?").run(hash(token));
    },
    setOpenaiKey(userId, apiKey) {
      q(
        "UPDATE users SET openai_key = ?, openai_key_hint = ? WHERE id = ?",
      ).run(
        apiKey ? encrypt(apiKey) : null,
        apiKey ? hint(apiKey) : null,
        userId,
      );
    },
    openaiKey(userId) {
      const row = q("SELECT openai_key FROM users WHERE id = ?").get(userId);
      return row?.openai_key ? decrypt(row.openai_key) : null;
    },
    createResume(userId, { filename, profile }) {
      const id = randomUUID(),
        now = Date.now();
      q(
        "INSERT INTO resumes (id, user_id, filename, name, summary, skills, full_text, reviewed_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        userId,
        filename,
        profile.name || "",
        profile.summary || "",
        JSON.stringify(profile.skills || []),
        profile.fullText,
        profile.fullText,
        now,
        now,
      );
      return getResume(userId, id);
    },
    getResume,
    listResumes(userId) {
      return q(
        "SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC",
      )
        .all(userId)
        .map(publicResume);
    },
    updateResume(userId, id, { reviewedText }) {
      const result = q(
        "UPDATE resumes SET reviewed_text = ?, updated_at = ? WHERE user_id = ? AND id = ?",
      ).run(reviewedText, Date.now(), userId, id);
      return result.changes ? getResume(userId, id) : null;
    },
    deleteResume(userId, id) {
      return (
        q("DELETE FROM resumes WHERE user_id = ? AND id = ?").run(userId, id)
          .changes > 0
      );
    },
    recordInterview(
      userId,
      { id, mode, title, language = null, createdAt, feedback },
    ) {
      q(
        "INSERT OR REPLACE INTO interviews (id, user_id, mode, title, language, created_at, finished_at, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        userId,
        mode,
        title,
        language ?? null,
        createdAt,
        Date.now(),
        JSON.stringify(feedback),
      );
      return getInterview(userId, id);
    },
    getInterview,
    listInterviews(userId) {
      return q(
        "SELECT * FROM interviews WHERE user_id = ? ORDER BY finished_at DESC LIMIT 100",
      )
        .all(userId)
        .map(publicInterview);
    },
    deleteInterview(userId, id) {
      return (
        q("DELETE FROM interviews WHERE user_id = ? AND id = ?").run(userId, id)
          .changes > 0
      );
    },
    close() {
      db.close();
    },
  };
}
