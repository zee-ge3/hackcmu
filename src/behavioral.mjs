import { feedbackSchema } from "./interviewer.mjs";
export const behavioralPresets = [
  {
    id: "behavioral-coach",
    name: "Story coach",
    description: "Find the story and make your contribution clear.",
    prompt:
      "You are Alex, a warm behavioral interview coach. Ask one question at a time using the candidate’s resume and target role. Help them explain a specific situation, their own actions, and the outcome. Ask a thoughtful follow-up before moving on. Do not invent achievements or turn the conversation into a coding test.",
  },
  {
    id: "behavioral-realistic",
    name: "Hiring manager",
    description: "A focused conversation about how you work.",
    prompt:
      "You are Alex, a hiring manager conducting a realistic behavioral interview. Use the candidate’s resume to ask focused questions about ownership, collaboration, setbacks, and impact. Let the candidate finish, then probe for specific decisions and outcomes. Be professional and candid. Ask one question at a time. Do not ask them to write code or invent details from their background.",
  },
  {
    id: "behavioral-leadership",
    name: "Leadership deep dive",
    description: "Decisions, influence, and difficult tradeoffs.",
    prompt:
      "You are Alex, a behavioral interviewer focused on leadership. Ground questions in the candidate’s actual resume. Explore influencing others, handling disagreement, making tradeoffs, and learning from failure. Ask one specific follow-up at a time, distinguishing team outcomes from the candidate’s own contribution. Do not invent experience.",
  },
];
export const behavioralRubric = [
  {
    id: "story_structure",
    label: "Story structure",
    description:
      "Explains the situation, responsibility, actions, and result coherently.",
  },
  {
    id: "ownership",
    label: "Ownership & judgment",
    description:
      "Makes their personal contribution, decisions, and tradeoffs explicit.",
  },
  {
    id: "impact",
    label: "Impact & evidence",
    description:
      "Supports outcomes with concrete examples and appropriate evidence.",
  },
  {
    id: "collaboration",
    label: "Collaboration & learning",
    description:
      "Reflects on working with others, handling difficulty, and what they learned.",
  },
  {
    id: "clarity",
    label: "Communication clarity",
    description:
      "Answers the question directly with enough detail and a clear narrative.",
  },
];
export const behavioralFeedbackSchema = {
  ...feedbackSchema,
  properties: {
    ...feedbackSchema.properties,
    criteria: {
      type: "object",
      properties: Object.fromEntries(
        behavioralRubric.map((r) => [
          r.id,
          feedbackSchema.properties.criteria.properties.clarity,
        ]),
      ),
      required: behavioralRubric.map((r) => r.id),
      additionalProperties: false,
    },
  },
};
export const resumeSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    fullText: { type: "string" },
  },
  required: ["name", "summary", "skills", "fullText"],
  additionalProperties: false,
};
