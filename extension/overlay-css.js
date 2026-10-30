globalThis.__PINEDIT_CSS = `
:host {
  all: initial;
  --mark: #ff383d;
  --mark-deep: #d61f2a;
  --bg: #111111;
  --card: #161616;
  --row: #1c1c1c;
  --ink: #f4f4f5;
  --muted: #a1a1aa;
  --code: #0c0c0c;
  --field: #222222;
  --line: rgba(255, 255, 255, 0.12);
  --danger: #ff8a84;
  --ok: #22c55e;
  --text: 12px;
  --text-sm: 11px;
  --float: 0 1px 2px rgba(0, 0, 0, 0.05), 0 4px 10px rgba(0, 0, 0, 0.08);
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: none;
  color: var(--ink);
  font-family: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
  font-size: var(--text);
  line-height: 1.4;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
.anchor, .frame, .pin { pointer-events: none; }
.dock, .panel, .card, .pin, .toast, .menu, .chip { pointer-events: auto; }
.anchor {
  position: fixed;
  right: 36px;
  bottom: 36px;
  max-width: calc(100vw - 24px);
  z-index: 4;
}
.dock {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 44px;
  padding: 0 3px;
  max-width: calc(100vw - 32px);
  background: var(--bg);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--float);
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.dock:active { cursor: grabbing; }
.tool {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink);
  flex: none;
  touch-action: none;
}
.tool:hover, .tool.on { background: rgba(127, 127, 127, 0.18); }
.tool.on { color: var(--mark); }
.tool:disabled { color: var(--muted); opacity: 0.35; background: transparent; cursor: default; }
.tool svg,
.opt svg,
.panel-clear svg,
.code-copy svg,
.chip svg {
  width: 16px;
  height: 16px;
  display: block;
  flex: none;
}
.chip svg { width: 22px; height: 22px; }
.tool.send {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: auto;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #2c2c2e;
  color: #f4f4f5;
  font-size: var(--text);
  font-weight: 600;
  box-shadow: none;
}
.tool.send:hover { background: #3a3a3e; color: var(--mark); box-shadow: none; }
.tool.send:disabled,
.tool.send:disabled:hover { background: transparent; color: var(--muted); box-shadow: none; }
.tool.send .send-label { line-height: 1; }
.tool[data-tip]::after,
.chip[data-tip]::after {
  content: attr(data-tip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  padding: 3px 8px;
  border-radius: 6px;
  background: #000000;
  color: #ffffff;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}
.tool[data-tip]:hover::after,
.chip[data-tip]:hover::after { opacity: 1; }
.tool:disabled[data-tip]::after { display: none; }
.panel, .menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  z-index: 2;
}
.anchor.flip .panel,
.anchor.flip .menu {
  bottom: auto;
  top: calc(100% + 6px);
}
.split {
  width: 1px;
  height: 12px;
  margin: 0 5px;
  background: var(--line);
  flex: none;
}
.panel {
  left: 0;
  width: auto;
  max-height: min(560px, calc(100vh - 80px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 6px;
  background: var(--bg);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--float);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px 6px;
}
.panel-title {
  color: var(--muted);
  font-size: var(--text-sm);
  line-height: 16px;
}
.panel-clear {
  position: relative;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
}
.panel-clear:hover { background: rgba(127, 127, 127, 0.18); color: var(--mark); }
.list {
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.list:hover { scrollbar-color: color-mix(in srgb, var(--muted) 70%, transparent) transparent; }
.list::-webkit-scrollbar { width: 10px; height: 10px; }
.list::-webkit-scrollbar-track { background: transparent; }
.list::-webkit-scrollbar-thumb {
  background: transparent;
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
.list:hover::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--muted) 55%, transparent);
}
.list:hover::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--muted) 85%, transparent);
}
.row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 6px;
  background: var(--row);
  color: var(--ink);
  border-radius: 8px;
  cursor: pointer;
}
.row + .row { margin-top: 6px; }
.row .num, .pin, .badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--mark);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
}
.copy { min-width: 0; }
.row .what {
  display: block;
  color: var(--ink);
  font-size: var(--text);
  font-weight: 600;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row .meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
  font-size: var(--text-sm);
  line-height: 16px;
  color: var(--muted);
}
.row .meta-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", "Sarasa Mono SC", ui-monospace, monospace;
}
.sent-note {
  flex: none;
  color: var(--ok);
  font-size: var(--text-sm);
  line-height: 16px;
}
.drop {
  height: 28px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: var(--text);
  padding: 0 4px;
}
.drop:hover { color: var(--danger); }
.empty {
  margin: 4px 6px;
  color: var(--muted);
  font-size: var(--text);
}
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  z-index: 6;
  max-width: min(420px, calc(100vw - 32px));
  margin: 0;
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: rgba(24, 24, 27, 0.92);
  color: #ffffff;
  font-size: 13px;
  line-height: 18px;
  text-align: center;
  box-shadow: var(--float);
  transform: translateX(-50%);
  pointer-events: none;
}
.frame {
  position: fixed;
  border: 1.5px solid color-mix(in srgb, var(--mark) 58%, white);
  border-radius: 8px;
  pointer-events: none;
  z-index: 1;
}
.frame.dashed { border-style: dashed; }
.region-layer {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: auto;
  cursor: crosshair;
}
:host(.region-mode) { cursor: crosshair; }
.region {
  position: fixed;
  z-index: 2;
  border: 1.5px dashed var(--mark);
  border-radius: 8px;
  background: color-mix(in srgb, var(--mark) 10%, transparent);
  pointer-events: none;
}
.pins {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}
.region-mark {
  position: absolute;
  pointer-events: auto;
  border: 1.5px solid var(--mark);
  border-radius: 8px;
  background: color-mix(in srgb, var(--mark) 8%, transparent);
  cursor: default;
  touch-action: none;
  box-sizing: border-box;
}
.region-mark .pin {
  position: absolute;
  left: 10px;
  top: -11px;
  pointer-events: auto;
}
.region-mark.pending { border-style: dashed; }
:host(.region-mode) .region-mark { cursor: move; }
.region-mark .handle {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 11px;
  height: 11px;
  border: 1.5px solid var(--mark);
  border-radius: 3px;
  background: var(--bg);
  cursor: nwse-resize;
  touch-action: none;
}
.region-mark .drop-mini {
  position: absolute;
  right: -9px;
  top: -9px;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #111111;
  color: #ffffff;
  pointer-events: auto;
}
.region-mark .drop-mini svg { width: 12px; height: 12px; }
.region-mark .handle,
.region-mark .drop-mini { display: none; }
:host(.region-mode) .region-mark .handle { display: block; }
:host(.region-mode) .region-mark .drop-mini { display: grid; }
.pin-save {
  height: 28px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--mark);
  color: #ffffff;
  font-size: var(--text);
  font-weight: 600;
}
.pin-save:hover { background: var(--mark-deep); }
.pin-save:disabled { background: transparent; color: var(--muted); cursor: default; }
.badge {
  position: absolute;
  top: -11px;
  left: 10px;
  box-shadow: 0 0 0 2px #ffffff;
}
.pin {
  position: fixed;
  z-index: 2147483646;
  border: 0;
  padding: 0;
  box-shadow: 0 0 0 2px #ffffff;
}
.tip {
  position: absolute;
  left: 50%;
  top: -6px;
  transform: translate(-50%, -100%);
  max-width: min(240px, 70vw);
  padding: 2px 8px;
  border-radius: 8px;
  background: #141414;
  color: #ffffff;
  font-size: var(--text);
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tip.below {
  top: auto;
  bottom: -6px;
  transform: translate(-50%, 100%);
}
.card {
  position: fixed;
  width: min(260px, calc(100vw - 16px));
  z-index: 5;
  padding: 8px 10px 10px;
  background: var(--card);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--float);
  animation: rise 180ms ease-out;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin: 0 0 8px;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 2px 0;
  color: var(--ink);
  font-size: var(--text);
  font-weight: 600;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.card-head:active { cursor: grabbing; }
.desc {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.size {
  flex: none;
  color: var(--muted);
  font-family: "SF Mono", "Sarasa Mono SC", ui-monospace, monospace;
  font-size: var(--text-sm);
  font-weight: 500;
}
.chev { display: inline-block; color: var(--muted); transition: transform 160ms ease; }
.chev.open { transform: rotate(90deg); }
.code {
  margin: 0 0 8px;
  padding: 8px;
  background: var(--code);
  border-radius: 8px;
  color: var(--ink);
  font-family: "SF Mono", "Sarasa Mono SC", ui-monospace, monospace;
  font-size: var(--text-sm);
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.code-float {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 6px);
  margin: 0;
  max-height: 45vh;
  overflow: auto;
  padding: 8px 10px;
  background: var(--code);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--float);
}
.code-float.below {
  bottom: auto;
  top: calc(100% + 6px);
}
.code .prop { color: var(--muted); }
.code .punct { color: var(--muted); }
.code .val { color: var(--ink); }
textarea {
  display: block;
  width: 100%;
  height: 34px;
  min-height: 34px;
  max-height: 106px;
  resize: none;
  overflow-y: hidden;
  border: 0;
  background: var(--field);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--ink);
  font-size: var(--text);
  line-height: 18px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--muted) 70%, transparent) transparent;
}
textarea::-webkit-scrollbar { width: 10px; }
textarea::-webkit-scrollbar-track { background: transparent; }
textarea::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  background-clip: padding-box;
}
textarea::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--muted) 85%, transparent);
  background-clip: padding-box;
}
textarea::placeholder { color: var(--muted); }
textarea:focus { outline: 1px solid var(--mark); }
.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.text {
  height: 26px;
  border: 0;
  background: transparent;
  color: var(--ink);
  padding: 0 8px;
  font-size: var(--text);
  border-radius: 6px;
}
.text:hover { background: rgba(127, 127, 127, 0.18); }
.menu {
  width: min(264px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  display: grid;
  gap: 10px;
  padding: 10px;
  overflow: auto;
  scrollbar-width: none;
  background: var(--card);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--float);
}
.menu::-webkit-scrollbar { width: 0; height: 0; display: none; }
.menu-rule {
  width: 100%;
  height: 1px;
  background: var(--line);
}
.menu-label {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-sm);
  line-height: 16px;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
  font-size: var(--text);
  color: var(--ink);
}
.switch-label {
  flex: 1;
  min-width: 0;
  line-height: 20px;
  white-space: nowrap;
}
.switch {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  display: block;
  flex: none;
  align-self: center;
  width: 36px;
  height: 20px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(127, 127, 127, 0.35);
  line-height: 0;
  transition: background 140ms ease;
}
.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 140ms ease;
}
.switch.on { background: var(--mark); }
.switch.on::after { transform: translateX(16px); }
.group { display: grid; gap: 6px; }
.swatches { display: flex; gap: 8px; padding: 3px 2px; }
.swatch {
  width: 16px;
  height: 16px;
  border: 0;
  border-radius: 50%;
  padding: 0;
  background: var(--swatch);
}
.swatch.on { box-shadow: 0 0 0 2px var(--card), 0 0 0 3.5px var(--swatch); }
.opts { display: flex; gap: 6px; }
.opt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: var(--text);
}
.opt.on {
  border-color: var(--mark);
  color: var(--ink);
}
.opt svg { display: block; }
.mcp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mcp-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: var(--text-sm);
}
.state-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mark-deep);
}
.state-dot.ok { background: var(--ok); }
.code-wrap { position: relative; }
.mcp-code {
  margin: 0;
  padding: 8px 30px 8px 8px;
  background: var(--code);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  font-family: "SF Mono", "Sarasa Mono SC", ui-monospace, monospace;
  font-size: var(--text-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.code-copy {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
}
.code-copy:hover { background: rgba(127, 127, 127, 0.2); color: var(--ink); }
.chip {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--bg);
  color: var(--ink);
  box-shadow: var(--float);
  cursor: grab;
  touch-action: none;
}
.chip:active { cursor: grabbing; }
.chip .count {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--mark);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  text-align: center;
  z-index: 1;
}
.chip[data-tip]::after {
  left: auto;
  right: calc(100% + 8px);
  bottom: 50%;
  transform: translateY(50%);
}
@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .card { animation: none; }
}
:host(.light) {
  --bg: #ffffff;
  --card: #ffffff;
  --row: #f4f4f5;
  --ink: #18181b;
  --muted: #71717a;
  --code: #f4f4f5;
  --field: #f4f4f5;
  --line: rgba(0, 0, 0, 0.1);
  --danger: #c4232a;
}
:host(.light) .split,
:host(.light) .menu-rule { background: #e5e5e5; }
:host(.light) .tool.send { background: #f4f4f5; color: #6c6c6c; box-shadow: none; }
:host(.light) .tool.send:hover { background: #d4d4d8; color: var(--mark); box-shadow: none; }
:host(.light) .tool.send:disabled,
:host(.light) .tool.send:disabled:hover { background: transparent; color: var(--muted); box-shadow: none; }
`;
