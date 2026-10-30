(() => {
if (document.querySelector("pinedit-root")) return;
const API_MESSAGE = "pinedit:http";
const MCP_FALLBACK = `{
  "mcpServers": {
    "pinedit": {
      "command": "npx",
      "args": ["-y", "pinedit-mcp"]
    }
  }
}`;
const COLORS = ["#ff383d", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3c8dff", "#a855f7"];

const state = {
  open: false,
  notes: [],
  pendingRegions: [],
  draft: null,
  editingId: null,
  overwriteArmed: false,
  menuOpen: false,
  listOpen: false,
  theme: "light",
  color: "#ff383d",
  marksVisible: true,
  regionMode: false,
  rightClickClose: true,
  collapsed: false,
  mcp: false,
  mcpConfig: MCP_FALLBACK,
  installed: false,
  animPaused: false,
  animAvailable: false,
  adjustingRegion: false,
  dragging: false,
  dragEndedAt: 0,
  clickFromDrag: false,
  eatPageClick: false,
  pickingText: false,
  cardRect: null,
};

const host = document.createElement("pinedit-root");
host.style.all = "initial";
const shadow = host.attachShadow({ mode: "open" });
const style = document.createElement("style");
style.textContent = globalThis.__PINEDIT_CSS || "";
shadow.append(style);

const anchor = el("div", "anchor");

const menu = el("div", "menu");
menu.hidden = true;

const colorGroup = el("div", "group");
colorGroup.append(el("p", "menu-label", "颜色"));
const swatches = el("div", "swatches");
for (const color of COLORS) {
  const swatch = button("swatch");
  swatch.style.setProperty("--swatch", color);
  swatch.dataset.color = color;
  swatch.setAttribute("aria-label", color);
  swatch.title = color;
  swatch.addEventListener("click", () => {
    state.color = color;
    applyLook();
    savePrefs();
  });
  swatches.append(swatch);
}
colorGroup.append(swatches);

const themeGroup = el("div", "group");
themeGroup.append(el("p", "menu-label", "外观"));
const themeOpts = el("div", "opts");
const lightOpt = option("亮色", sunIcon());
const darkOpt = option("暗色", moonIcon());
lightOpt.addEventListener("click", () => setTheme("light"));
darkOpt.addEventListener("click", () => setTheme("dark"));
themeOpts.append(lightOpt, darkOpt);
themeGroup.append(themeOpts);

const mcpGroup = el("div", "group");
const mcpHead = el("div", "mcp-head");
const mcpLabel = el("p", "menu-label", "MCP");
const mcpState = el("span", "mcp-state");
const stateDot = el("span", "state-dot");
const stateText = el("span", "", "未连接");
mcpState.append(stateDot, stateText);
mcpHead.append(mcpLabel, mcpState);
const codeWrap = el("div", "code-wrap");
const mcpCode = el("pre", "mcp-code", MCP_FALLBACK);
const copyMcp = button("code-copy");
copyMcp.setAttribute("aria-label", "复制 MCP 配置");
copyMcp.dataset.tip = "复制";
copyMcp.append(fileIcon("copy"));
codeWrap.append(mcpCode, copyMcp);
const mcpNote = el("p", "menu-label", "");
mcpNote.hidden = true;
mcpGroup.append(mcpHead, codeWrap, mcpNote);

const behaviorGroup = el("div", "group");
behaviorGroup.append(el("p", "menu-label", "操作"));
const switchRow = el("div", "switch-row");
const rightClickOpt = button("switch");
rightClickOpt.setAttribute("role", "switch");
rightClickOpt.setAttribute("aria-label", "右键关闭标注弹窗");
rightClickOpt.dataset.opt = "right-click";
rightClickOpt.addEventListener("click", () => {
  state.rightClickClose = !state.rightClickClose;
  applyLook();
  savePrefs();
});
switchRow.append(el("span", "switch-label", "右键关闭标注弹窗"), rightClickOpt);
behaviorGroup.append(switchRow);
const menuRule = () => el("div", "menu-rule");
menu.append(colorGroup, menuRule(), themeGroup, menuRule(), behaviorGroup, menuRule(), mcpGroup);

const panel = el("div", "panel");
panel.hidden = true;
const panelHead = el("div", "panel-head");
const panelTitle = el("span", "panel-title", "标注");
const clearBtn = button("panel-clear");
clearBtn.dataset.tip = "清空";
clearBtn.setAttribute("aria-label", "清空");
const list = el("div", "list");
panelHead.append(panelTitle, clearBtn);
panel.append(panelHead, list);

const dock = el("div", "dock");
const playBtn = button("tool");
playBtn.dataset.tip = "播放动画";
const marksBtn = button("tool");
marksBtn.dataset.tip = "隐藏标注";
const listBtn = button("tool");
listBtn.dataset.tip = "标注列表";
const copyBtn = button("tool");
copyBtn.dataset.tip = "复制标注";
const regionBtn = button("tool");
regionBtn.dataset.tip = "选区标注";
const pinBtn = button("tool send");
pinBtn.dataset.tip = "发给 AI";
pinBtn.hidden = true;
const gearBtn = button("tool");
gearBtn.dataset.tip = "设置";
const split = el("span", "split");
const closeBtn = button("tool");
closeBtn.dataset.tip = "收起";
dock.append(playBtn, marksBtn, listBtn, copyBtn, regionBtn, pinBtn, gearBtn, split, closeBtn);

const chip = button("chip");
chip.dataset.tip = "PinEdit";
const count = el("span", "count", "0");
count.hidden = true;
chip.append(fileIcon("float", 22), count);
chip.hidden = true;

const toast = el("div", "toast");
toast.hidden = true;
anchor.append(panel, menu, dock, chip);

const frame = el("div", "frame");
frame.hidden = true;
const tip = el("div", "tip");
const badge = el("span", "badge", "1");
frame.append(tip, badge);
const pinLayer = el("div", "pins");
const textLayer = el("div", "text-layer");
const card = el("div", "card");
card.hidden = true;
const regionLayer = el("div", "region-layer");
regionLayer.hidden = true;
const regionPreview = el("div", "region");
regionPreview.hidden = true;
shadow.append(anchor, frame, textLayer, pinLayer, regionLayer, regionPreview, card, toast);
document.documentElement.append(host);
host.hidden = true;

closeBtn.addEventListener("click", () => collapse(true));
chip.addEventListener("click", () => {
  if (state.dragging) return;
  collapse(false);
});
playBtn.addEventListener("click", () => toggleAnimations());
marksBtn.addEventListener("click", () => {
  state.marksVisible = !state.marksVisible;
  if (!state.marksVisible) hideFrame();
  syncLabels();
  render();
});
listBtn.addEventListener("click", () => {
  state.listOpen = !state.listOpen;
  closeMenu();
  render();
});
regionBtn.addEventListener("click", () => setRegionMode(!state.regionMode));
clearBtn.addEventListener("click", () => {
  state.notes = [];
  state.pendingRegions = [];
  state.overwriteArmed = false;
  state.listOpen = false;
  closeCard();
  persist();
  render();
  setStatus("已清空。");
});
gearBtn.addEventListener("click", () => {
  state.menuOpen = !state.menuOpen;
  menu.hidden = !state.menuOpen;
  if (state.menuOpen) {
    if (card.hidden) hideFrame();
    refreshMcp();
  }
  syncLabels();
  fitAnchor();
});
copyMcp.addEventListener("click", async () => {
  const copied = await copyText(state.mcpConfig);
  copyMcp.dataset.tip = copied ? "已复制" : "复制失败";
  setTimeout(() => {
    copyMcp.dataset.tip = "复制";
  }, 1200);
});
bindDrag(dock);
bindDrag(chip);
pinBtn.addEventListener("click", () => {
  handoff().catch(() => setStatus("没交出去。刷新这个页面后再点一次。"));
});
copyBtn.addEventListener("click", () => copyNotes());

document.addEventListener("click", (event) => {
  if (state.clickFromDrag) {
    state.clickFromDrag = false;
    if (!isOurs(event)) return;
    event.stopPropagation();
    event.preventDefault();
    return;
  }
  if (!state.eatPageClick || isOurs(event)) return;
  state.eatPageClick = false;
  event.preventDefault();
  event.stopPropagation();
}, true);
for (const type of ["mousedown", "mouseup"]) {
  document.addEventListener(type, (event) => {
    if (!state.eatPageClick || isOurs(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}
document.addEventListener("pointerup", (event) => {
  if (!state.eatPageClick || isOurs(event)) return;
  event.preventDefault();
  event.stopPropagation();
  setTimeout(() => {
    state.eatPageClick = false;
  }, 0);
}, true);

document.addEventListener("pointermove", onMove, true);
document.addEventListener("pointerdown", onDown, true);
document.addEventListener("contextmenu", (event) => {
  if (!state.rightClickClose || card.hidden) return;
  event.preventDefault();
  event.stopPropagation();
  closeCard();
}, true);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!card.hidden) closeCard();
  else if (state.regionMode) setRegionMode(false);
  else if (state.menuOpen) gearBtn.click();
}, true);
window.addEventListener("scroll", () => schedulePins(), true);
window.addEventListener("resize", () => {
  schedulePins();
  clampAnchor();
  if (!card.hidden && state.cardRect) placeCard(state.cardRect);
});
window.addEventListener("focus", () => {
  if (state.open && !state.collapsed) refreshMcp();
});

regionLayer.addEventListener("pointerdown", (event) => onRegionDown(event));
regionPreview.addEventListener("pointerdown", (event) => onRegionDown(event));

let animTimer = 0;
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "pinedit:toggle") setOpen(!state.open);
});

chrome.storage.session.get(storageKey()).then((data) => {
  const saved = data[storageKey()];
  if (Array.isArray(saved) && saved.length > 0 && state.notes.length === 0) {
    state.notes = saved;
    render();
  }
});

loadPrefs();
applyLook();
syncLabels();

globalThis.__PINEDIT__ = {
  toggle: () => setOpen(!state.open),
  activate: () => setOpen(!state.open || state.collapsed),
  openChip: () => openChip(),
  enterToolbar: () => {
    if (!state.open) setOpen(true);
    else if (state.collapsed) collapse(false);
  },
  animations: () => pageAnimations().length,
};

function openChip() {
  state.open = true;
  host.hidden = false;
  clearInterval(animTimer);
  closeMenu();
  state.listOpen = false;
  setRegionMode(false);
  hideFrame();
  closeCard();
  state.collapsed = true;
  dock.hidden = true;
  chip.hidden = false;
  refreshAnimations();
  render();
  animTimer = setInterval(() => {
    refreshAnimations();
    schedulePins();
  }, 1200);
}

function setOpen(next) {
  state.open = next;
  host.hidden = !next;
  clearInterval(animTimer);
  if (next) {
    state.collapsed = false;
    closeMenu();
    state.listOpen = false;
    dock.hidden = false;
    chip.hidden = true;
    resetAnchor();
    refreshAnimations();
    refreshMcp();
    render();
    animTimer = setInterval(() => {
      refreshAnimations();
      schedulePins();
    }, 1200);
  } else {
    setRegionMode(false);
    hideFrame();
    closeCard();
    dock.hidden = false;
    chip.hidden = true;
  }
}

function collapse(next) {
  if (state.dragging) return;
  closeMenu();
  state.listOpen = false;
  setRegionMode(false);
  hideFrame();
  closeCard();
  if (next) {
    const closeRect = closeBtn.getBoundingClientRect();
    state.collapsed = true;
    dock.hidden = true;
    chip.hidden = false;
    const size = chip.offsetWidth || 44;
    placeAnchor(
      closeRect.left + closeRect.width / 2 - size / 2,
      closeRect.top + closeRect.height / 2 - size / 2,
    );
  } else {
    const chipRect = chip.getBoundingClientRect();
    state.collapsed = false;
    dock.hidden = false;
    chip.hidden = true;
    const closeRect = closeBtn.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    placeAnchor(
      anchorRect.left + (chipRect.left + chipRect.width / 2) - (closeRect.left + closeRect.width / 2),
      anchorRect.top + (chipRect.top + chipRect.height / 2) - (closeRect.top + closeRect.height / 2),
    );
    refreshAnimations();
    refreshMcp();
  }
  syncLabels();
  render();
}

function closeMenu() {
  state.menuOpen = false;
  menu.hidden = true;
  gearBtn.classList.remove("on");
}

function resetAnchor() {
  anchor.style.left = "";
  anchor.style.top = "";
  anchor.style.right = "";
  anchor.style.bottom = "";
}

function syncLabels() {
  playBtn.replaceChildren(fileIcon(state.animPaused ? "play" : "pause"));
  playBtn.disabled = !state.animAvailable;
  playBtn.dataset.tip = !state.animAvailable ? "页面上没有动画" : state.animPaused ? "播放动画" : "暂停动画";
  playBtn.setAttribute("aria-label", playBtn.dataset.tip);
  playBtn.classList.toggle("on", state.animPaused);

  marksBtn.replaceChildren(fileIcon(state.marksVisible ? "show" : "hide"));
  marksBtn.dataset.tip = state.marksVisible ? "隐藏标注" : "显示标注";
  marksBtn.setAttribute("aria-label", marksBtn.dataset.tip);
  marksBtn.classList.toggle("on", !state.marksVisible);

  listBtn.replaceChildren(fileIcon("list"));
  listBtn.dataset.tip = "标注列表";
  listBtn.setAttribute("aria-label", listBtn.dataset.tip);
  listBtn.classList.toggle("on", state.listOpen);

  regionBtn.replaceChildren(fileIcon("region"));
  regionBtn.dataset.tip = state.regionMode ? "退出选区" : "选区标注";
  regionBtn.setAttribute("aria-label", state.regionMode ? "退出选区" : "选区标注");
  regionBtn.classList.toggle("on", state.regionMode);

  copyBtn.replaceChildren(fileIcon("copy"));
  copyBtn.setAttribute("aria-label", "复制标注");
  clearBtn.replaceChildren(fileIcon("clear"));
  clearBtn.setAttribute("aria-label", "清空");
  pinBtn.replaceChildren(fileIcon("float"), el("span", "send-label", "PinEdit"));
  pinBtn.setAttribute("aria-label", "发给 AI");
  gearBtn.replaceChildren(fileIcon("settings"));
  gearBtn.setAttribute("aria-label", "设置");
  gearBtn.classList.toggle("on", state.menuOpen);
  closeBtn.replaceChildren(closeIcon());
  closeBtn.setAttribute("aria-label", "收起");

  const hasNotes = state.notes.length > 0;
  marksBtn.disabled = !hasNotes;
  listBtn.disabled = !hasNotes;
  copyBtn.disabled = !hasNotes;
  pinBtn.disabled = !hasNotes;
  if (!hasNotes && state.marksVisible === false) state.marksVisible = true;

  lightOpt.classList.toggle("on", state.theme === "light");
  darkOpt.classList.toggle("on", state.theme === "dark");
  rightClickOpt.classList.toggle("on", state.rightClickClose);
  rightClickOpt.setAttribute("aria-checked", String(state.rightClickClose));
  for (const swatch of swatches.children) {
    swatch.classList.toggle("on", swatch.dataset.color === state.color.toLowerCase());
  }
  count.textContent = String(state.notes.length);
  count.hidden = state.notes.length === 0;
}

function setTheme(next) {
  state.theme = next;
  applyLook();
  savePrefs();
}

function setRegionMode(next) {
  state.regionMode = next;
  regionLayer.hidden = !next;
  if (!next) regionPreview.hidden = true;
  host.classList.toggle("region-mode", next);
  syncLabels();
  if (next) {
    closeMenu();
    setStatus("在页面上拖出一块区域。");
  }
}

const heldAnimations = new Set();

function isPageMotion(animation) {
  if (typeof CSSTransition !== "undefined" && animation instanceof CSSTransition) return false;
  const effect = animation.effect;
  const target = effect?.target;
  if (!(target instanceof Element) || !target.isConnected) return false;
  if (target === host || target.getRootNode?.() === shadow) return false;
  const style = getComputedStyle(target);
  if (style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity) === 0) return false;
  const rect = target.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) return false;
  const timing = effect.getComputedTiming?.() || {};
  const duration = Number(timing.duration);
  if (!Number.isFinite(duration)) return false;
  if (timing.iterations !== Infinity && duration < 1000) return false;
  return true;
}

