import React from "react";
// Interviewer persona picker plus the editable system prompt, shared by every setup page.
export function PresetPicker({
  presets,
  style,
  setStyle,
  prompt,
  setPrompt,
  id,
}) {
  const preset = presets.find((p) => p.id === style) || presets[0];
  return (
    <div className="interviewer-config">
      <label className="field-label">Interviewer</label>
      <div className="preset-grid">
        {presets.map((p) => (
          <button
            type="button"
            key={p.id}
            className={style === p.id ? "preset selected" : "preset"}
            onClick={() => {
              setStyle(p.id);
              setPrompt(p.prompt);
            }}
          >
            <strong>{p.name}</strong>
            <span>{p.description}</span>
          </button>
        ))}
      </div>
      <details className="prompt-details">
        <summary>System prompt</summary>
        <textarea
          id={id}
          aria-label="System prompt"
          maxLength={6000}
          rows={7}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div>
          <span>{prompt.length.toLocaleString()} / 6,000</span>
          {prompt !== preset.prompt && (
            <button type="button" onClick={() => setPrompt(preset.prompt)}>
              Reset
            </button>
          )}
        </div>
      </details>
    </div>
  );
}
