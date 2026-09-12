import { verdict } from "./domain.mjs";
// Phrases that put the interviewer on hold until the candidate speaks again.
export const QUIET =
  /\b(shut up|be quiet|keep quiet|stay quiet|quiet please|quiet for a|stop talking|don'?t talk|give me (a|one|two|five) (minute|moment|sec|second)s?(?=\s*($|[.,!?;]|to\b|here\b|please\b|and\b|so\b|while\b|ok\b|okay\b))|let me think|let me (just )?(code|work|write)|need a (minute|moment|sec)(?=\s*($|[.,!?;]|to\b|here\b|please\b)))/i;
// Interjections that only count when they are the whole utterance ("hold on"),
// not narration ("I'll hold on to the left pointer").
export const QUIET_SHORT = /^\W*(hold on|hang on|one sec(ond)?|wait)\W*$/i;
export const asksQuiet = (utterance) =>
  QUIET.test(utterance) || QUIET_SHORT.test(utterance.trim());
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
  utterance.trim().split(/\s+/).length >= 4 || /\balex\b/i.test(utterance);

// Silence policy. A human interviewer checks in after about a minute of
// silence, then backs off (2, then 4 minutes) so a quiet candidate is not
// nagged; speaking again resets the back-off. Quiet mode suppresses it.
export function checkInDue(c, now) {
  if (c.quietUntil > now) return false;
  if (now - c.lastSpeechAt < 60000) return false;
  const gap = Math.min(4, 2 ** (c.checkIns || 0)) * 60000;
  return now - c.lastCheckInAt >= gap;
}
export const checkInRequest = (coding) =>
  coding
    ? "Check-in: the candidate has been working silently for over a minute. In at most two sentences, acknowledge the specific progress you can see (editor, notes, or whiteboard) and ask them to talk through their current step. No hints unless they are clearly stuck."
    : "Check-in: the candidate has been silent for over a minute with no visible progress. In one or two sentences, check in gently: ask whether they want to think out loud, or whether a clarifying question about the problem would help. No hints unless they are clearly stuck.";
