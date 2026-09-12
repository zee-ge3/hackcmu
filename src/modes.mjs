import { feedbackSchema } from "./interviewer.mjs";

// Shared definitions for the probability and system design modes.
const criterion = feedbackSchema.properties.criteria.properties.clarity;
export const makeFeedbackSchema = (rubric) => ({
  ...feedbackSchema,
  properties: {
    ...feedbackSchema.properties,
    criteria: {
      type: "object",
      properties: Object.fromEntries(rubric.map((r) => [r.id, criterion])),
      required: rubric.map((r) => r.id),
      additionalProperties: false,
    },
  },
});

export const probabilityPresets = [
  {
    id: "quant-coach",
    name: "Quant coach",
    description: "Nudges toward the right framing without solving it for you.",
    prompt:
      "You are Alex, a patient quant interview coach running a spoken probability interview. Read the problem with the candidate, ask how they would model it, and let them reason aloud. Give one small hint at a time only when they are stuck or ask. Never state the final answer unless they have submitted a correct one or give up. Keep speech short.",
  },
  {
    id: "trading-firm",
    name: "Trading-desk interviewer",
    description: "Fast, precise, and expects a number with justification.",
    prompt:
      "You are Alex, an interviewer at a quantitative trading firm. Run the probability question like a real phone screen: expect a clear setup, a computed answer, and a sanity check. Push on assumptions and ask for bounds or a quick estimate before the exact answer. Hints only on request. Be direct and concise.",
  },
  {
    id: "socratic-prob",
    name: "Socratic guide",
    description:
      "Questions that lead to symmetry, conditioning, or expectation.",
    prompt:
      "You are Alex, a Socratic probability tutor. Help the candidate discover the key idea (symmetry, conditioning, linearity of expectation, complementary counting) by asking short questions and small cases. Never reveal the answer directly. One question at a time.",
  },
];
export const probabilityRubric = [
  {
    id: "framing",
    label: "Problem framing",
    description:
      "Defines the sample space, events, and assumptions before computing.",
  },
  {
    id: "reasoning",
    label: "Probabilistic reasoning",
    description:
      "Chooses fitting tools: conditioning, symmetry, expectation, counting, recursion.",
  },
  {
    id: "accuracy",
    label: "Computation & answer",
    description:
      "Reaches the correct value with careful arithmetic and clear intermediate results.",
  },
  {
    id: "verification",
    label: "Sanity checks",
    description:
      "Tests bounds, small cases, or a second method before committing.",
  },
  {
    id: "clarity",
    label: "Communication clarity",
    description:
      "Explains the model and each step aloud so the interviewer can follow.",
  },
];
export const probabilityFeedbackSchema = makeFeedbackSchema(probabilityRubric);
export const sourceLabels = {
  quantprof: "QuantProf",
  quantprof_youtube: "QuantProf video",
  aops_wiki: "AoPS",
  MATH: "MATH",
  AIME: "AIME",
  AIMO_AMC: "AMC",
  AIMO_AIME: "AIME (validation)",
};
export const probabilityLevels = {
  intro: { label: "Intro", test: (d) => d !== null && d <= 3 },
  core: { label: "Core", test: (d) => d !== null && d >= 4 && d <= 6 },
  hard: { label: "Hard", test: (d) => d !== null && d >= 7 },
};

// Compares a candidate's answer with the reference locally; null means unsure.
export function matchAnswer(candidate, reference) {
  const value = (text) => {
    if (typeof text !== "string") return null;
    let s = text
      .trim()
      .replace(/\\boxed\{([^}]*)\}/g, "$1")
      .replace(/\\left|\\right|\\!|\\,|\;|\$|\s+/g, "")
      .replace(/\\dfrac|\\tfrac|\\frac/g, "frac")
      .replace(/\\cdot|\\times/g, "*")
      .replace(/\^\{([^}]*)\}/g, "^($1)")
      .replace(/\\sqrt\{([^}]*)\}/g, "sqrt($1)")
      .replace(/\\pi/g, "pi")
      .replace(/%$/, "/100");
    s = s.replace(/frac\{([^}]*)\}\{([^}]*)\}/g, "(($1)/($2))");
    if (!/^[\d\s+\-*/().^a-z]*$/i.test(s) || !s) return null;
    if (/[a-z]/i.test(s.replace(/sqrt|pi|e/gi, ""))) return null;
    try {
      const expr = s
        .replace(/\^/g, "**")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/(?<![A-Za-z])pi(?![A-Za-z])/g, "Math.PI")
        .replace(/(?<![A-Za-z.])e(?![A-Za-z])/g, "Math.E");
      const n = Function(`"use strict";return (${expr});`)();
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  };
  const a = value(candidate),
    b = value(reference);
  if (a === null || b === null) return null;
  return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-4);
}