function pageAnimations() {
  try {
    const list = document.getAnimations().filter((animation) => {
      if (!isPageMotion(animation)) return false;
      if (animation.playState === "running") return true;
      return heldAnimations.has(animation) && animation.playState === "paused";
    });
    for (const animation of heldAnimations) {
      if (!list.includes(animation)) heldAnimations.delete(animation);
    }
    return list;
  } catch {
    return [];
  }
}

function refreshAnimations() {
  const available = pageAnimations().length > 0;
  if (!available) state.animPaused = false;
  if (available !== state.animAvailable || playBtn.classList.contains("on") !== state.animPaused) {
    state.animAvailable = available;
    syncLabels();
  }
}

function toggleAnimations() {
  const animations = pageAnimations();
  if (animations.length === 0) {
    state.animPaused = false;
    heldAnimations.clear();
    refreshAnimations();
    return;
  }
  state.animPaused = !state.animPaused;
  for (const animation of animations) {
    try {
      if (state.animPaused) {
        animation.pause();
        heldAnimations.add(animation);
      } else {
        animation.play();
        heldAnimations.delete(animation);
      }
    } catch {
      /* 有些动画不能控制 */
    }
  }
  syncLabels();
}

function onMove(event) {
  if (state.pickingText || state.adjustingRegion || state.dragging || state.regionMode || !card.hidden || !state.open || state.collapsed || isOurs(event)) {
    if (card.hidden && !state.pickingText) hideFrame();
    return;
  }
  if (!state.marksVisible) {
    hideFrame();
    return;
  }
  const target = elementAt(event.clientX, event.clientY);
  if (!target) {
    hideFrame();
    return;
  }
  placeFrame(target.getBoundingClientRect(), "", describe(target));
}

