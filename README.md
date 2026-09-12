# Pairwise

A local web application for practicing live technical interviews with GPT-Live-1, a shared Monaco editor, and a Responses backend that can review and edit the candidate's code.

## Run

Requires Node.js 22.6 or newer.

```sh
git clone https://github.com/zee-ge3/hackcmu.git
cd hackcmu
npm ci
cp .env.example .env
# Set OPENAI_API_KEY in .env.
npm run dev
```

Open http://localhost:3000. Choose company tags, difficulty, topics, problem count (1–10), and JavaScript or Python. Choose an interviewer style (Supportive coach, Realistic interview, Socratic guide, or Senior-level deep dive), optionally edit its system prompt, and enter the room. Microphone access is requested automatically; Alex greets you once connected. This is speech-to-speech only: ask for hints, reviews, tests, and edits out loud. There is no chat input.

```sh
npm run build
npm start
```

The server binds to loopback. The project API key stays in the server environment; `.env` is ignored by Git. Browser sessions have an HTTP-only owner cookie. This is a local application, not an internet deployment with user accounts, durable storage, and billing controls.

## Problem library

The repository includes 4,042 catalog entries in `data/leetcode.json`, imported from the original `interviewagent` project, plus the cached problem statements and starter code in `data/details/`.

The original scrape includes company frequencies, difficulty, and topics. It did not include statements for every problem. The app fetches public statements and starter code from LeetCode when creating an interview, caching them under `data/details/`. The existing Two Sum detail was copied from the original project's `data/leetcode_problems/` cache. Premium-only entries are excluded from interview selection. If LeetCode cannot supply a statement, session creation reports the error rather than substituting an invented problem.

Company selections use OR; topic selections use OR; company, topic, difficulty, and search constraints are combined with AND. The requested number is sampled without replacement.

## Voice and shared editor

The browser sends its WebRTC SDP offer to the trusted server, which creates a `gpt-live-1` session at `/v1/live/sessions`. Audio goes over WebRTC; its data channel carries lifecycle events and transcripts. The client waits for `session.started`, requests a greeting with an instruction followed by commentary after acknowledgment, retains transcript fragments and timing, and requests graceful close before releasing audio devices. Caption rows group same-speaker fragments using a 1.8-second gap while preserving overlapping speech and deduplicating events. Backend tool responses are not displayed as duplicate spoken captions.

Client delegation forwards conversation context and the selected problem to a server-side Responses request using `OPENAI_BACKEND_MODEL` (default `gpt-5.6-terra`). Its tools can read the editor, replace code using a revision check, and request a browser run. If the candidate types during a review, newer local text is retained and an available agent edit is surfaced for review. Test output goes back into subsequent agent context.

The Run button executes the whole file in a disposable browser worker with a 15-second deadline. JavaScript runs directly; Python uses locally served Pyodide. Include example calls or assertions in the file. This is an interactive scratchpad, not a full LeetCode submission judge or hidden-test service. Successful execution alone does not establish solution correctness.

Interviews live in server memory. Restarting the server loses sessions. Export the session from the feedback screen to retain code and conversation. Voice reconnection starts a new voice session; the backend retains the current editor and app conversation during the current page lifetime.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:browser
# Uses real OpenAI calls and a simulated microphone; incurs API usage:
LIVE_SMOKE=1 npm run test:browser
```

The browser smoke test requires a running development server on port 3000. It covers filtered session creation, Monaco editing, JavaScript and Python execution. The opt-in live test uses a bundled synthetic speech fixture to verify automatic voice startup and greeting, nonzero received audio, spoken-request delegation, an actual editor change, grouped captions, structured rubric feedback, and graceful voice shutdown. Default tests mock voice and grading to avoid API usage.

## API references

- [GPT-Live announcement](https://openai.com/index/introducing-gpt-live-1-in-the-api/)
- [GPT-Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live)
- [Client delegation](https://developers.openai.com/api/docs/guides/live-delegation)
- [Session lifecycle and transcripts](https://developers.openai.com/api/docs/guides/live-conversations)

## Feedback rubric

Finishing the interview closes voice gracefully and grades all selected problems using the code, run output, spoken transcript, and an audit of agent edits. A strict JSON schema supplies five fixed criteria: problem solving, correctness & testing, language familiarity, communication clarity, and code quality. Each gets a 1–5 score (or null when not observed), supporting evidence, and an actionable improvement. The UI renders consistent cards plus strengths and next steps, rather than displaying unparsed model Markdown. The grader distinguishes candidate work from interviewer edits and uses the same rubric across interviewer styles.
