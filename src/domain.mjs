export function filterProblems(
  problems,
  {
    companies = [],
    topics = [],
    difficulty = "all",
    search = "",
    testedOnly = false,
    lists = [],
  } = {},
) {
  return problems.filter(
    (p) =>
      (!testedOnly || p.testCount > 0) &&
      (!lists.length || lists.some((l) => p.lists?.includes(l))) &&
      (difficulty === "all" || p.difficulty === difficulty) &&
      (!companies.length ||
        companies.some((c) => Object.hasOwn(p.companies, c))) &&
      (!topics.length || topics.some((t) => p.tags.includes(t))) &&
      (!search ||
        `${p.id} ${p.title}`.toLowerCase().includes(search.toLowerCase())),
  );
}
export function applyEdit(editor, { expected_revision, code }) {
  if (expected_revision !== editor.revision)
    return { ok: false, error: "Revision conflict. Read the editor again." };
  if (typeof code !== "string" || code.length > 100000)
    return { ok: false, error: "Invalid code" };
  editor.code = code;
  editor.revision++;
  return { ok: true, revision: editor.revision };
}
// LeetCode metaData → the signature the judge needs to call a candidate's
// function with user-authored inputs. Null for class-design problems or
// signatures the adapters cannot decode.
export function deriveSpec(metaData, content = "") {
  let meta = metaData;
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      return null;
    }
  }
  if (!meta || meta.classname || !meta.name || !Array.isArray(meta.params))
    return null;
  const kind = (type) =>
    type === "ListNode" ? "list" : type === "TreeNode" ? "tree" : "json";
  const nested = (type) =>
    /ListNode|TreeNode/.test(type) && !["ListNode", "TreeNode"].includes(type);
  if (meta.params.some((p) => nested(p.type || ""))) return null;
  const params = meta.params.map((p) => ({
    name: p.name,
    type: p.type,
    kind: kind(p.type),
  }));
  const returnType = meta.return?.type || "void";
  let output;
  if (returnType === "void") {
    const index = meta.output?.paramindex;
    if (!Number.isInteger(index) || !params[index]) return null;
    output = `argument:${index}`;
  } else if (nested(returnType)) return null;
  else output = kind(returnType);
  // "in any order" in the statement means the grader must ignore ordering.
  const anyOrder = /\bin any order\b/i.test(String(content));
  return {
    method: meta.name,
    params,
    arguments: params.map((p) => p.kind),
    output,
    returnType,
    comparison: anyOrder
      ? /\[\]\[\]$/.test(returnType)
        ? "triplets"
        : "unordered"
      : "exact",
    derived: true,
  };
}
// Prefers the prepared suite's adapters (they carry the right comparison
// rule) and borrows parameter names from metaData when they line up.
export function testSpecFor(suite, metaData, content = "") {
  const derived = deriveSpec(metaData, content);
  if (!suite) return derived;
  const params =
    derived?.params?.length === suite.arguments.length
      ? derived.params
      : suite.arguments.map((k, i) => ({
          name: `arg${i + 1}`,
          type: k,
          kind: k,
        }));
  return {
    method: suite.method,
    params,
    arguments: suite.arguments,
    output: suite.output,
    returnType: derived?.returnType || null,
    comparison: suite.comparison,
    derived: false,
  };
}
// Turns the candidate's JSON-text cases into a runnable suite; invalid rows
// are reported by index instead of aborting the run.
export function buildCustomSuite(spec, tests) {
  const cases = [];
  const invalid = [];
  (tests || []).forEach((t, index) => {
    const input = [];
    let error = null;
    const raw = Array.isArray(t.input) ? t.input : [];
    if (raw.length !== spec.arguments.length)
      error = `expected ${spec.arguments.length} input${spec.arguments.length === 1 ? "" : "s"}`;
    raw.forEach((text, j) => {
      if (error) return;
      try {
        input.push(JSON.parse(text));
      } catch {
        error = `${spec.params[j]?.name || `input ${j + 1}`} is not valid JSON`;
      }
    });
    // Expected output is optional: a case without one runs and shows its output.
    const hasExpected =
      !error && typeof t.expected === "string" && t.expected.trim();
    let expected;
    if (hasExpected) {
      try {
        expected = JSON.parse(t.expected);
      } catch {
        error = "expected output is not valid JSON";
      }
    }
    if (error) invalid.push({ index, error });
    else
      cases.push({
        id: t.id,
        name: `Case ${index + 1}`,
        index,
        input,
        ...(hasExpected ? { expected } : {}),
      });
  });
  return {
    suite: { ...spec, custom: true, version: 0, cases },
    invalid,
  };
}
// LeetCode example strings hold one JSON value per line, one line per parameter.
export function exampleInputs(examples, spec) {
  if (!spec || !Array.isArray(examples)) return [];
  return examples
    .map((text) => String(text).split("\n"))
    .filter((parts) => parts.length === spec.arguments.length);
}
// Expected outputs printed in a LeetCode statement, in example order.
export function exampleOutputs(html) {
  // Newer statements wrap the value: <strong>Output:</strong> <span class="example-io">…</span>
  return [
    ...String(html || "").matchAll(
      /<strong>\s*Output:?\s*<\/strong>\s*(?:<(?:span|code)[^>]*>\s*)?([^<\n]*)/gi,
    ),
  ]
    .map((m) =>
      m[1]
        .trim()
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&"),
    )
    .map((text) => {
      try {
        JSON.parse(text);
        return text;
      } catch {
        return "";
      }
    });
}
// Seeds the Testcase panel the way LeetCode does: the statement's examples,
// with expected output when the statement or prepared suite supplies it.
export function seedCases(problem, spec, suite) {
  const inputs = exampleInputs(problem.exampleTestcaseList, spec);
  const outputs = exampleOutputs(problem.content);
  return inputs.map((input, i) => {
    let expected = outputs.length === inputs.length ? outputs[i] : "";
    if (suite) {
      try {
        const parsed = JSON.stringify(input.map((x) => JSON.parse(x)));
        const match = suite.cases.find(
          (c) => JSON.stringify(c.input) === parsed,
        );
        if (match) expected = JSON.stringify(match.expected);
      } catch {}
    }
    return { id: `example-${i + 1}`, input, expected };
  });
}
// LeetCode semantics for the toolbar: Submit needs a hidden suite, Run needs a
// callable signature; each degrades one step when that is missing.
export function resolveRunMode(requested, { hasSuite, hasSpec }) {
  let mode = requested;
  let fallback = false;
  if (mode === "submit" && !hasSuite) {
    mode = "run";
    fallback = true;
  }
  if (mode === "run" && !hasSpec) {
    mode = "scratchpad";
    fallback = fallback || requested === "run";
  }
  return { mode, fallback };
}
// Verdict label for the Test Result tab.
export function verdict(result) {
  if (!result) return null;
  if (result.kind === "invalid")
    return { label: "Invalid Testcase", tone: "bad" };
  if (result.kind === "empty")
    return { label: "No testcases", tone: "neutral" };
  const rows = result.results;
  if (!rows) {
    if (result.ok) return { label: "Finished", tone: "neutral" };
    return {
      label: /timed out/i.test(result.output || "")
        ? "Time Limit Exceeded"
        : "Runtime Error",
      tone: "bad",
    };
  }
  if (rows.some((r) => r.error)) return { label: "Runtime Error", tone: "bad" };
  if (rows.some((r) => r.passed === false))
    return { label: "Wrong Answer", tone: "bad" };
  if (rows.some((r) => r.passed === true))
    return { label: "Accepted", tone: "good" };
  return { label: rows.length ? "Finished" : "No testcases", tone: "neutral" };
}