function onDown(event) {
  const path = event.composedPath();
  if (state.menuOpen && !path.includes(menu) && !path.includes(gearBtn)) closeMenu();
  if (state.listOpen && !path.includes(panel) && !path.includes(listBtn)) {
    state.listOpen = false;
    panel.hidden = true;
    listBtn.classList.remove("on");
    listBtn.dataset.tip = "标注列表";
  }
  if (!state.open || state.collapsed || state.regionMode || isOurs(event)) return;
  if (event.button !== 0) return;
  if (!card.hidden) {
    event.preventDefault();
    event.stopPropagation();
    state.eatPageClick = true;
    shakeCard();
    return;
  }
  const target = elementAt(event.clientX, event.clientY);
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  state.eatPageClick = true;
  const start = { x: event.clientX, y: event.clientY };
  let dragged = false;
  let point = start;
  state.pickingText = true;
  const move = (next) => {
    point = { x: next.clientX, y: next.clientY };
    if (!dragged && Math.hypot(point.x - start.x, point.y - start.y) < 6) return;
    dragged = true;
    next.preventDefault();
    hideFrame();
    const picked = textAtDrag(start, point);
    paintTextHighlights(picked?.range || null);
  };
  const up = () => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    window.removeEventListener("pointercancel", up, true);
    state.pickingText = false;
    if (!dragged) {
      clearTextHighlight();
      openCard(target);
      return;
    }
    const picked = textAtDrag(start, point);
    if (!picked) {
      clearTextHighlight();
      setStatus("这里没有可选的文字。");
      return;
    }
    openTextCard(picked);
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
  window.addEventListener("pointercancel", up, true);
}

