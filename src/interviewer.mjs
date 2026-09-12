export const interviewerPresets = [
  {
    id: "supportive",
    name: "Supportive coach",
    description: "Patient, encouraging, with gentle nudges.",
    prompt:
      "You are Alex, a patient and encouraging technical interviewer. Make the candidate comfortable, give them time to think, and ask one question at a time. Ask clarifying questions before offering a small hint. Encourage them to explain their reasoning. Never reveal a full solution unless explicitly asked. Keep feedback candid and specific.",
  },
  {
    id: "realistic",
    name: "Realistic interview",
    description: "Professional, focused, and close to the real thing.",
    prompt:
      "You are Alex, a professional technical interviewer conducting a realistic software engineering interview. Be friendly but direct. Let the candidate drive their solution. Probe assumptions, edge cases, complexity, and testing. Offer hints only when requested. Ask one focused question at a time and avoid excessive praise. Leave room for silence while the candidate thinks.",
  },
  {
    id: "socratic",
    name: "Socratic guide",
    description: "Help the candidate discover the next step.",
    prompt:
      "You are Alex, a Socratic technical interviewer. Help the candidate find answers through careful questions. Ask them to trace a small example, explain an invariant, or compare approaches. Give one question at a time. Avoid giving implementation details unless explicitly requested. Be curious, patient, and concise.",
  },
  {
    id: "senior",
    name: "Senior-level deep dive",
    description: "Explore tradeoffs, rigor, and maintainability.",
    prompt:
      "You are Alex, a senior engineering interviewer. Probe reasoning rigor, complexity tradeoffs, invariants, boundary conditions, language semantics, and code maintainability. Expect the candidate to justify choices and design meaningful tests. Be respectful, direct, and concise. Ask one challenging follow-up at a time, adjusting to the candidate’s progress.",
  },
];
export const rubric = [
  {
    id: "problem_solving",
    label: "Problem solving",
    description:
      "Clarifies requirements, chooses an approach, reasons about tradeoffs and complexity.",
  },
  {
    id: "correctness",
    label: "Correctness & testing",
    description:
      "Handles requirements and edge cases, writes their own testcases beyond the examples, interprets results.",
  },
  {
    id: "language_familiarity",
    label: "Language familiarity",
    description:
      "Uses the selected language, data structures, and APIs accurately and idiomatically.",
  },
  {
    id: "clarity",
    label: "Communication clarity",
    description:
      "Explains assumptions, reasoning, and decisions clearly during the spoken conversation.",
  },
  {
    id: "code_quality",
    label: "Code quality",
    description:
      "Writes readable, organized code with clear names and appropriate simplicity.",
  },
];
export const scoreLabels = {
  1: "Needs work",
  2: "Developing",
  3: "Competent",
  4: "Strong",
  5: "Excellent",
};
const criterion = {
  type: "object",
  properties: {
    score: { type: ["integer", "null"], minimum: 1, maximum: 5 },
    evidence: { type: "string" },
    improvement: { type: "string" },
  },
  required: ["score", "evidence", "improvement"],
  additionalProperties: false,
};
export const feedbackSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    criteria: {
      type: "object",
      properties: Object.fromEntries(rubric.map((r) => [r.id, criterion])),
      required: rubric.map((r) => r.id),
      additionalProperties: false,
    },
    strengths: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "criteria", "strengths", "next_steps"],
  additionalProperties: false,
};
export function groupTranscript(fragments) {
  const groups = [],
    latest = new Map(),
    seen = new Set();
  for (const fragment of fragments) {
    if (!fragment.text || !["user", "assistant"].includes(fragment.role))
      continue;
    if (fragment.id && seen.has(fragment.id)) continue;
    if (fragment.id) seen.add(fragment.id);
    const segment = fragment.segment || 0,
      key = `${segment}:${fragment.role}`,
      previous = latest.get(key);
    const start = fragment.start_ms ?? 0,
      end = fragment.end_ms ?? start;
    if (
      previous &&
      start >= previous.start_ms &&
      start - previous.end_ms <= 1800
    ) {
      previous.text += fragment.text;
      previous.end_ms = Math.max(previous.end_ms, end);
    } else {
      const group = {
        role: fragment.role,
        text: fragment.text,
        start_ms: start,
        end_ms: end,
        segment,
        key: fragment.id || `${segment}-${groups.length}`,
      };
      groups.push(group);
      latest.set(key, group);
    }
  }
  return groups.sort(
    (a, b) => a.segment - b.segment || a.start_ms - b.start_ms,
  );
}
