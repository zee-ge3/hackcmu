# Pairwise

A local web application for speech-to-speech coding and behavioral interview practice. GPT-Live-1 conducts the conversation, with a shared Monaco editor, résumé context, drawable whiteboard, and structured feedback.

## Run

Requires Node.js 22.13 or newer (the account store uses the built-in `node:sqlite` module).

```sh
git clone https://github.com/zee-ge3/hackcmu.git
cd hackcmu
npm ci
cp .env.example .env
# Set GOOGLE_CLIENT_ID in .env (see Accounts below).
npm run dev
```

Open http://localhost:3000, sign in with Google, add your OpenAI API key on the profile page, then choose Coding or Behavioral. Each mode has its own setup page. On `/coding`, choose company tags, difficulty, topics, problem count (1–10), and JavaScript or Python. Choose an interviewer style (Supportive coach, Realistic interview, Socratic guide, or Senior-level deep dive), optionally edit its system prompt, and enter the room. Microphone access is requested automatically; Alex greets you once connected. This is speech-to-speech only: ask for hints, reviews, tests, and edits out loud. There is no chat input.

```sh
npm run build
npm start
```

The server binds to loopback. To serve it under another hostname (for example through a Cloudflare Tunnel), list that origin in `PUBLIC_ORIGIN`; API writes from any other browser origin are rejected. `.env` is ignored by Git.

## Accounts, keys, and storage

Sign-in uses Google Identity Services. Create an OAuth 2.0 **Web application** client in the Google Cloud Console (APIs & Services → Credentials), add every origin the app is served from to *Authorized JavaScript origins* (for example `http://localhost:3000` and your public hostname), and put the client ID in `GOOGLE_CLIENT_ID`. The browser sends Google's ID token to `/api/auth/google`, the server verifies it with `google-auth-library`, and a 30-day HTTP-only session cookie is issued. Set `ALLOWED_EMAILS` to a comma-separated list to restrict who can sign in; leave it empty to allow any Google account.

Every model call — résumé parsing, whiteboard descriptions, the voice session, the reasoning backend, and grading — runs on the signed-in user's **own OpenAI API key**. Keys are entered on `/profile`, verified against `GET /v1/models`, encrypted with AES-256-GCM, and never returned to the browser beyond a `sk-…xxxx` hint. The encryption secret comes from `PAIRWISE_SECRET` or is generated once into `data/.secret`. There is no server-wide key in production.

Per-account data lives in `data/pairwise.sqlite` (ignored by Git): users, sessions, parsed résumés with their reviewed text, and the feedback from finished interviews. The profile page lists saved résumés and past feedback, and can delete either or the whole account. Live interviews (editor contents, transcripts, whiteboard images) stay in server memory and are discarded after three idle hours or on restart; export a session from the feedback screen to keep its code and conversation.

For development and the browser tests, set `DEV_USER_EMAIL` to sign every request in as that address without Google. That user falls back to `OPENAI_API_KEY` from `.env` when no key is saved on the profile. Both are ignored when `NODE_ENV=production`.

## Problem library

The repository includes 4,042 catalog entries in `data/leetcode.json`, imported from the original `interviewagent` project, plus the cached problem statements and starter code in `data/details/`.

The original scrape includes company frequencies, difficulty, and topics. It did not include statements for every problem. The app fetches public statements and starter code from LeetCode when creating an interview, caching them under `data/details/`. The existing Two Sum detail was copied from the original project's `data/leetcode_problems/` cache. Premium-only entries are excluded from interview selection. If LeetCode cannot supply a statement, session creation reports the error rather than substituting an invented problem.

Company selections use OR; topic selections use OR; company, topic, difficulty, and search constraints are combined with AND. The requested number is sampled without replacement.

## Voice and shared editor

The browser sends its WebRTC SDP offer to the trusted server, which creates a `gpt-live-1` session at `/v1/live/sessions`. Audio goes over WebRTC; its data channel carries lifecycle events and transcripts. The client waits for `session.started`, requests a greeting with an instruction followed by commentary after acknowledgment, retains transcript fragments and timing, and requests graceful close before releasing audio devices. Caption rows group same-speaker fragments using a 1.8-second gap while preserving overlapping speech and deduplicating events. Backend tool responses are not displayed as duplicate spoken captions.

Client delegation forwards conversation context and the selected problem to a server-side Responses request using `OPENAI_BACKEND_MODEL` (default `gpt-5.6-terra`). Its tools can read the editor, replace code using a revision check, and request a browser run. If the candidate types during a review, newer local text is retained and an available agent edit is surfaced for review. Test output goes back into subsequent agent context.

**Run** executes the whole file as a scratchpad. **Run tests** invokes the LeetCode function (JavaScript) or Solution method (Python) automatically against a prepared suite; no example calls need to be added to the editor. Both run in disposable browser workers with a 15-second deadline. Python uses locally served Pyodide. These demo suites are visible in the browser and are not LeetCode’s official hidden tests. A pass is evidence about the tested inputs, not proof of universal correctness.