function onRegionDown(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const start = { x: event.clientX, y: event.clientY };
  regionPreview.hidden = false;
  drawRegion(start, start);
  const move = (next) => {
    next.preventDefault();
    drawRegion(start, { x: next.clientX, y: next.clientY });
  };
  const up = (next) => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    regionPreview.hidden = true;
    const rect = normalizeRect(start, { x: next.clientX, y: next.clientY });
    if (rect.width < 8 || rect.height < 8) {
      setStatus("选区太小，再拖一次。");
      return;
    }
    state.pendingRegions.push({
      id: newId(),
      rect: {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    });
    drawPins();
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
}

function drawRegion(from, to) {
  const rect = normalizeRect(from, to);
  regionPreview.style.left = `${Math.round(rect.left)}px`;
  regionPreview.style.top = `${Math.round(rect.top)}px`;
  regionPreview.style.width = `${Math.round(rect.width)}px`;
  regionPreview.style.height = `${Math.round(rect.height)}px`;
}

function normalizeRect(from, to) {
  const left = Math.min(from.x, to.x);
  const top = Math.min(from.y, to.y);
  return {
    left,
    top,
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}

function openRegion(pageRect, viewRect) {
  const snapshot = {
    kind: "区域",
    selector: `rect(${pageRect.x}, ${pageRect.y}, ${pageRect.width}, ${pageRect.height})`,
    tag: "region",
    text: "",
    rect: pageRect,
    box: {
      width: pageRect.width,
      height: pageRect.height,
      padding: "—",
      fontSize: "—",
      fontWeight: "—",
      color: "—",
      backgroundColor: "—",
      borderRadius: "—",
    },
  };
  showCard(snapshot, viewRect, "区域", `页面坐标 ${pageRect.x}, ${pageRect.y}`);
}

function openCard(target) {
  clearTextHighlight();
  const snapshot = capture(target);
  const rect = target.getBoundingClientRect();
  showCard(snapshot, rect, describe(target, snapshot.text), snapshot.selector);
}

function openTextCard(picked) {
  liveRange = picked.range;
  const snapshot = capture(picked.element);
  const quote = picked.text;
  snapshot.kind = "文字";
  snapshot.text = quote;
  snapshot.quote = quote;
  snapshot.box = {
    ...snapshot.box,
    width: Math.round(picked.rect.width),
    height: Math.round(picked.rect.height),
  };
  snapshot.quoteRect = {
    x: Math.round(picked.rect.left + window.scrollX),
    y: Math.round(picked.rect.top + window.scrollY),
    width: Math.round(picked.rect.width),
    height: Math.round(picked.rect.height),
  };
  paintTextHighlights(picked.range);
  showCard(snapshot, picked.rect, quoteLabel(quote), snapshot.selector);
}

function quoteLabel(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const clipped = clean.length > 24 ? `${clean.slice(0, 24)}…` : clean;
  return `「${clipped}」`;
}

let liveRange = null;

function textAtDrag(from, to) {
  const range = rangeBetween(from, to);
  if (!range) return null;
  const text = range.toString().replace(/\s+/g, " ").trim().slice(0, 200);
  if (!text) return null;
  const element = elementForRange(range);
  if (!element) return null;
  const rect = range.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  return { range, text, element, rect };
}

function rangeBetween(from, to) {
  const start = caretAt(from.x, from.y);
  const end = caretAt(to.x, to.y);
  if (!start || !end) return null;
  if (insideHost(start.startContainer) || insideHost(end.startContainer)) return null;
  const range = document.createRange();
  try {
    if (start.compareBoundaryPoints(Range.START_TO_START, end) <= 0) {
      range.setStart(start.startContainer, start.startOffset);
      range.setEnd(end.startContainer, end.startOffset);
    } else {
      range.setStart(end.startContainer, end.startOffset);
      range.setEnd(start.startContainer, start.startOffset);
    }
  } catch {
    return null;
  }
  return range;
}

function caretAt(x, y) {
  const direct = readCaret(x, y);
  if (direct && !insideHost(direct.startContainer)) return direct;
  const previous = host.style.visibility;
  host.style.visibility = "hidden";
  const hidden = readCaret(x, y);
  host.style.visibility = previous;
  if (!hidden || insideHost(hidden.startContainer)) return null;
  return hidden;
}

function readCaret(x, y) {
  if (typeof document.caretRangeFromPoint === "function") return document.caretRangeFromPoint(x, y);
  const pos = document.caretPositionFromPoint?.(x, y);
  if (!pos?.offsetNode) return null;
  try {
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  } catch {
    return null;
  }
}

function elementForRange(range) {
  const node = range.commonAncestorContainer;
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  if (!(element instanceof Element) || element === host || insideHost(element)) return null;
  if (element === document.documentElement) return document.body;
  return element;
}

function insideHost(node) {
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  if (!(element instanceof Element)) return false;
  return element === host || host.contains(element) || element.getRootNode?.() === shadow;
}

function paintTextHighlights(range) {
  textLayer.replaceChildren();
  if (!range) return;
  let boxes = [];
  try {
    boxes = [...range.getClientRects()];
  } catch {
    boxes = [];
  }
  for (const box of boxes) {
    if (box.width < 1 || box.height < 1) continue;
    const mark = el("div", "text-hl");
    mark.style.left = `${box.left}px`;
    mark.style.top = `${box.top}px`;
    mark.style.width = `${box.width}px`;
    mark.style.height = `${box.height}px`;
    textLayer.append(mark);
  }
}

function paintQuoteBox(pageRect) {
  textLayer.replaceChildren();
  const mark = el("div", "text-hl");
  mark.style.left = `${pageRect.x - window.scrollX}px`;
  mark.style.top = `${pageRect.y - window.scrollY}px`;
  mark.style.width = `${pageRect.width}px`;
  mark.style.height = `${pageRect.height}px`;
  textLayer.append(mark);
}

function clearTextHighlight() {
  liveRange = null;
  textLayer.replaceChildren();
}

function showCard(snapshot, rect, desc, detail) {
  const existing = state.notes.find((note) => note.selector === snapshot.selector && (note.quote || "") === (snapshot.quote || ""));
  state.draft = snapshot;
  state.editingId = existing?.id || null;
  card.hidden = false;
  card.replaceChildren();
  const head = button("card-head");
  const chevron = el("span", "chev", "›");
  head.append(chevron, el("span", "desc", desc));
  if (!snapshot.quote) head.append(el("span", "size", `${snapshot.box.width}×${snapshot.box.height}`));
  head.title = detail || snapshot.selector;
  const code = el("div", "code code-float");
  code.hidden = true;
  for (const [prop, value] of cssLines(snapshot)) {
    const line = el("div");
    line.append(el("span", "prop", prop), el("span", "punct", ": "), el("span", "val", value), el("span", "punct", ";"));
    code.append(line);
  }
  state.cardRect = rect;
  head.addEventListener("click", () => {
    code.hidden = !code.hidden;
    chevron.classList.toggle("open", !code.hidden);
    const box = code.getBoundingClientRect();
    code.classList.toggle("below", !code.hidden && box.top < 8);
  });
  const field = document.createElement("textarea");
  field.placeholder = "要改成什么样";
  field.value = existing?.comment || "";
  const actions = el("div", "actions");
  const cancel = button("text", "取消");
  const save = button("pin-save", "Pin");
  save.dataset.tip = existing ? "更新这条标注" : "记下这条标注";
  const syncSave = () => {
    save.disabled = field.value.trim() === "";
  };
  const fitField = () => {
    const max = 106;
    field.style.height = "0px";
    const next = Math.min(Math.max(field.scrollHeight, 34), max);
    field.style.height = `${next}px`;
    field.style.overflowY = field.scrollHeight > max ? "auto" : "hidden";
  };
  syncSave();
  fitField();
  field.addEventListener("input", () => {
    syncSave();
    fitField();
  });
  actions.append(cancel, save);
  card.append(head, code, field, actions);
  frame.classList.remove("dashed");
  if (snapshot.quote) hideFrame();
  else if (snapshot.rect) {
    clearTextHighlight();
    hideFrame();
  } else {
    clearTextHighlight();
    placeFrame(rect, String(existing?.number || state.notes.length + 1), "");
  }
  card.classList.toggle("for-region", Boolean(snapshot.rect));
  placeCard(rect);
  bindCardDrag(head);
  field.focus();
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !save.disabled) save.click();
  });
  cancel.addEventListener("click", closeCard);
  save.addEventListener("click", () => {
    const comment = field.value.trim();
    if (!comment) return;
    if (snapshot.pendingId) {
      state.pendingRegions = state.pendingRegions.filter((item) => item.id !== snapshot.pendingId);
    }
    const { pendingId, ...clean } = snapshot;
    if (state.editingId) {
      const note = state.notes.find((item) => item.id === state.editingId);
      if (note) Object.assign(note, clean, { comment, id: note.id, number: note.number, sent: false });
    } else {
      state.notes.push({ ...clean, id: newId(), comment, number: state.notes.length + 1 });
    }
    renumber();
    persist();
    closeCard();
    render();
  });
  if (snapshot.pendingId) save.disabled = field.value.trim() === "";
}

