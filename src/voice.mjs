import { verdict } from "./domain.mjs";
// Phrases that put the interviewer on hold until the candidate speaks again.
export const QUIET =
  /\b(shut up|be quiet|keep quiet|stay quiet|quiet please|quiet for a|stop talking|don'?t talk|give me (a|one|two|five) (minute|moment|sec|second)s?|let me think|let me (just )?(code|work|write)|hold on|one sec\b|hang on|need a (minute|moment|sec))\b/i;
// One spoken sentence for a run, so a silent candidate still hears a reaction.
export function spokenResult(result) {
  const v = verdict(result);
  const rows = result.results || [];
  const failing = rows.find((r) => r.error || r.passed === false);
  if (result.kind === "submit")
    return v.label === "Accepted"
      ? `All ${result.total} hidden tests pass. Nice. What's the time and space complexity?`
      : failing
        ? `${result.passed} of ${result.total} hidden tests pass. ${failing.name} fails${failing.error ? ` with ${failing.error.slice(0, 80)}` : ""}. What input shape would break your approach?`
        : `Submit finished: ${v.label}.`;
  if (v.label === "Accepted")
    return `Your ${rows.length} testcase${rows.length === 1 ? "" : "s"} pass. Ready to submit, or is there an edge case you haven't covered?`;
  if (failing)
    return `${failing.name} ${failing.error ? "throws " + failing.error.slice(0, 80) : "gives the wrong answer"}. What do you think is happening there?`;
  if (v.label === "Time Limit Exceeded")
    return "That run timed out. Where could it be looping?";
  return `Run finished: ${v.label}.`;
}

// Small talk that should not count as re-engaging the interviewer.
export const reengages = (utterance) =>
  utterance.trim().split(/\s+/).length >= 4;