Interviews live in server memory. Restarting the server loses sessions. Export the session from the feedback screen to retain code and conversation. Voice reconnection starts a new voice session; the backend retains the current editor and app conversation during the current page lifetime.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:browser
# Uses real OpenAI calls and a simulated microphone; incurs API usage:
LIVE_SMOKE=1 npm run test:browser
```

The browser tests require a running development server (`BASE_URL` overrides `http://localhost:3000`) started with `DEV_USER_EMAIL` set, plus `OPENAI_API_KEY` for the live variants. It covers filtered session creation, Monaco editing, JavaScript and Python execution. The opt-in live test uses a bundled synthetic speech fixture to verify automatic voice startup and greeting, nonzero received audio, spoken-request delegation, an actual editor change, grouped captions, structured rubric feedback, and graceful voice shutdown. Default tests mock voice and grading to avoid API usage.

## API references

- [GPT-Live announcement](https://openai.com/index/introducing-gpt-live-1-in-the-api/)
- [GPT-Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live)
- [Client delegation](https://developers.openai.com/api/docs/guides/live-delegation)
- [Session lifecycle and transcripts](https://developers.openai.com/api/docs/guides/live-conversations)

## Feedback rubric

Finishing the interview closes voice gracefully and grades all selected problems using the code, run output, spoken transcript, and an audit of agent edits. A strict JSON schema supplies five fixed criteria: problem solving, correctness & testing, language familiarity, communication clarity, and code quality. Each gets a 1–5 score (or null when not observed), supporting evidence, and an actionable improvement. The UI renders consistent cards plus strengths and next steps, rather than displaying unparsed model Markdown. The grader distinguishes candidate work from interviewer edits and uses the same rubric across interviewer styles.

## Prepared test suites

The initial batch includes **677 precomputed cases across 15 problems** in `data/test-suites/`. The setup screen defaults to “Problems with prepared tests only”; turn it off to use the rest of the catalog. Covered problems also have their statements and starter code cached for the demo.

Coverage: Two Sum, Two Sum II, Contains Duplicate, Valid Anagram, Valid Parentheses, Binary Search, Search Insert Position, Best Time to Buy and Sell Stock, Maximum Subarray, Move Zeroes, Merge Intervals, Reverse Linked List, Maximum Depth of Binary Tree, Invert Binary Tree, and 3Sum.

Each versioned JSON suite stores its method name, input/output adapters, comparison rule, test inputs, and expected outputs. Cases include examples, boundaries, deterministic generated inputs, and larger inputs. Input validation enforces the cached problem’s constraints, including uniqueness of the Two Sum answer. Expected outputs are cross-checked offline between independent oracles and reference implementations. The runtime only loads these files; it does not generate cases during an interview.

The judge supports linked-list and level-order tree conversion, in-place array mutation, and order-insensitive comparisons where allowed. It preserves required order for Two Sum II, detects cyclic returned structures, and shows pass counts with input/expected/actual diagnostics for failures. Test results are shared with the interviewer and retained as grading evidence.

```sh
npm run tests:generate             # Deterministically regenerate and validate JSON suites
node scripts/cache-tested-problems.mjs  # Cache missing statements; verify entry-point names
npm test                          # Reference acceptance, incorrect-solution rejection, adapters
npm run test:judge                # All 677 cases in both browser languages; dev server required
npm run test:browser              # Includes the Run tests UI flow; no paid API calls by default
```

To add a problem, define its inputs, independent oracle, reference implementation, and adapter metadata in `scripts/test-problems.mjs`, add its constraint checks and a Python reference fixture, then run generation and verification. Increment the suite version when intentionally changing an existing suite’s grading behavior. Browser timing is a coarse safeguard, not a calibrated complexity benchmark.

## Behavioral practice and whiteboard

On `/behavioral`, pick a saved résumé or upload a PDF, DOCX, or TXT file (up to 5 MB). The server uses `OPENAI_CONTEXT_MODEL` (default `gpt-5.6-luna`) to extract factual experience into a structured profile saved to your account. Review and correct the extracted text (edits are stored with the résumé when you enter the room), select a target role and focus, and choose Story coach, Hiring manager, or Leadership deep dive. The system prompt is editable. The reviewed résumé is supplied to both the voice interviewer and reasoning backend; Alex starts with a question about your background when connected.

Behavioral feedback uses story structure, ownership and judgment, impact and evidence, collaboration and learning, and communication clarity. Scores reflect observed answers; résumé claims alone do not earn a score. The behavioral room shows résumé context and a whiteboard, without coding controls.

Both modes include a whiteboard with pen, arrows, labels, eraser, undo, and clear. After a 1.4-second drawing pause, a PNG snapshot goes to the context model for a short description. The voice agent receives that description silently through `session.thinking.append`; the reasoning backend also receives the image when handling a spoken request. The UI reports pending, shared, and failed states and offers retry. Revision checks discard superseded image analysis. Code and drawing survive tab switches; each coding problem has its own drawing. Finishing or advancing flushes pending drawing changes before continuing.

Uploaded documents are processed by OpenAI with your key. Parsed résumé context is stored in `data/pairwise.sqlite` under your account; canvas snapshots live in server memory and disappear on restart. Neither is written to the repository. Feedback exports include reviewed résumé text and drawing strokes, so exports may contain personal information.

```sh
npm run test:modes                # Mocked résumé, voice, vision, and feedback UI checks
LIVE_MODES=1 npm run test:modes   # Real parsing, voice greeting/audio, vision, reasoning, feedback; incurs API usage
```

The mode tests use synthetic résumé data. The coding browser test also checks code/whiteboard switching. Unit tests cover document validation and stale vision responses. API implementation references: [document inputs](https://developers.openai.com/api/docs/guides/file-inputs) and [image inputs](https://developers.openai.com/api/docs/guides/images-vision).
