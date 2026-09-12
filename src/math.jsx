import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
const escape = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Renders text containing $…$ / $$…$$ / \(…\) / \[…\] segments with KaTeX;
// everything else is escaped, and paragraphs are split on blank lines.
export function renderMath(text) {
  const parts = [];
  const re =
    /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;
  let last = 0,
    m;
  while ((m = re.exec(text))) {
    parts.push(escape(text.slice(last, m.index)));
    const display = m[1] !== undefined || m[2] !== undefined;
    const tex = m[1] ?? m[2] ?? m[3] ?? m[4];
    try {
      parts.push(
        katex.renderToString(tex, {
          displayMode: display,
          throwOnError: false,
          strict: "ignore",
        }),
      );
    } catch {
      parts.push(escape(m[0]));
    }
    last = m.index + m[0].length;
  }
  parts.push(escape(text.slice(last)));
  return parts
    .join("")
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}
export function MathText({ text, className = "" }) {
  const html = useMemo(() => renderMath(text || ""), [text]);
  return (
    <div
      className={"math-text " + className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