function bindCardDrag(handle) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const start = { x: event.clientX, y: event.clientY };
    const left = Number.parseFloat(card.style.left) || 0;
    const top = Number.parseFloat(card.style.top) || 0;
    let moved = false;
    const move = (next) => {
      const dx = next.clientX - start.x;
      const dy = next.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true;
      next.preventDefault();
      placeCardAt(left + dx, top + dy);
    };
    const up = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      if (!moved) return;
      const swallow = (clickEvent) => {
        clickEvent.stopPropagation();
        clickEvent.preventDefault();
        handle.removeEventListener("click", swallow, true);
      };
      handle.addEventListener("click", swallow, true);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
  });
}

function placeCardAt(left, top) {
  const margin = 8;
  const width = card.offsetWidth || 260;
  const height = card.offsetHeight || 200;
  const nextLeft = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  const nextTop = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
  state.cardLeft = nextLeft;
  state.cardTop = nextTop;
  card.style.left = `${Math.round(nextLeft)}px`;
  card.style.top = `${Math.round(nextTop)}px`;
}

function closeCard() {
  card.hidden = true;
  card.classList.remove("shake");
  card.replaceChildren();
  state.draft = null;
  state.editingId = null;
  state.cardRect = null;
  hideFrame();
  clearTextHighlight();
}

function shakeCard() {
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
}

function placeFrame(rect, number, label) {
  frame.hidden = false;
  frame.classList.remove("dashed");
  frame.style.left = `${rect.left}px`;
  frame.style.top = `${rect.top}px`;
  frame.style.width = `${rect.width}px`;
  frame.style.height = `${rect.height}px`;
  badge.hidden = !number;
  badge.textContent = number || "";
  tip.hidden = !label;
  tip.textContent = label || "";
  tip.classList.toggle("below", rect.top < 32);
  tip.style.left = "50%";
  tip.style.transform = "";
  if (!label) return;
  const box = tip.getBoundingClientRect();
  let shift = 0;
  if (box.left < 8) shift = 8 - box.left;
  if (box.right > window.innerWidth - 8) shift = window.innerWidth - 8 - box.right;
  if (!shift) return;
  const y = tip.classList.contains("below") ? "100%" : "-100%";
  tip.style.transform = `translate(calc(-50% + ${Math.round(shift)}px), ${y})`;
}

function placeCard(rect) {
  const margin = 8;
  card.style.maxHeight = `${Math.max(160, window.innerHeight - margin * 2)}px`;
  const width = card.offsetWidth || Math.min(260, window.innerWidth - margin * 2);
  const height = card.offsetHeight || 200;
  const rectLeft = rect.left;
  const rectTop = rect.top;
  const rectRight = Number.isFinite(rect.right) ? rect.right : rectLeft + rect.width;
  let left = rectRight + 12;
  let top = rectTop;
  if (left + width > window.innerWidth - margin) left = rectLeft - width - 12;
  if (left < margin) left = Math.max(margin, rectLeft);
  if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - width - margin);
  if (top + height > window.innerHeight - margin) top = window.innerHeight - height - margin;
  if (top < margin) top = margin;
  placeCardAt(left, top);
}

function render() {
  panel.hidden = state.collapsed || !state.listOpen;
  count.textContent = String(state.notes.length);
  count.hidden = state.notes.length === 0;
  panelTitle.textContent = state.notes.length ? `标注 ${state.notes.length}` : "标注";
  clearBtn.disabled = state.notes.length === 0;
  fitAnchor();
  list.replaceChildren();
  if (state.notes.length === 0) list.append(el("p", "empty", "还没有标注。"));
  for (const note of state.notes) {
    const row = el("div", "row");
    const num = el("span", "num", String(note.number));
    const body = el("span", "copy");
    body.append(el("span", "what", note.comment || regionLabel(note) || note.text || note.tag));
    const metaLine = el("span", "meta");
    metaLine.append(el("span", "meta-text", meta(note)));
    if (note.sent) metaLine.append(el("span", "sent-note", "已交给 AI"));
    body.append(metaLine);
    const drop = button("drop", "删除");
    row.append(num, body, drop);
    row.addEventListener("click", (event) => {
      if (drop.contains(event.target)) return;
      openNote(note);
    });
    drop.addEventListener("click", () => {
      state.notes = state.notes.filter((item) => item.id !== note.id);
      renumber();
      persist();
      render();
    });
    list.append(row);
  }
  listBtn.classList.toggle("on", state.listOpen);
  listBtn.dataset.tip = state.listOpen ? "收起列表" : "标注列表";
  listBtn.setAttribute("aria-label", "标注列表");
  syncLabels();
  drawPins();
}

function openNote(note) {
  if (note.quote) {
    const rect = note.quoteRect
      ? {
          left: note.quoteRect.x - window.scrollX,
          top: note.quoteRect.y - window.scrollY,
          width: note.quoteRect.width,
          height: note.quoteRect.height,
        }
      : { left: 24, top: 24, width: note.box.width, height: note.box.height };
    if (note.quoteRect) paintQuoteBox(note.quoteRect);
    showCard(note, rect, quoteLabel(note.text), note.selector);
    return;
  }
  if (note.rect) {
    const rect = {
      left: note.rect.x - window.scrollX,
      top: note.rect.y - window.scrollY,
      width: note.rect.width,
      height: note.rect.height,
    };
    showCard(note, rect, "区域", `页面坐标 ${note.rect.x}, ${note.rect.y}`);
    return;
  }
  let found = null;
  try {
    found = document.querySelector(note.selector);
  } catch {
    found = null;
  }
  if (found) openCard(found);
  else setStatus("这个元素已经不在页面上了。");
}

function regionLabel(note) {
  return note.rect ? `区域 ${note.rect.width}×${note.rect.height}` : "";
}

function meta(note) {
  if (note.quote) return "文字";
  if (note.rect) return `${note.rect.width}×${note.rect.height} · 区域`;
  return `${note.box.width}×${note.box.height} · ${note.tag}`;
}

let pinFrame = 0;
function schedulePins() {
  cancelAnimationFrame(pinFrame);
  pinFrame = requestAnimationFrame(() => {
    drawPins();
    if (liveRange) paintTextHighlights(liveRange);
    else if (!card.hidden && state.draft?.quote && state.draft.quoteRect) paintQuoteBox(state.draft.quoteRect);
  });
}

function drawPins() {
  pinLayer.replaceChildren();
  if (state.collapsed) return;
  if (state.marksVisible) {
    for (const note of state.notes) {
      if (note.quote && note.quoteRect) {
        const pin = button("pin", String(note.number));
        pin.style.position = "fixed";
        pin.style.left = `${note.quoteRect.x - window.scrollX}px`;
        pin.style.top = `${Math.max(4, note.quoteRect.y - window.scrollY - 8)}px`;
        pin.addEventListener("click", () => openNote(note));
        pinLayer.append(pin);
        continue;
      }
      if (note.rect) {
        pinLayer.append(regionBox(note.rect, { note, number: note.number }));
        continue;
      }
      let rect = null;
      try {
        rect = document.querySelector(note.selector)?.getBoundingClientRect();
      } catch {
        rect = null;
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) continue;
      const pin = button("pin", String(note.number));
      pin.style.position = "fixed";
      pin.style.left = `${rect.left + Math.min(rect.width - 8, 12)}px`;
      pin.style.top = `${Math.max(4, rect.top - 8)}px`;
      pin.addEventListener("click", () => openNote(note));
      pinLayer.append(pin);
    }
  }
  for (const pending of state.pendingRegions) {
    pinLayer.append(regionBox(pending.rect, { pending }));
  }
}

