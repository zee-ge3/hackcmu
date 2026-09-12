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
