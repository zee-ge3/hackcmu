// Alex's whiteboard sketches: shapes from the backend (100×100 grid) become
// ordinary strokes on the 1200×800 canvas, in Alex's own ink so its drawing
// is told apart from the candidate's.
export const ALEX_INK = "#7a5aa6";
export const PREPARED_INK = "#3b6d8a";
const W = 1200,
  H = 800;
export function shapeStrokes(shape, by = "alex", color = ALEX_INK) {
  const X = (v) => (v / 100) * W,
    Y = (v) => (v / 100) * H;
  const base = { color, by };
  const { kind, x, y, w, h, text } = shape;
  // Text on a box or circle is drawn centred inside it (24px sans ≈ 13px per
  // character), so "a box that says 7" needs one shape, not two.
  const inside = (cx, cy) =>
    text.trim()
      ? [
          {
            ...base,
            tool: "text",
            text: text.trim(),
            points: [{ x: cx - text.trim().length * 6.5, y: cy + 8 }],
          },
        ]
      : [];
  if (kind === "label")
    return [{ ...base, tool: "text", text, points: [{ x: X(x), y: Y(y) }] }];
  if (kind === "arrow" || kind === "line")
    return [
      {
        ...base,
        tool: kind === "arrow" ? "arrow" : "pen",
        points: [
          { x: X(x), y: Y(y) },
          { x: X(x + w), y: Y(y + h) },
        ],
      },
    ];
  if (kind === "circle") {
    const cx = X(x + w / 2),
      cy = Y(y + h / 2),
      rx = Math.abs(X(w) / 2),
      ry = Math.abs(Y(h) / 2);
    const points = Array.from({ length: 41 }, (_, i) => {
      const t = (i / 40) * Math.PI * 2;
      return { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
    });
    return [{ ...base, tool: "pen", points }, ...inside(cx, cy)];
  }
  const x2 = X(x + w),
    y2 = Y(y + h);
  return [
    {
      ...base,
      tool: "pen",
      points: [
        { x: X(x), y: Y(y) },
        { x: x2, y: Y(y) },
        { x: x2, y: y2 },
        { x: X(x), y: y2 },
        { x: X(x), y: Y(y) },
      ],
    },
    ...inside((X(x) + x2) / 2, (Y(y) + y2) / 2),
  ];
}