function regionBox(pageRect, { note = null, pending = null, number = null }) {
  const box = el("div", "region-mark");
  box.style.left = `${pageRect.x - window.scrollX}px`;
  box.style.top = `${pageRect.y - window.scrollY}px`;
  box.style.width = `${pageRect.width}px`;
  box.style.height = `${pageRect.height}px`;
  if (pending) box.classList.add("pending");

  if (number !== null) {
    const pin = button("pin", String(number));
    pin.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.regionMode) return;
      openNote(note);
    });
    box.append(pin);
  }

  const dropMini = button("drop-mini");
  dropMini.setAttribute("aria-label", "删除区域");
  dropMini.append(closeIcon());
  dropMini.addEventListener("pointerdown", (event) => event.stopPropagation());
  dropMini.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.regionMode) return;
    if (pending) {
      state.pendingRegions = state.pendingRegions.filter((item) => item.id !== pending.id);
      drawPins();
      return;
    }
    state.notes = state.notes.filter((item) => item.id !== note.id);
    renumber();
    persist();
    render();
  });
  box.append(dropMini);

  const handle = el("div", "handle");
  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    if (!state.regionMode) return;
    startRegionResize(event, box, { note, pending });
  });
  box.append(handle);

  box.addEventListener("pointerdown", (event) => {
    if (event.target === handle || event.target === dropMini || event.button !== 0) return;
    event.stopPropagation();
    if (!state.regionMode) return;
    startRegionMove(event, box, { note, pending });
  });
  box.addEventListener("click", (event) => {
    if (state.regionMode) return;
    if (state.dragEndedAt && performance.now() - state.dragEndedAt < 250) return;
    if (event.target === handle || event.target === dropMini) return;
    if (event.target.classList.contains("pin")) return;
    openRegionTarget(note, pending);
  });
  return box;
}

function openRegionTarget(note, pending) {
  const pageRect = pending ? pending.rect : note.rect;
  const snapshot = pending
    ? {
        kind: "区域",
        selector: `rect(${pageRect.x}, ${pageRect.y}, ${pageRect.width}, ${pageRect.height})`,
        tag: "region",
        text: "",
        rect: { ...pageRect },
        box: emptyBox(pageRect),
        pendingId: pending.id,
      }
    : note;
  if (!pending) {
    snapshot.selector = `rect(${pageRect.x}, ${pageRect.y}, ${pageRect.width}, ${pageRect.height})`;
  }
  const viewRect = {
    left: pageRect.x - window.scrollX,
    top: pageRect.y - window.scrollY,
    width: pageRect.width,
    height: pageRect.height,
  };
  showCard(snapshot, viewRect, "区域", `页面坐标 ${pageRect.x}, ${pageRect.y}`);
}

function emptyBox(rect) {
  return {
    width: rect.width,
    height: rect.height,
    padding: "—",
    fontSize: "—",
    fontWeight: "—",
    color: "—",
    backgroundColor: "—",
    borderRadius: "—",
  };
}

function startRegionMove(event, box, target) {
  event.stopPropagation();
  event.preventDefault();
  if (!state.regionMode) return;
  state.adjustingRegion = true;
  hideFrame();
  try { box.setPointerCapture(event.pointerId); } catch { /* 指针已经结束 */ }
  const start = { x: event.clientX, y: event.clientY };
  const pageRect = target.pending ? target.pending.rect : target.note.rect;
  const origin = { x: pageRect.x, y: pageRect.y };
  let moved = false;
  let dx = 0;
  let dy = 0;
  const move = (next) => {
    dx = next.clientX - start.x;
    dy = next.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < 1) return;
    moved = true;
    next.preventDefault();
    box.style.transform = `translate3d(${Math.round(dx)}px, ${Math.round(dy)}px, 0)`;
  };
  const up = () => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    state.adjustingRegion = false;
    box.style.transform = "";
    if (!moved) return;
    pageRect.x = Math.round(origin.x + dx);
    pageRect.y = Math.round(origin.y + dy);
    box.style.left = `${pageRect.x - window.scrollX}px`;
    box.style.top = `${pageRect.y - window.scrollY}px`;
    state.dragEndedAt = performance.now();
    if (target.pending) drawPins();
    else {
      persist();
      drawPins();
    }
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
}

function startRegionResize(event, box, target) {
  event.stopPropagation();
  event.preventDefault();
  if (!state.regionMode) return;
  state.adjustingRegion = true;
  hideFrame();
  try { box.setPointerCapture(event.pointerId); } catch { /* 指针已经结束 */ }
  const start = { x: event.clientX, y: event.clientY };
  const pageRect = target.pending ? target.pending.rect : target.note.rect;
  const origin = { width: pageRect.width, height: pageRect.height };
  const move = (next) => {
    next.preventDefault();
    pageRect.width = Math.max(12, Math.round(origin.width + next.clientX - start.x));
    pageRect.height = Math.max(12, Math.round(origin.height + next.clientY - start.y));
    box.style.width = `${pageRect.width}px`;
    box.style.height = `${pageRect.height}px`;
  };
  const up = () => {
    window.removeEventListener("pointermove", move, true);
    window.removeEventListener("pointerup", up, true);
    state.adjustingRegion = false;
    state.dragEndedAt = performance.now();
    if (target.pending) drawPins();
    else {
      persist();
      drawPins();
    }
  };
  window.addEventListener("pointermove", move, true);
  window.addEventListener("pointerup", up, true);
}


async function refreshMcp() {
  const result = await api("GET", "/mcp-config").catch(() => null);
  if (result?.ok && typeof result.body?.config === "string") {
    state.mcp = true;
    state.mcpConfig = result.body.config;
    state.installed = Boolean(result.body.installed);
    applyMcp();
    return;
  }
  const health = await api("GET", "/health").catch(() => null);
  state.mcp = Boolean(health?.ok);
  state.installed = false;
  state.mcpConfig = MCP_FALLBACK;
  applyMcp();
}

function applyMcp() {
  pinBtn.hidden = !state.mcp;
  stateDot.classList.toggle("ok", state.mcp);
  stateText.textContent = state.mcp ? "已连接" : "未连接";
  mcpCode.textContent = state.mcpConfig;
  if (!state.mcp) {
    mcpNote.hidden = false;
    mcpNote.textContent = "本机服务没启动。先在终端跑一次 pinedit-mcp。";
  } else if (!state.installed) {
    mcpNote.hidden = false;
    mcpNote.textContent = "当前是从源码启动的。换一台机器时，用上面这段 npx 配置。";
  } else {
    mcpNote.hidden = true;
  }
}