export const designPresets = [
  {
    id: "design-staff",
    name: "Staff engineer",
    description: "Adds constraints as you go and probes every tradeoff.",
    prompt:
      "You are Alex, a staff engineer running a spoken system design interview. Start with the brief, let the candidate clarify requirements and estimate scale, then introduce new constraints one at a time as the design takes shape. Probe bottlenecks, failure modes, consistency, and cost. Ask one question at a time and keep speech concise.",
  },
  {
    id: "design-collab",
    name: "Collaborative architect",
    description: "Builds the design with you and thinks out loud too.",
    prompt:
      "You are Alex, a friendly architect pairing on a system design problem. Guide the candidate through requirements, high-level components, data model, and scaling. Offer small suggestions when they stall, but let them own the decisions. Introduce new constraints gently and explain why they matter. Keep speech short.",
  },
  {
    id: "design-skeptic",
    name: "Skeptical reviewer",
    description: "Challenges assumptions and asks what breaks first.",
    prompt:
      "You are Alex, a skeptical design reviewer. For every component the candidate proposes, ask what breaks first under load or failure and how they would know. Add constraints that stress the current design. Be respectful, direct, and concise; one challenge at a time.",
  },
];
export const designRubric = [
  {
    id: "requirements",
    label: "Requirements & scoping",
    description:
      "Clarifies functional and non-functional needs, estimates scale, states assumptions.",
  },
  {
    id: "architecture",
    label: "High-level design",
    description:
      "Proposes coherent components and data flow that satisfy the requirements.",
  },
  {
    id: "data",
    label: "Data model & APIs",
    description:
      "Defines storage choices, schemas, and interfaces with justified access patterns.",
  },
  {
    id: "scaling",
    label: "Scaling & tradeoffs",
    description:
      "Adapts to each added constraint, finds bottlenecks, and weighs alternatives.",
  },
  {
    id: "clarity",
    label: "Communication clarity",
    description:
      "Structures the discussion, uses the whiteboard, and explains decisions.",
  },
];
export const designFeedbackSchema = makeFeedbackSchema(designRubric);
export const designDurations = [20, 30, 45];

