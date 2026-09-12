// Testcases the interviewer adds to the candidate's panel. Same shape and
// limits as the candidate's own (JSON text per argument, optional expected),
// validated here so a malformed tool call never lands in the panel.
const MAX_CASES = 50;
const MAX_TEXT = 60000;
const parses = (text) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};
export function addTestcases(session, index, args, now = Date.now()) {
  const problem = session.problems?.[index];
  const spec = problem?.testSpec;
  if (!spec)
    return {
      error:
        "This problem has no callable signature, so the Testcase panel is not available.",
    };
  const raw = Array.isArray(args?.cases) ? args.cases.slice(0, 5) : [];
  if (!raw.length) return { error: "Give at least one case." };
  const names = spec.params.map((p) => p.name);
  const cases = [];
  const rejected = [];
  raw.forEach((c, i) => {
    const inputs = Array.isArray(c?.inputs) ? c.inputs : null;
    const expected = typeof c?.expected === "string" ? c.expected.trim() : "";
    if (!inputs || inputs.length !== names.length)
      return rejected.push(
        `case ${i + 1}: expected ${names.length} input${names.length === 1 ? "" : "s"} (${names.join(", ")})`,
      );
    const bad = inputs.findIndex(
      (x) => typeof x !== "string" || x.length > MAX_TEXT || !parses(x),
    );
    if (bad >= 0)
      return rejected.push(
        `case ${i + 1}: ${names[bad]} must be JSON text (got ${JSON.stringify(String(inputs[bad] ?? "")).slice(0, 60)})`,
      );
    if (expected && (expected.length > MAX_TEXT || !parses(expected)))
      return rejected.push(
        `case ${i + 1}: expected must be JSON text or empty`,
      );
    cases.push({
      id: `alex-${now.toString(36)}-${i}`,
      input: inputs,
      expected,
      by: "alex",
    });
  });
  const current = session.customTests?.[index] || [];
  if (cases.length && current.length + cases.length > MAX_CASES)
    return {
      error: `The panel holds ${MAX_CASES} cases; it has ${current.length}.`,
    };
  if (!cases.length) return { error: rejected.join("; ") };
  session.customTests ??= [];
  session.customTests[index] = [...current, ...cases];
  return {
    ok: true,
    added: cases.map((c, i) => ({ case: current.length + i + 1, ...c })),
    total: session.customTests[index].length,
    ...(rejected.length ? { rejected } : {}),
  };
}