async function handoff() {
  if (state.notes.length === 0) {
    setStatus("还没有可交出去的标注。");
    return;
  }
  const pending = await api("GET", "/pending");
  if (!pending?.ok) {
    state.mcp = false;
    applyMcp();
    setStatus(contextGone(pending) ? "扩展刚更新过，刷新这个页面后再点一次。" : "本机服务没开，标注还留在页面上。");
    return;
  }
  const queued = pending.body?.pending;
  const samePage = queued?.pageUrl === location.href;
  const queuedSelectors = new Set(samePage ? queued.annotations.map((item) => item.selector) : []);
  const outgoing = state.notes.filter((note) => !note.sent || queuedSelectors.has(note.selector));
  if (outgoing.length === 0) {
    setStatus("都已经交给 AI，记录还在，可以再复制。");
    return;
  }
  if (queued && !samePage && !state.overwriteArmed) {
    state.overwriteArmed = true;
    setStatus("上一批是别的页面，还没被读取。再点一次会换掉它。");
    return;
  }
  const carried = outgoing.some((note) => note.sent);
  const saved = await api("POST", "/batches", batchOf(outgoing));
  if (!saved?.ok) {
    setStatus(contextGone(saved) ? "扩展刚更新过，刷新这个页面后再点一次。" : "没交出去，标注还留在页面上。");
    return;
  }
  for (const note of outgoing) note.sent = true;
  state.overwriteArmed = false;
  persist();
  closeCard();
  render();
  const prompt = "按 PinEdit 的标注改";
  const copied = await copyText(prompt);
  const handed = carried ? "已交给 AI，还没读取的也一起交了。" : "已交给 AI。";
  setStatus(copied ? `${handed}提示已复制，贴进对话即可。` : `${handed}提示没复制上。`);
}

function batchOf(notes) {
  return {
    id: `batch-${newId()}`,
    pageUrl: location.href,
    pageTitle: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    annotations: notes.map((note) => ({
      number: note.number,
      comment: note.comment,
      selector: note.selector,
      tag: note.tag,
      text: note.text,
      box: note.box,
      ...(note.quote ? { selected: true } : {}),
      ...(note.rect ? { rect: note.rect } : {}),
    })),
  };
}

async function copyNotes() {
  if (state.notes.length === 0) {
    setStatus("还没有可复制的标注。");
    return;
  }
  const copied = await copyText(markdown({ ...batchOf(state.notes), id: "clipboard" }));
  setStatus(copied ? "已复制。贴进对话即可。" : "复制失败，请再点一次。");
}

function markdown(batch) {
  const lines = [
    "## PinEdit",
    `**页面:** ${batch.pageTitle || "未命名页面"}`,
    `**地址:** ${batch.pageUrl}`,
    `**视口:** ${batch.viewport.width}×${batch.viewport.height}`,
    "",
  ];
  for (const note of batch.annotations) {
    if (note.rect) {
      lines.push(
        `### ${note.number}. 区域`,
        `**位置:** 页面坐标 ${note.rect.x}, ${note.rect.y}`,
        `**尺寸:** ${note.rect.width}×${note.rect.height}`,
        `**意见:** ${note.comment || "（未写意见）"}`,
        "**说明:** 这里要新加一块，页面上没有对应元素。",
        ...(note.sent ? ["**状态:** 已交给 AI"] : []),
        "",
      );
      continue;
    }
    const name = note.text ? `${note.tag}：「${note.text}」` : note.tag;
    lines.push(
      `### ${note.number}. ${name}`,
      `**位置:** \`${note.selector}\``,
      ...(note.quote ? [] : [`**尺寸:** ${note.box.width}×${note.box.height}`]),
      `**意见:** ${note.comment || "（未写意见）"}`,
      ...(note.quote ? ["**说明:** 改的是圈选的这段文字，不是整个元素。"] : []),
      ...(note.sent ? ["**状态:** 已交给 AI"] : []),
      "",
    );
  }
  lines.push("按「意见」改这个元素。尺寸只用来对照现在的大小；意见里没提到的内边距、字号、颜色、圆角不要顺手改。");
  return lines.join("\n");
}

function capture(element) {
  const styleOf = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return {
    kind: typeName(element),
    selector: selectorFor(element),
    tag: element.tagName.toLowerCase(),
    text: visibleText(element),
    box: {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      padding: [styleOf.paddingTop, styleOf.paddingRight, styleOf.paddingBottom, styleOf.paddingLeft].map(px).join(" "),
      fontSize: styleOf.fontSize,
      fontWeight: styleOf.fontWeight,
      color: styleOf.color,
      backgroundColor: styleOf.backgroundColor,
      borderRadius: styleOf.borderRadius,
    },
  };
}

function selectorFor(element) {
  if (!(element instanceof Element)) return "body";
  const ownId = idSelector(element);
  if (ownId) return ownId;
  const testId = element.getAttribute("data-testid");
  if (testId && document.querySelectorAll(`[data-testid="${cssEscape(testId)}"]`).length === 1) {
    return `[data-testid="${cssEscape(testId)}"]`;
  }
  const parts = [];
  let node = element;
  while (node && node.nodeType === 1 && node !== document.body && node !== document.documentElement) {
    const ancestorId = node === element ? "" : idSelector(node);
    parts.unshift(ancestorId || segment(node));
    if (ancestorId) return parts.join(" > ");
    const candidate = parts.join(" > ");
    try {
      if (document.querySelectorAll(candidate).length === 1) return candidate;
    } catch {
      /* keep walking */
    }
    node = node.parentElement;
  }
  return parts.join(" > ") || element.tagName.toLowerCase();
}

function idSelector(node) {
  if (!node.id) return "";
  const selector = `#${cssEscape(node.id)}`;
  try {
    return document.querySelectorAll(selector).length === 1 ? selector : "";
  } catch {
    return "";
  }
}

function segment(node) {
  const base = classPart(node);
  const parent = node.parentElement;
  if (!parent) return base;
  const same = [...parent.children].filter((child) => child.tagName === node.tagName);
  if (same.length < 2) return base;
  const twins = same.filter((child) => classPart(child) === base);
  if (twins.length < 2) return base;
  return `${base}:nth-of-type(${same.indexOf(node) + 1})`;
}

function classPart(node) {
  const tag = node.tagName.toLowerCase();
  const classes = [...node.classList].filter(usefulClass).slice(0, 2);
  if (!classes.length) return tag;
  return `${tag}.${classes.map((name) => cssEscape(name)).join(".")}`;
}

function usefulClass(name) {
  if (!name || name.length > 40) return false;
  if (/^(css|sc|jsx|emotion)-/i.test(name)) return false;
  if (/__[A-Za-z0-9]{5,}$/.test(name)) return false;
  return true;
}

function visibleText(element) {
  const direct = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(" ");
  const value = direct || element.getAttribute("aria-label") || "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function elementAt(x, y) {
  return document.elementsFromPoint(x, y).find((node) => node !== host && !host.contains(node) && node instanceof Element);
}

function isOurs(event) {
  return event.composedPath().some((node) => node === host || node?.getRootNode?.() === shadow);
}

function hideFrame() {
  frame.hidden = true;
}

function contextGone(result) {
  const text = String(result?.error || "");
  return !chrome.runtime?.id || text.includes("invalidated") || text.includes("Extension context");
}

