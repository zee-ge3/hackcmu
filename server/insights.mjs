// Cross-session analysis: which rubric criteria and subject areas score lowest.
const average = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function buildInsights(interviews, rubrics) {
  const modes = {};
  const topics = {};
  const trend = [];
  for (const interview of interviews) {
    const rubric = rubrics[interview.mode] || [];
    const scores = rubric
      .map((r) => ({
        id: r.id,
        label: r.label,
        score: interview.feedback?.criteria?.[r.id]?.score,
      }))
      .filter((c) => typeof c.score === "number");
    const overall = average(scores.map((c) => c.score));
    const mode = (modes[interview.mode] ??= {
      count: 0,
      criteria: {},
      overall: [],
    });
    mode.count++;
    if (overall !== null) mode.overall.push(overall);
    for (const c of scores) {
      const slot = (mode.criteria[c.id] ??= { label: c.label, scores: [] });
      slot.scores.push(c.score);
    }
    for (const topic of interview.topics || []) {
      const slot = (topics[topic] ??= { scores: [], modes: new Set() });
      if (overall !== null) slot.scores.push(overall);
      slot.modes.add(interview.mode);
    }
    if (overall !== null)
      trend.push({
        id: interview.id,
        at: interview.finishedAt,
        mode: interview.mode,
        title: interview.title,
        score: overall,
      });
  }
  const summarize = (slot) => ({
    avg: average(slot.scores),
    n: slot.scores.length,
  });
  const modeSummary = Object.fromEntries(
    Object.entries(modes).map(([mode, m]) => [
      mode,
      {
        count: m.count,
        avg: average(m.overall),
        criteria: Object.entries(m.criteria)
          .map(([id, c]) => ({ id, label: c.label, ...summarize(c) }))
          .sort((a, b) => a.avg - b.avg),
      },
    ]),
  );
  const topicRows = Object.entries(topics)
    .map(([topic, t]) => ({ topic, ...summarize(t), modes: [...t.modes] }))
    .filter((t) => t.n > 0);
  return {
    sessions: interviews.length,
    modes: modeSummary,
    weakest: [...topicRows]
      .sort((a, b) => a.avg - b.avg || b.n - a.n)
      .slice(0, 8),
    strongest: [...topicRows]
      .sort((a, b) => b.avg - a.avg || b.n - a.n)
      .slice(0, 5),
    weakestCriteria: Object.entries(modeSummary)
      .flatMap(([mode, m]) => m.criteria.map((c) => ({ mode, ...c })))
      .filter((c) => c.n > 0)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5),
    trend: trend.sort((a, b) => a.at - b.at).slice(-12),
  };
}