// Each problem starts from a short brief; later stages add constraints the
// interviewer reveals as the design matures (by time or when a step is done).
export const designProblems = [
  {
    id: "url-shortener",
    title: "URL shortener",
    category: "Storage & APIs",
    summary: "Short links, redirects, and analytics at scale.",
    brief:
      "Design a service like bit.ly: users submit a long URL and receive a short link that redirects to it. Start with the core API, how short codes are generated, and where links are stored.",
    stages: [
      {
        at: 0.3,
        title: "Read-heavy scale",
        constraint:
          "Traffic is now 100M redirects per day with a 100:1 read-to-write ratio, and p99 redirect latency must stay under 50 ms worldwide.",
      },
      {
        at: 0.55,
        title: "Custom aliases and expiry",
        constraint:
          "Users can pick custom aliases, links can expire, and deleted or expired links must stop redirecting within seconds everywhere.",
      },
      {
        at: 0.8,
        title: "Click analytics",
        constraint:
          "Product wants per-link click counts, referrers, and countries with a near-real-time dashboard, without slowing redirects.",
      },
    ],
  },
  {
    id: "rate-limiter",
    title: "Distributed rate limiter",
    category: "Infrastructure",
    summary: "Protect APIs with per-client limits across many servers.",
    brief:
      "Design a rate limiter for a public API: each client key gets N requests per minute. Begin with the algorithm, where the limiter runs, and what happens when a request is rejected.",
    stages: [
      {
        at: 0.3,
        title: "Many gateways",
        constraint:
          "Requests arrive at 200 stateless API gateways in three regions; limits must be enforced globally per key with at most 5% over-admission.",
      },
      {
        at: 0.55,
        title: "Tiered and burst limits",
        constraint:
          "Add per-endpoint limits, burst allowances, and enterprise tiers whose limits can change at runtime without redeploys.",
      },
      {
        at: 0.8,
        title: "Store outage",
        constraint:
          "The shared counter store becomes unavailable for two minutes. Decide fail-open vs fail-closed and how to keep abuse bounded.",
      },
    ],
  },
  {
    id: "news-feed",
    title: "Social news feed",
    category: "Social",
    summary: "Ranked timelines for hundreds of millions of users.",
    brief:
      "Design the home feed for a social network: users follow others and see their posts. Start with post creation, feed retrieval, and the fan-out strategy.",
    stages: [
      {
        at: 0.3,
        title: "Celebrities",
        constraint:
          "Some accounts have 50M followers. A single post from them must not take minutes to appear or overwhelm the write path.",
      },
      {
        at: 0.55,
        title: "Ranking and media",
        constraint:
          "The feed is ranked by a model using engagement signals, and posts carry images and short video that must load quickly on mobile.",
      },
      {
        at: 0.8,
        title: "Deletes and privacy",
        constraint:
          "A deleted or made-private post must disappear from every feed within seconds, and blocked users must never see each other.",
      },
    ],
  },
  {
    id: "chat",
    title: "Real-time chat",
    category: "Messaging",
    summary: "One-to-one and group messaging with delivery guarantees.",
    brief:
      "Design a messaging app like WhatsApp: one-to-one and group chats with online delivery and message history. Begin with connections, message flow, and storage.",
    stages: [
      {
        at: 0.3,
        title: "Offline and multi-device",
        constraint:
          "Users have several devices and are often offline; every message must arrive exactly once per device, in order, with read receipts.",
      },
      {
        at: 0.55,
        title: "Large groups",
        constraint:
          "Groups can have 10,000 members. Sending must stay fast and the fan-out must not melt the message store.",
      },
      {
        at: 0.8,
        title: "End-to-end encryption",
        constraint:
          "Messages must be end-to-end encrypted. Explain what the server can and cannot do now (search, moderation, backups).",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notification system",
    category: "Messaging",
    summary: "Push, SMS, and email at scale with user preferences.",
    brief:
      "Design a notification platform used by many internal teams to send push, SMS, and email. Start with the ingestion API, the pipeline, and how providers are called.",
    stages: [
      {
        at: 0.3,
        title: "Preferences and dedup",
        constraint:
          "Users set channel preferences and quiet hours, and the same event must never notify a user twice even when producers retry.",
      },
      {
        at: 0.55,
        title: "Priority and volume",
        constraint:
          "10M notifications per hour at peak with a critical tier (security alerts) that must deliver within 10 seconds even during a marketing blast.",
      },
      {
        at: 0.8,
        title: "Provider failures",
        constraint:
          "An SMS provider degrades to 30% success. Design failover, retries with backoff, and how you would observe delivery rates.",
      },
    ],
  },
  {
    id: "ride-matching",
    title: "Ride matching",
    category: "Geo & realtime",
    summary: "Match riders to nearby drivers in real time.",
    brief:
      "Design the matching core of a ride-hailing app: drivers stream locations, riders request trips, and the system pairs them. Begin with location ingestion, indexing, and the match flow.",
    stages: [
      {
        at: 0.3,
        title: "City-scale load",
        constraint:
          "1M active drivers update location every 4 seconds; a match must be proposed within 2 seconds of a request.",
      },
      {
        at: 0.55,
        title: "Surge and fairness",
        constraint:
          "Pricing depends on local supply and demand, and drivers should not be starved of requests. Add surge computation and fair dispatch.",
      },
      {
        at: 0.8,
        title: "Region outage",
        constraint:
          "A data-center region hosting the index goes down. Keep matching available for the affected cities with degraded accuracy at most.",
      },
    ],
  },
  {
    id: "kv-store",
    title: "Distributed key-value store",
    category: "Storage",
    summary: "A Dynamo-style store with replication and partitioning.",
    brief:
      "Design a distributed key-value store exposing get and put. Start with partitioning, replication, and the client-facing consistency you promise.",
    stages: [
      {
        at: 0.3,
        title: "Node churn",
        constraint:
          "Nodes join and fail frequently. Rebalancing must not pause writes, and no more than 1/N of keys should move when a node is added.",
      },
      {
        at: 0.55,
        title: "Tunable consistency",
        constraint:
          "Some tenants need read-your-writes and linearizable reads for certain keys; others prefer availability. Support both.",
      },
      {
        at: 0.8,
        title: "Hot keys and large values",
        constraint:
          "A handful of keys receive 40% of traffic and some values are 50 MB. Keep tail latency bounded.",
      },
    ],
  },
  {
    id: "web-crawler",
    title: "Web crawler",
    category: "Data pipelines",
    summary: "Crawl billions of pages politely and keep them fresh.",
    brief:
      "Design a web crawler that fetches pages for a search index. Start with the frontier, fetching, parsing, and how you avoid crawling the same page twice.",
    stages: [
      {
        at: 0.3,
        title: "Politeness and scale",
        constraint:
          "Crawl 1B pages per month while never exceeding one request per second per host and honoring robots.txt.",
      },
      {
        at: 0.55,
        title: "Freshness",
        constraint:
          "News sites must be recrawled within minutes, static sites weekly. Prioritize the frontier by change rate and importance.",
      },
      {
        at: 0.8,
        title: "Traps and duplicates",
        constraint:
          "Handle crawler traps, near-duplicate content, and JavaScript-rendered pages without wasting most of your fetch budget.",
      },
    ],
  },
  {
    id: "ticket-booking",
    title: "Ticket booking",
    category: "Transactions",
    summary: "Sell seats for hot events without double booking.",
    brief:
      "Design a ticketing system for concerts: users browse events, pick seats, and pay. Start with the data model, seat holds, and the purchase flow.",
    stages: [
      {
        at: 0.3,
        title: "Flash sale",
        constraint:
          "A stadium on-sale brings 2M users in the first minute for 60,000 seats. No double booking, and the site must stay responsive.",
      },
      {
        at: 0.55,
        title: "Payments and holds",
        constraint:
          "Seats are held for 8 minutes during payment; payment providers are slow and sometimes time out after charging. Guarantee no lost or duplicated charges.",
      },
      {
        at: 0.8,
        title: "Fair queueing and bots",
        constraint:
          "Introduce a virtual waiting room that is fair, resistant to bots, and lets you throttle admission based on backend health.",
      },
    ],
  },
  {
    id: "video-streaming",
    title: "Video upload and streaming",
    category: "Media",
    summary: "Upload, transcode, and stream video globally.",
    brief:
      "Design a video platform like YouTube's core: creators upload videos and viewers stream them. Begin with upload, processing, storage, and playback.",
    stages: [
      {
        at: 0.3,
        title: "Global playback",
        constraint:
          "Viewers are worldwide on unreliable mobile networks; playback must start within 2 seconds and adapt quality mid-stream.",
      },
      {
        at: 0.55,
        title: "Processing pipeline",
        constraint:
          "Uploads peak at 500 hours of video per minute. Transcoding to multiple resolutions must finish within minutes and survive worker failures.",
      },
      {
        at: 0.8,
        title: "View counts and abuse",
        constraint:
          "Show accurate view counts, detect view fraud, and remove reported videos everywhere within a minute.",
      },
    ],
  },
  {
    id: "autocomplete",
    title: "Search autocomplete",
    category: "Search",
    summary: "Suggest queries within milliseconds as users type.",
    brief:
      "Design a typeahead service for a search box: as the user types, return the top suggestions. Start with the data structure, how suggestions are ranked, and the serving path.",
    stages: [
      {
        at: 0.3,
        title: "Latency budget",
        constraint:
          "Serve 50,000 requests per second with p99 under 30 ms including network, for prefixes in many languages.",
      },
      {
        at: 0.55,
        title: "Fresh trends",
        constraint:
          "Suggestions must reflect trending queries within minutes, without rebuilding the whole index each time.",
      },
      {
        at: 0.8,
        title: "Personalization and safety",
        constraint:
          "Add per-user personalization and filtering of offensive or policy-violating suggestions, still within the latency budget.",
      },
    ],
  },
  {
    id: "distributed-cache",
    title: "Distributed cache",
    category: "Infrastructure",
    summary: "A memcached-style tier in front of databases.",
    brief:
      "Design a distributed in-memory cache used by many services. Start with the API, how keys map to nodes, eviction, and how clients discover nodes.",
    stages: [
      {
        at: 0.3,
        title: "Consistency with the database",
        constraint:
          "Services update the database directly. Bound how stale cached values can be and avoid the classic write-then-read race.",
      },
      {
        at: 0.55,
        title: "Thundering herd",
        constraint:
          "A popular key expires and 20,000 requests miss at once. Prevent the database from being flooded.",
      },
      {
        at: 0.8,
        title: "Multi-region",
        constraint:
          "Deploy across three regions with a 100 ms RTT. Decide replication strategy and what happens during a partition.",
      },
    ],
  },
];