async function api(method, path, body) {
  try {
    if (!chrome.runtime?.id) return { ok: false, error: "Extension context invalidated." };
    return await chrome.runtime.sendMessage({ type: API_MESSAGE, method, path, body });
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

function persist() {
  return chrome.storage.session.set({ [storageKey()]: state.notes });
}

function storageKey() {
  return `draft:${location.href}`;
}

function renumber() {
  state.notes.forEach((note, index) => {
    note.number = index + 1;
  });
}

let toastTimer = 0;
function setStatus(text) {
  clearTimeout(toastTimer);
  toast.textContent = text || "";
  toast.hidden = !text;
  if (!text) return;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

function fitAnchor() {
  anchor.classList.remove("flip");
  const anchorRect = anchor.getBoundingClientRect();
  const margin = 12;
  const above = Math.max(0, anchorRect.top - margin);
  const below = Math.max(0, window.innerHeight - anchorRect.bottom - margin);
  if (above < 280 && below > above) anchor.classList.add("flip");
  const room = Math.max(120, (anchor.classList.contains("flip") ? below : above) - 8);
  if (!menu.hidden) menu.style.maxHeight = `${Math.round(room)}px`;
  if (!panel.hidden) panel.style.maxHeight = `${Math.round(room)}px`;
}

function placeAnchor(left, top) {
  const width = anchor.offsetWidth || 200;
  const height = anchor.offsetHeight || 44;
  const nextLeft = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  const nextTop = Math.max(8, Math.min(top, window.innerHeight - height - 8));
  anchor.style.left = `${nextLeft}px`;
  anchor.style.top = `${nextTop}px`;
  anchor.style.right = "auto";
  anchor.style.bottom = "auto";
}

function applyLook() {
  host.classList.toggle("light", state.theme === "light");
  host.style.setProperty("--mark", state.color);
  syncLabels();
}

function savePrefs() {
  chrome.storage?.local?.set({
    "pinedit-prefs": {
      theme: state.theme,
      color: state.color,
      rightClickClose: state.rightClickClose,
      v: 3,
    },
  });
}

function loadPrefs() {
  const local = chrome.storage?.local;
  if (!local) return;
  local.get("pinedit-prefs").then((data) => {
    const prefs = data?.["pinedit-prefs"];
    if (!prefs || prefs.v !== 3) return;
    if (prefs.theme === "light" || prefs.theme === "dark") state.theme = prefs.theme;
    if (COLORS.includes(prefs.color)) state.color = prefs.color;
    if (typeof prefs.rightClickClose === "boolean") state.rightClickClose = prefs.rightClickClose;
    applyLook();
  }).catch(() => {});
}

function clampAnchor() {
  if (!anchor.style.left) return;
  placeAnchor(Number.parseFloat(anchor.style.left), Number.parseFloat(anchor.style.top));
}

function bindDrag(handle) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    state.clickFromDrag = false;
    const start = { x: event.clientX, y: event.clientY };
    const rect = anchor.getBoundingClientRect();
    let moved = false;
    const move = (next) => {
      const dx = next.clientX - start.x;
      const dy = next.clientY - start.y;
      if (Math.hypot(dx, dy) < 12) return;
      if (!moved) {
        moved = true;
        state.dragging = true;
        state.clickFromDrag = true;
      }
      next.preventDefault();
      placeAnchor(rect.left + dx, rect.top + dy);
    };
    const up = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      if (!moved) return;
      state.dragEndedAt = performance.now();
      savePrefs();
      requestAnimationFrame(() => {
        state.dragging = false;
      });
      setTimeout(() => {
        state.clickFromDrag = false;
      }, 350);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
  });
}

function cssLines(snapshot) {
  const box = snapshot.box;
  if (snapshot.quote) {
    const quote = snapshot.quote.length > 48 ? `${snapshot.quote.slice(0, 48)}…` : snapshot.quote;
    return [
      ["文字", quote],
      ["字号", box.fontSize],
      ["字重", box.fontWeight],
      ["字色", hexColor(box.color)],
    ];
  }
  if (snapshot.rect) {
    return [
      ["位置", `(${snapshot.rect.x}, ${snapshot.rect.y})`],
      ["宽度", `${snapshot.rect.width}px`],
      ["高度", `${snapshot.rect.height}px`],
    ];
  }
  const lines = [
    ["宽度", `${box.width}px`],
    ["高度", `${box.height}px`],
    ["内边距", box.padding],
  ];
  if (snapshot.text) {
    lines.push(["字号", box.fontSize], ["字重", box.fontWeight], ["字色", hexColor(box.color)]);
  }
  lines.push(["底色", hexColor(box.backgroundColor)], ["圆角", box.borderRadius]);
  return lines;
}

function hexColor(value) {
  const text = String(value).trim();
  const match = text.match(/^rgba?\(\s*([\d.]+)(?:[,\s]+)([\d.]+)(?:[,\s]+)([\d.]+)(?:(?:[,\s/]+)([\d.]+%?))?\s*\)$/i);
  if (!match) return text;
  const byte = (channel) => Math.max(0, Math.min(255, Math.round(Number(channel)))).toString(16).padStart(2, "0");
  let alpha = 255;
  if (match[4] !== undefined) {
    alpha = match[4].endsWith("%")
      ? Math.round(Number.parseFloat(match[4]) / 100 * 255)
      : Math.round(Number(match[4]) * 255);
  }
  const hex = `#${byte(match[1])}${byte(match[2])}${byte(match[3])}`;
  return alpha >= 255 ? hex : `${hex}${byte(alpha)}`;
}

function px(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? `${Math.round(number)}px` : value;
}

function newId() {
  try {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    /* 本地文件页不是安全上下文 */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 本地文件页没有剪贴板接口 */
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
}

function typeName(element) {
  const role = element.getAttribute("role");
  const names = {
    a: "链接",
    button: "按钮",
    img: "图片",
    input: "输入框",
    textarea: "输入框",
    select: "选择框",
    li: "列表项",
    ul: "列表",
    ol: "列表",
    h1: "标题",
    h2: "标题",
    h3: "标题",
    p: "段落",
    nav: "导航",
    header: "页眉",
    footer: "页脚",
    form: "表单",
  };
  if (role === "listitem") return "列表项";
  return names[role] || names[element.tagName.toLowerCase()] || element.tagName.toLowerCase();
}

function describe(element, text = visibleText(element)) {
  const tag = element.tagName.toLowerCase();
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return tag;
  const clipped = clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
  return `${tag} "${clipped}"`;
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(className, label) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = className;
  if (label) {
    node.textContent = label;
    node.setAttribute("aria-label", label);
  }
  return node;
}

function option(label, graphic) {
  const node = button("opt");
  node.append(graphic, el("span", "", label));
  node.setAttribute("aria-label", label);
  node.dataset.tip = label;
  return node;
}

function fileIcon(name, size = 16) {
  const markup = globalThis.__PINEDIT_ICONS?.[name];
  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = document.importNode(parsed.documentElement, true);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

function closeIcon() {
  return fileIcon("x");
}

function sunIcon() {
  return fileIcon("sun");
}

function moonIcon() {
  return fileIcon("moon");
}
})();
