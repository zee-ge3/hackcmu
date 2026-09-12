// Monaco themes that match the IDE surface tokens in style.css, so the editor
// is the same green-tinted dark (or the same white) as the toolbars and the
// test panel around it instead of VS Code's neutral grey.
const dark = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "e6efd8" },
    { token: "comment", foreground: "7b896e", fontStyle: "italic" },
    { token: "keyword", foreground: "9fba78" },
    { token: "keyword.json", foreground: "9fba78" },
    { token: "string", foreground: "d9c98a" },
    { token: "string.escape", foreground: "e8dba6" },
    { token: "number", foreground: "c9e79b" },
    { token: "regexp", foreground: "d9a58a" },
    { token: "type.identifier", foreground: "a8c8d8" },
    { token: "type", foreground: "a8c8d8" },
    { token: "identifier", foreground: "e6efd8" },
    { token: "delimiter", foreground: "b9c8a8" },
    { token: "delimiter.bracket", foreground: "b9c8a8" },
    { token: "operator", foreground: "b9c8a8" },
    { token: "tag", foreground: "9fba78" },
    { token: "attribute.name", foreground: "a8c8d8" },
  ],
  colors: {
    "editor.background": "#1c201a",
    "editor.foreground": "#e6efd8",
    "editorGutter.background": "#1c201a",
    "editorLineNumber.foreground": "#5f6b54",
    "editorLineNumber.activeForeground": "#b9c8a8",
    "editor.lineHighlightBackground": "#222620",
    "editor.lineHighlightBorder": "#222620",
    "editor.selectionBackground": "#33452a",
    "editor.inactiveSelectionBackground": "#2b3526",
    "editor.selectionHighlightBackground": "#2b3a2580",
    "editor.wordHighlightBackground": "#2b3a2580",
    "editor.findMatchBackground": "#45592f",
    "editor.findMatchHighlightBackground": "#2b3a25",
    "editorCursor.foreground": "#d4eeab",
    "editorIndentGuide.background": "#2c3326",
    "editorIndentGuide.activeBackground": "#3a4233",
    "editorWhitespace.foreground": "#2c3326",
    "editorBracketMatch.background": "#2b3a25",
    "editorBracketMatch.border": "#45592f",
    "editorOverviewRuler.border": "#1c201a",
    "editorWidget.background": "#222620",
    "editorWidget.border": "#33382e",
    "editorSuggestWidget.background": "#222620",
    "editorSuggestWidget.border": "#33382e",
    "editorSuggestWidget.selectedBackground": "#2c3126",
    "editorHoverWidget.background": "#222620",
    "editorHoverWidget.border": "#33382e",
    "list.hoverBackground": "#2c3126",
    "scrollbarSlider.background": "#2c332680",
    "scrollbarSlider.hoverBackground": "#3a4233a0",
    "scrollbarSlider.activeBackground": "#45592fc0",
    "scrollbar.shadow": "#00000000",
    focusBorder: "#45592f",
    "input.background": "#272c24",
    "input.border": "#3a4233",
    "input.foreground": "#e6efd8",
  },
};
const light = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "", foreground: "1f2620" },
    { token: "comment", foreground: "8a967f", fontStyle: "italic" },
    { token: "keyword", foreground: "4c7a2c" },
    { token: "keyword.json", foreground: "4c7a2c" },
    { token: "string", foreground: "8a6d1f" },
    { token: "string.escape", foreground: "a3842a" },
    { token: "number", foreground: "2f6b2f" },
    { token: "regexp", foreground: "a3452f" },
    { token: "type.identifier", foreground: "2f5d8a" },
    { token: "type", foreground: "2f5d8a" },
    { token: "identifier", foreground: "1f2620" },
    { token: "delimiter", foreground: "55634c" },
    { token: "delimiter.bracket", foreground: "55634c" },
    { token: "operator", foreground: "55634c" },
    { token: "tag", foreground: "4c7a2c" },
    { token: "attribute.name", foreground: "2f5d8a" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#1f2620",
    "editorGutter.background": "#ffffff",
    "editorLineNumber.foreground": "#a5ad9c",
    "editorLineNumber.activeForeground": "#55634c",
    "editor.lineHighlightBackground": "#f5f7f0",
    "editor.lineHighlightBorder": "#f5f7f0",
    "editor.selectionBackground": "#dbe7cb",
    "editor.inactiveSelectionBackground": "#eaf0e0",
    "editor.selectionHighlightBackground": "#e6efd980",
    "editor.wordHighlightBackground": "#e6efd980",
    "editor.findMatchBackground": "#cfe0bb",
    "editor.findMatchHighlightBackground": "#e6efd9",
    "editorCursor.foreground": "#2f4a1e",
    "editorIndentGuide.background": "#e7ebe1",
    "editorIndentGuide.activeBackground": "#d4dccb",
    "editorWhitespace.foreground": "#e7ebe1",
    "editorBracketMatch.background": "#e6efd9",
    "editorBracketMatch.border": "#a6ba92",
    "editorOverviewRuler.border": "#ffffff",
    "editorWidget.background": "#f6f8f2",
    "editorWidget.border": "#e2e6dd",
    "editorSuggestWidget.background": "#f6f8f2",
    "editorSuggestWidget.border": "#e2e6dd",
    "editorSuggestWidget.selectedBackground": "#e9eee2",
    "editorHoverWidget.background": "#f6f8f2",
    "editorHoverWidget.border": "#e2e6dd",
    "list.hoverBackground": "#e9eee2",
    "scrollbarSlider.background": "#d4dccb80",
    "scrollbarSlider.hoverBackground": "#c3cbbba0",
    "scrollbarSlider.activeBackground": "#a6ba92c0",
    "scrollbar.shadow": "#00000000",
    focusBorder: "#a6ba92",
    "input.background": "#f1f4ec",
    "input.border": "#d4dccb",
    "input.foreground": "#1f2620",
  },
};
export function defineIdeThemes(monaco) {
  monaco.editor.defineTheme("pairwise-dark", dark);
  monaco.editor.defineTheme("pairwise-light", light);
}
export const IDE_THEME_KEY = "pairwise-ide-theme";
export function storedIdeTheme() {
  try {
    return localStorage.getItem(IDE_THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
export function rememberIdeTheme(theme) {
  try {
    localStorage.setItem(IDE_THEME_KEY, theme);
  } catch {}
}
export const monacoTheme = (theme) =>
  theme === "light" ? "pairwise-light" : "pairwise-dark";
