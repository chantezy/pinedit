import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "/tmp/pinedit-verify/node_modules/playwright-core/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageHtml = readFileSync(path.join(root, "demo/page.html"));
const server = createServer((_req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(pageHtml);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const browser = await chromium.launch({
  executablePath: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  globalThis.chrome = {
    runtime: {
      id: "pinedit-test",
      onMessage: { addListener() {} },
      sendMessage: async (message) => {
        if (message.path === "/mcp-config") {
          return { ok: true, body: { ok: true, config: '{\n  "mcpServers": {\n    "pinedit": {\n      "command": "npx",\n      "args": ["-y", "pinedit-mcp"]\n    }\n  }\n}' } };
        }
        if (message.path === "/pending") return { ok: true, body: { pending: globalThis.__PINEDIT_QUEUE || null } };
        if (message.path === "/batches") {
          globalThis.__PINEDIT_POSTS = globalThis.__PINEDIT_POSTS || [];
          globalThis.__PINEDIT_POSTS.push(message.body);
          globalThis.__PINEDIT_QUEUE = message.body;
          return { ok: true, body: { ok: true, replaced: false } };
        }
        if (message.path === "/health") return { ok: true, body: { ok: true } };
        return { ok: false, body: {} };
      },
    },
    storage: {
      session: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {},
      },
    },
  };
});
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
await page.goto(`http://127.0.0.1:${port}/`);
await page.addScriptTag({ path: path.join(root, "extension/overlay-css.js") });
await page.addScriptTag({ path: path.join(root, "extension/icon-src.js") });
await page.addScriptTag({ path: path.join(root, "extension/content.js") });
if (errors.length) throw new Error(errors.join("\n"));

const ui = page.locator("pinedit-root");
const dock = ui.locator(".dock");

await page.evaluate(() => globalThis.__PINEDIT__.toggle());
if (!(await ui.evaluate((el) => el.classList.contains("light")))) throw new Error("默认应该是亮色");
if (!(await ui.locator(".chip .count").evaluate((el) => el.hidden))) throw new Error("数量为 0 不该显示角标");
const first = await dock.boundingBox();
if (!first || first.x < 720 || first.y < 620) throw new Error(`默认不在右下: ${JSON.stringify(first)}`);
const inset = { right: 1280 - (first.x + first.width), bottom: 800 - (first.y + first.height) };
if (inset.right < 28 || inset.bottom < 28) throw new Error(`工具条该再离边远一点: ${JSON.stringify(inset)}`);

const mark = await ui.evaluate((el) => getComputedStyle(el).getPropertyValue("--mark").trim().toLowerCase());
if (mark !== "#ff383d") throw new Error(`默认色不是红: ${mark}`);

// 工具栏必须是图标，hover 才出说明，高度 ≥ 44
const toolLabels = await ui.locator(".dock .tool").evaluateAll((nodes) =>
  nodes
    .filter((node) => node.getAttribute("aria-label") !== "发给 AI")
    .map((node) => ({
      text: node.textContent.trim(),
      tip: node.dataset.tip || "",
      svg: Boolean(node.querySelector("svg")),
      w: node.getBoundingClientRect().width,
      h: node.getBoundingClientRect().height,
    })),
);
if (toolLabels.some((item) => item.text !== "" || !item.svg || !item.tip)) {
  throw new Error(`工具条还有文字按钮: ${JSON.stringify(toolLabels)}`);
}
if (toolLabels.some((item) => item.w < 28 || item.h < 28)) {
  throw new Error(`工具按钮太小: ${JSON.stringify(toolLabels)}`);
}
const sendBtn = await ui.locator('.dock .tool[aria-label="发给 AI"]').evaluate((el) => ({
  text: el.textContent.trim(),
  svg: Boolean(el.querySelector("svg")),
  w: el.getBoundingClientRect().width,
}));
if (sendBtn.text !== "PinEdit" || !sendBtn.svg || sendBtn.w < 60) {
  throw new Error(`发给 AI 应该是图标加文字: ${JSON.stringify(sendBtn)}`);
}
const gear = await ui.locator('.dock .tool[aria-label="设置"] svg').evaluate((el) => ({
  w: el.getBoundingClientRect().width,
  clip: el.querySelector("[clip-path]") ? "yes" : "",
  path: el.querySelectorAll("path").length,
}));
if (gear.w < 12 || gear.clip || gear.path < 1) throw new Error(`设置图标没画出来: ${JSON.stringify(gear)}`);
const dockClear = await ui.locator('.dock .tool[aria-label="清空"]').count();
if (dockClear !== 0) throw new Error("清空按钮不该还在工具条上");

// 工具条总高 44，按钮比它小一点
const dockHeight = await dock.evaluate((el) => el.getBoundingClientRect().height);
if (Math.round(dockHeight) !== 44) throw new Error(`工具条高度应该是 44: ${dockHeight}`);
const iconSizes = await ui.locator(".dock .tool:not(.send) svg").evaluateAll((nodes) =>
  nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { w: Math.round(box.width), h: Math.round(box.height), stroke: node.getAttribute("stroke-width") };
  }),
);
if (iconSizes.some((item) => item.w !== 16 || item.h !== 16 || item.stroke !== "2")) {
  throw new Error(`工具图标尺寸或描边不统一: ${JSON.stringify(iconSizes)}`);
}

// 没有标注时，几个依赖标注的按钮置灰
for (const label of ["隐藏标注", "标注列表", "复制标注", "发给 AI"]) {
  if (!(await ui.locator(`.dock .tool[aria-label="${label}"]`).isDisabled())) {
    throw new Error(`没有标注时 ${label} 应该置灰`);
  }
}
await page.evaluate(() => {
  const probe = document.createElement("button");
  probe.id = "pinedit-click-probe";
  probe.type = "button";
  probe.textContent = "页面按钮";
  probe.style.cssText = "position:fixed;left:24px;top:80px;z-index:1";
  probe.addEventListener("click", () => {
    probe.dataset.hit = String(Number(probe.dataset.hit || 0) + 1);
  });
  document.body.append(probe);
});
await page.locator("#pinedit-click-probe").click();
if (await page.locator("#pinedit-click-probe").getAttribute("data-hit")) {
  throw new Error("标注时页面原来的点击不该生效");
}
if (!(await ui.locator(".card").isVisible())) throw new Error("点页面应该打开标注");
await page.locator("#pinedit-click-probe").click();
if (!(await ui.locator(".card").isVisible())) throw new Error("点空白不该关掉标注弹窗");
if (!(await ui.locator(".card").evaluate((el) => el.classList.contains("shake")))) {
  throw new Error("点空白应该让标注弹窗抖动");
}
await page.getByRole("button", { name: "取消" }).click();

// 动画：有动画时可点，暂停后动画真的停
const animCount = await page.evaluate(() => globalThis.__PINEDIT__.animations());
if (animCount < 1) throw new Error("演示页没有动画");
const playBtn = ui.locator('.dock .tool[data-tip="暂停动画"]');
if ((await playBtn.count()) !== 1) throw new Error("播放/暂停按钮没有按动画状态显示");
if ((await playBtn.getAttribute("class") || "").split(/\s+/).includes("on")) {
  throw new Error("没暂停时播放键不该高亮");
}
await playBtn.click();
const pausedClass = await ui.locator('.dock .tool[data-tip="播放动画"]').getAttribute("class");
if (!(pausedClass || "").split(/\s+/).includes("on")) throw new Error("暂停后播放键应该高亮");
const paused = await page.evaluate(() => document.getAnimations().every((a) => a.playState === "paused"));
if (!paused) throw new Error("点了暂停动画还在跑");
await ui.locator('.dock .tool[data-tip="播放动画"]').click();
const running = await page.evaluate(() => document.getAnimations().some((a) => a.playState === "running"));
if (!running) throw new Error("点了播放动画没恢复");

// 没有动画时置灰
await page.evaluate(() => document.getAnimations().forEach((a) => a.cancel()));
await page.evaluate(() => document.getElementById("spinner").remove());
await page.evaluate(() => globalThis.dispatchEvent(new Event("focus")));
await page.waitForTimeout(1400);
const disabled = await ui.locator('.dock .tool[data-tip="页面上没有动画"]').isDisabled();
if (!disabled) throw new Error("没有动画时按钮没置灰");
await page.evaluate(() => {
  const node = document.createElement("div");
  node.id = "fade";
  node.textContent = "过渡";
  node.style.cssText = "width:80px;height:40px;background:#2457c5;transition:transform 3s linear";
  document.body.append(node);
  requestAnimationFrame(() => {
    node.style.transform = "translateX(80px)";
  });
});
await page.waitForTimeout(1400);
const stillDisabled = await ui.locator('.dock .tool[data-tip="页面上没有动画"]').isDisabled();
if (!stillDisabled) throw new Error("页面过渡不该点亮播放键");

// 设置面板不会推动工具条
const dockBefore = await dock.boundingBox();
await ui.locator('.dock .tool[aria-label="设置"]').click();
const dockAfter = await dock.boundingBox();
if (Math.abs(dockBefore.x - dockAfter.x) > 1 || Math.abs(dockBefore.y - dockAfter.y) > 1) {
  throw new Error(`打开设置后工具条动了 ${JSON.stringify(dockBefore)} -> ${JSON.stringify(dockAfter)}`);
}
const menuText = await ui.locator(".menu").innerText();
if (!menuText.includes("颜色") || !menuText.includes("外观") || !menuText.includes("MCP")) {
  throw new Error(`设置项不全: ${menuText}`);
}
if (!menuText.includes("右键关闭标注弹窗")) throw new Error("设置里没有右键开关");
const switchAlign = await ui.locator(".switch-row").evaluate((row) => {
  const label = row.querySelector(".switch-label").getBoundingClientRect();
  const sw = row.querySelector(".switch").getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  return {
    delta: Math.abs((label.top + label.bottom) / 2 - (sw.top + sw.bottom) / 2),
    inside: sw.right <= rowBox.right + 1 && sw.left >= rowBox.left,
  };
});
if (switchAlign.delta > 2 || !switchAlign.inside) throw new Error(`右键开关错位: ${JSON.stringify(switchAlign)}`);
const stack = await ui.evaluate((el) => {
  const root = el.shadowRoot;
  return {
    anchor: Number(getComputedStyle(root.querySelector(".anchor")).zIndex),
    frame: Number(getComputedStyle(root.querySelector(".frame")).zIndex),
  };
});
if (!(stack.anchor > stack.frame)) throw new Error(`设置被选框盖住: ${JSON.stringify(stack)}`);
const menuScroll = await ui.locator(".menu").evaluate((el) => ({
  overflow: getComputedStyle(el).overflowY,
  clipped: el.scrollHeight > el.clientHeight + 1,
}));
if (menuScroll.clipped) throw new Error(`设置面板不该出现滚动条: ${JSON.stringify(menuScroll)}`);
const switchBtn = ui.locator('.switch[data-opt="right-click"]');
if ((await switchBtn.getAttribute("role")) !== "switch") throw new Error("右键选项应该是开关");
if (!(await switchBtn.getAttribute("class")).includes("on")) throw new Error("右键关闭默认应该打开");
await page.locator("h1").click({ force: true });
if (await ui.locator(".menu").isVisible()) throw new Error("点页面其他地方设置没收起");
if (await ui.locator(".card").isVisible()) await page.getByRole("button", { name: "取消" }).click();
await ui.locator('.dock .tool[aria-label="设置"]').click();
if (menuText.includes("/Users/")) throw new Error("MCP 配置还是本机路径");
const green = await ui.locator(".state-dot.ok").count();
if (green !== 1) throw new Error("已连接没有绿点");
if (!(await ui.locator(".code-copy").isVisible())) throw new Error("代码块里没有复制按钮");
await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
await ui.locator(".code-copy").click();
await page.waitForFunction(() => {
  const tip = document.querySelector("pinedit-root")?.shadowRoot?.querySelector(".code-copy")?.dataset.tip || "";
  return tip !== "复制";
});
const copiedTip = await ui.locator(".code-copy").getAttribute("data-tip");
if (!copiedTip.includes("已复制")) throw new Error(`复制没反馈: ${copiedTip}`);

// 颜色选中是外环，不是换底色
await ui.locator('.swatch[data-color="#3c8dff"]').click();
const ring = await ui.locator('.swatch[data-color="#3c8dff"]').evaluate((el) => getComputedStyle(el).boxShadow);
if (!ring.includes("rgb")) throw new Error(`颜色选中没外环: ${ring}`);
await ui.locator('.swatch[data-color="#ff383d"]').click();

await ui.locator('.opt[aria-label="亮色"]').click();
const lightTitle = await ui.locator(".menu-label").first().evaluate((el) => getComputedStyle(el).color);
const channel = (value) => Number(value.match(/\d+/)?.[0]);
if (channel(lightTitle) < 80) throw new Error(`亮色模式文字没有变深: ${lightTitle}`);
await ui.locator('.opt[aria-label="暗色"]').click();
await ui.locator('.dock .tool[aria-label="设置"]').click();

await page.locator("h1").hover();
const tip = await ui.locator(".tip").innerText();
if (tip !== 'h1 "结算"') throw new Error(`悬停描述不对: ${tip}`);

await page.evaluate(() => {
  const node = document.createElement("div");
  node.id = "corner";
  node.textContent = "角落";
  node.style.cssText = "position:fixed;left:8px;bottom:8px;width:220px;height:120px;background:#ddd";
  document.body.append(node);
});
await page.locator("#corner").click({ force: true });
await page.waitForTimeout(260);
const cardTopBefore = (await ui.locator(".card").boundingBox()).y;
await ui.locator(".card-head").click();
await page.waitForTimeout(60);
const cardBox = await ui.locator(".card").boundingBox();
if (!cardBox || cardBox.x < -1 || cardBox.y < -1 || cardBox.x + cardBox.width > 1281 || cardBox.y + cardBox.height > 801) {
  throw new Error(`展开后超出视口: ${JSON.stringify(cardBox)}`);
}
if (Math.abs(cardBox.y - cardTopBefore) > 1) {
  throw new Error(`展开详情不该挪动对话框: ${cardTopBefore} -> ${cardBox.y}`);
}
const detailBox = await ui.locator(".code").boundingBox();
if (!detailBox || detailBox.y + detailBox.height > cardBox.y + 2) {
  throw new Error(`详情应该向上弹开: ${JSON.stringify({ detailBox, cardBox })}`);
}
const detail = await ui.locator(".code").innerText();
if (!detail.includes("宽度") || !detail.includes("字色") || !detail.includes("圆角")) {
  throw new Error(`详情不是中文: ${detail}`);
}
if (/rgba?\(/i.test(detail) || !/#[0-9a-f]{6}/i.test(detail)) {
  throw new Error(`详情颜色应该是 # 色值: ${detail}`);
}
// 右键关闭弹窗（默认开启）
await ui.locator(".card").click({ button: "right" });
if (await ui.locator(".card").isVisible()) throw new Error("右键没有关闭弹窗");

// 关闭这个选项后，右键不再关弹窗
await ui.locator('.dock .tool[aria-label="设置"]').click();
await ui.locator('.switch[data-opt="right-click"]').click();
const offClass = await ui.locator('.switch[data-opt="right-click"]').getAttribute("class");
if (offClass.includes("on")) throw new Error("开关没有关掉");
await ui.locator('.dock .tool[aria-label="设置"]').click();
await page.locator("#corner").click({ force: true });
await ui.locator(".card").click({ button: "right" });
if (!(await ui.locator(".card").isVisible())) throw new Error("关掉设置后右键仍关弹窗");
await ui.locator('.dock .tool[aria-label="设置"]').click();
await ui.locator('.switch[data-opt="right-click"]').click();
await ui.locator('.dock .tool[aria-label="设置"]').click();
await page.getByRole("button", { name: "取消" }).click();

// 弹窗可以拖动
await page.locator("#corner").click({ force: true });
if (await ui.locator(".card-grip").count()) throw new Error("标注弹窗不该有点状把手");
const draggedFrom = await ui.locator(".card").boundingBox();
const gripBox = await ui.locator(".card-head").boundingBox();
await page.mouse.move(gripBox.x + 24, gripBox.y + gripBox.height / 2);
await page.mouse.down();
await page.mouse.move(gripBox.x + 24 - 60, gripBox.y - 40, { steps: 8 });
await page.mouse.up();
const draggedTo = await ui.locator(".card").boundingBox();
if (Math.abs(draggedTo.x - draggedFrom.x) < 20) throw new Error("弹窗拖不动");
await page.getByRole("button", { name: "取消" }).click();

await page.locator("#buy").click({ force: true });
const cardText = await ui.locator(".card").innerText();
if (!cardText.includes('button "购买"') || !cardText.includes("120×40")) {
  throw new Error(`卡片描述不对: ${cardText}`);
}
if (!(await page.getByRole("button", { name: "Pin" }).isDisabled())) {
  throw new Error("没写意见时 Pin 应该置灰");
}
const longNote = ["第一行", "第二行", "第三行", "第四行", "第五行", "第六行", "第七行"].join("\n");
await ui.locator("textarea").fill(longNote);
const tallField = await ui.locator("textarea").evaluate((el) => ({
  h: Math.round(el.getBoundingClientRect().height),
  scroll: el.scrollHeight,
}));
if (tallField.h > 120 || tallField.scroll <= tallField.h + 1) {
  throw new Error(`输入框超过 5 行应该停住并滚动: ${JSON.stringify(tallField)}`);
}
await ui.locator("textarea").fill("加宽到 160，圆角保持 8");
const shortField = await ui.locator("textarea").evaluate((el) => Math.round(el.getBoundingClientRect().height));
if (shortField >= tallField.h) throw new Error(`输入框删内容后应该变矮: ${shortField} -> ${tallField.h}`);
if (await page.getByRole("button", { name: "Pin" }).isDisabled()) {
  throw new Error("写了意见后 Pin 应该能点");
}
await page.getByRole("button", { name: "Pin" }).click();
await page.screenshot({ path: "/tmp/pinedit-annotated.png" });
if (await ui.locator(".card").isVisible()) throw new Error("按 Pin 之后弹窗应该关掉");
if (!(await ui.locator(".panel").isHidden())) throw new Error("记下之后列表不该自己弹出来");
await ui.locator('.dock .tool[aria-label="标注列表"]').click();
const listed = await ui.locator(".row .what").innerText();
if (!listed.includes("加宽到 160")) throw new Error(listed);
const sendStyle = await ui.locator('.dock .tool[aria-label="发给 AI"]').evaluate((el) => ({
  color: getComputedStyle(el).color,
  bg: getComputedStyle(el).backgroundColor,
  h: el.getBoundingClientRect().height,
  disabled: el.disabled,
}));
if (sendStyle.disabled) throw new Error("有标注后 PinEdit 不该置灰");
if (channel(sendStyle.color) < 180) throw new Error(`暗色 PinEdit 字应该是浅色: ${sendStyle.color}`);
if (sendStyle.h > 30) throw new Error(`PinEdit 按钮太高: ${sendStyle.h}`);
if (/rgba?\(0,\s*0,\s*0,\s*0\)/.test(sendStyle.bg) || /255,\s*56,\s*61/.test(sendStyle.bg)) {
  throw new Error(`PinEdit 应该是浅色底: ${sendStyle.bg}`);
}
const panelText = await ui.locator(".panel").innerText();
if (panelText.includes("交给 AI") || panelText.includes("PinEdit")) throw new Error(`列表里不该有发给 AI: ${panelText}`);

const darkTitle = await ui.locator(".what").evaluate((el) => getComputedStyle(el).color);
await ui.locator('.dock .tool[aria-label="设置"]').click();
await ui.locator('.opt[aria-label="亮色"]').click();
const lightSend = await ui.locator('.dock .tool[aria-label="发给 AI"]').evaluate((el) => getComputedStyle(el).color);
if (!/108,\s*108,\s*108/.test(lightSend)) throw new Error(`亮色 PinEdit 字色应该是 #6C6C6C: ${lightSend}`);
const lightRules = await ui.locator(".split, .menu-rule").evaluateAll((nodes) => nodes.map((el) => getComputedStyle(el).backgroundColor));
if (lightRules.length < 2 || lightRules.some((color) => color !== "rgb(229, 229, 229)")) {
  throw new Error(`亮色分割线应该是 #e5e5e5: ${lightRules.join(" | ")}`);
}
const lightRowTitle = await ui.locator(".what").evaluate((el) => getComputedStyle(el).color);
if (channel(lightRowTitle) > 80) throw new Error(`亮色标题不是深色字: ${lightRowTitle}`);
if (channel(darkTitle) < 180) throw new Error(`暗色标题不是浅色字: ${darkTitle}`);
await ui.locator('.opt[aria-label="暗色"]').click();
const darkSend = await ui.locator('.dock .tool[aria-label="发给 AI"]').evaluate((el) => ({
  bg: getComputedStyle(el).backgroundColor,
  color: getComputedStyle(el).color,
}));
if (darkSend.bg === "rgb(244, 244, 245)" || darkSend.bg === "rgb(255, 255, 255)") {
  throw new Error(`暗色 PinEdit 不该是浅底: ${darkSend.bg}`);
}
if (channel(darkSend.color) < 180) throw new Error(`暗色 PinEdit 字应该是浅色: ${darkSend.color}`);
const darkRules = await ui.locator(".split, .menu-rule").evaluateAll((nodes) => nodes.map((el) => getComputedStyle(el).backgroundColor));
if (darkRules.some((color) => color === "rgb(229, 229, 229)" || !/255,\s*255,\s*255/.test(color))) {
  throw new Error(`暗色分割线应该是浅色细线: ${darkRules.join(" | ")}`);
}
await ui.locator('.dock .tool[aria-label="设置"]').click();

// 选区标注：拖出独立区域，点它才出弹窗
await ui.locator('.dock .tool[aria-label="选区标注"]').click();
await page.mouse.move(300, 200);
await page.mouse.down();
await page.mouse.move(760, 268, { steps: 10 });
await page.mouse.up();
if (await ui.locator(".card").isVisible()) throw new Error("拖完选区不该自动弹卡片");
const pendingBox = await ui.locator(".region-mark.pending").boundingBox();
if (!pendingBox || Math.round(pendingBox.width) !== 460 || Math.round(pendingBox.height) !== 68) {
  throw new Error(`选区块尺寸不对: ${JSON.stringify(pendingBox)}`);
}
if ((await ui.locator(".toast").innerText()).includes("区域拖好了")) throw new Error("不该提示点选区写意见");
await page.mouse.move(pendingBox.x + 200, pendingBox.y + 30);
await page.mouse.down();
await page.mouse.move(pendingBox.x + 240, pendingBox.y + 70, { steps: 6 });
await page.mouse.up();
const movedBox = await ui.locator(".region-mark.pending").boundingBox();
if (Math.abs(movedBox.x - pendingBox.x) < 10) throw new Error(`选区模式里应该能拖动 ${pendingBox.x} -> ${movedBox.x}`);
if ((await ui.locator(".region-mark").count()) !== 1) throw new Error("选区模式里拖已有选区不该再加一块");
const handleBox = await ui.locator(".region-mark.pending .handle").boundingBox();
await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
await page.mouse.down();
await page.mouse.move(handleBox.x + 60, handleBox.y + 40, { steps: 6 });
await page.mouse.up();
const resized = await ui.locator(".region-mark.pending").boundingBox();
if (resized.width <= movedBox.width + 20) throw new Error(`选区块改不大 ${movedBox.width} -> ${resized.width}`);
await ui.locator(".region-mark.pending").click({ force: true });
if (await ui.locator(".card").isVisible()) throw new Error("选区模式里不该打开标注弹窗");
await ui.locator('.dock .tool[aria-label="退出选区"]').click();
await page.mouse.move(resized.x + resized.width / 2, resized.y + resized.height / 2);
await page.mouse.down();
await page.mouse.move(resized.x + resized.width / 2 + 36, resized.y + resized.height / 2 + 24, { steps: 6 });
await page.mouse.up();
const stayed = await ui.locator(".region-mark.pending").boundingBox();
if (Math.abs(stayed.x - resized.x) > 1 || Math.abs(stayed.y - resized.y) > 1) {
  throw new Error(`没进选区模式不该能拖动: ${JSON.stringify({ resized, stayed })}`);
}
const handleShown = await ui.locator(".region-mark.pending .handle").evaluate((el) => getComputedStyle(el).display);
if (handleShown !== "none") throw new Error("没进选区模式不该露出缩放手柄");
await page.waitForTimeout(320);
await ui.locator(".region-mark.pending").click();
const regionCard = await ui.locator(".card").innerText();
if (!regionCard.includes("区域") || !regionCard.includes("×")) {
  throw new Error(`选区卡片不对: ${regionCard}`);
}
const regionCardBox = await ui.locator(".card").boundingBox();
const gapRight = regionCardBox.x - (resized.x + resized.width);
const gapLeft = resized.x - (regionCardBox.x + regionCardBox.width);
if (!((gapRight >= -2 && gapRight < 36) || (gapLeft >= -2 && gapLeft < 36))) {
  throw new Error(`选区弹窗离选区太远: ${JSON.stringify({ regionCardBox, resized, gapRight, gapLeft })}`);
}
if (!(await page.getByRole("button", { name: "Pin" }).isDisabled())) {
  throw new Error("区域没写意见时 Pin 也应该置灰");
}
await ui.locator("textarea").fill("这里加一条顶栏，高度按选的来");
await page.getByRole("button", { name: "Pin" }).click();
const regionMark = await ui.locator(".region-mark").count();
if (regionMark !== 1) throw new Error(`选区没画在页面上: ${regionMark}`);
if (await ui.locator(".region-mark.pending").count()) throw new Error("Pin 之后临时选区应该清掉");
await page.locator("h1").hover();
const frameStyle = await ui.locator(".frame").evaluate((el) => getComputedStyle(el).borderTopStyle);
if (frameStyle !== "solid") throw new Error(`选区之后元素选框不该是虚线: ${frameStyle}`);
await page.mouse.move(8, 8);

await ui.locator('.dock .tool[aria-label="发给 AI"]').click();
await page.waitForFunction(() => {
  const text = document.querySelector("pinedit-root")?.shadowRoot?.querySelector(".toast")?.textContent || "";
  return text.includes("提示已复制");
});
const after = await ui.locator(".toast").innerText();
if (!after.includes("已交给 AI")) throw new Error(after);
const clip = await page.evaluate(() => navigator.clipboard.readText());
if (clip !== "按 PinEdit 的标注改") throw new Error(`发送后应复制提示: ${clip}`);
if (await ui.locator(".panel").isHidden()) await ui.locator('.dock .tool[aria-label="标注列表"]').click();
const listWidths = await ui.locator(".anchor").evaluate((el) => ({
  dock: el.querySelector(".dock").getBoundingClientRect().width,
  panel: el.querySelector(".panel").getBoundingClientRect().width,
  dockZ: Number(getComputedStyle(el.querySelector(".dock")).zIndex),
  panelZ: Number(getComputedStyle(el.querySelector(".panel")).zIndex),
}));
if (Math.abs(listWidths.dock - listWidths.panel) > 1) {
  throw new Error(`列表应和工具条同宽: ${JSON.stringify(listWidths)}`);
}
if (!(listWidths.dockZ > listWidths.panelZ)) throw new Error(`提示该压过列表: ${JSON.stringify(listWidths)}`);
const listScroll = await ui.locator(".list").evaluate((el) => getComputedStyle(el).scrollbarWidth);
if (listScroll === "none") throw new Error("列表悬停时应该能滚");
await page.locator("h1").click({ force: true });
if (!(await ui.locator(".panel").isHidden())) throw new Error("点页面其他地方列表没收起");
if (await ui.locator(".card").isVisible()) await page.getByRole("button", { name: "取消" }).click();
if (await ui.locator(".panel").isHidden()) await ui.locator('.dock .tool[aria-label="标注列表"]').click();
const rows = await ui.locator(".row").count();
if (rows !== 2) throw new Error(`提交后记录没留住: ${rows}`);
const sentNotes = await ui.locator(".sent-note").evaluateAll((nodes) => nodes.map((el) => ({
  text: el.textContent,
  bg: getComputedStyle(el).backgroundColor,
  parent: el.parentElement?.className || "",
})));
if (sentNotes.length !== 2 || sentNotes.some((item) => item.text !== "已交给 AI" || item.parent !== "meta")) {
  throw new Error(`已交给 AI 应该在标题下一行末尾: ${JSON.stringify(sentNotes)}`);
}
if (sentNotes.some((item) => !item.bg.endsWith(", 0)"))) {
  throw new Error(`已交给 AI 应该是文字，不是标签: ${JSON.stringify(sentNotes)}`);
}
const sentPlace = await ui.locator(".row").first().evaluate((row) => {
  const meta = row.querySelector(".meta-text").getBoundingClientRect();
  const note = row.querySelector(".sent-note").getBoundingClientRect();
  const copy = row.querySelector(".copy").getBoundingClientRect();
  return { gap: Math.round(note.left - meta.right), slack: Math.round(copy.right - note.right) };
});
if (sentPlace.gap > 20 || sentPlace.slack < 24) {
  throw new Error(`已交给 AI 应该紧跟尺寸: ${JSON.stringify(sentPlace)}`);
}
await ui.locator(".row .drop").first().click();
const rowsLeft = await ui.locator(".row").count();
if (rowsLeft !== 1) throw new Error(`删除没生效: ${rowsLeft}`);

await ui.locator('.dock .tool[aria-label="选区标注"]').click();
await page.mouse.move(200, 420);
await page.mouse.down();
await page.mouse.move(560, 470, { steps: 8 });
await page.mouse.up();
const beforeDelete = await ui.locator(".region-mark").count();
await ui.locator(".region-mark.pending .drop-mini").click();
const afterDelete = await ui.locator(".region-mark").count();
if (afterDelete !== beforeDelete - 1) throw new Error(`选区块删除没生效: ${beforeDelete} -> ${afterDelete}`);
await ui.locator('.dock .tool[aria-label="退出选区"]').click();

await page.setViewportSize({ width: 390, height: 800 });
await page.screenshot({ path: "/tmp/pinedit-mobile.png" });
const dockBox = await dock.boundingBox();
if (!dockBox || dockBox.width > 380) throw new Error(`窄屏坞太宽: ${dockBox && dockBox.width}`);
await page.setViewportSize({ width: 1280, height: 800 });

const before = await dock.boundingBox();
const markBefore = await ui.locator(".region-mark").boundingBox();
await page.mouse.move(before.x + 8, before.y + before.height / 2);
await page.mouse.down();
await page.mouse.move(before.x - 180, before.y - 120, { steps: 8 });
await page.mouse.up();
const moved = await dock.boundingBox();
if (!moved || moved.x > before.x - 40) throw new Error(`拖不动 ${before.x} -> ${moved && moved.x}`);
const markAfter = await ui.locator(".region-mark").boundingBox();
if (!markBefore || !markAfter || Math.abs(markBefore.x - markAfter.x) > 1) {
  throw new Error("拖工具条不该改页面上的标记");
}
const notesAfterDrag = await ui.locator(".row").count();
if (notesAfterDrag !== 1) throw new Error(`拖动误触发了别的操作: ${notesAfterDrag}`);
// 从按钮上起手拖动，也不能触发这个按钮
const listBtnBox = await ui.locator('.dock .tool[aria-label="标注列表"]').boundingBox();
const wasOpen = !(await ui.locator(".panel").isHidden());
await page.mouse.move(listBtnBox.x + listBtnBox.width / 2, listBtnBox.y + listBtnBox.height / 2);
await page.mouse.down();
await page.mouse.move(listBtnBox.x + 40, listBtnBox.y - 90, { steps: 10 });
await page.mouse.up();
const stillOpen = !(await ui.locator(".panel").isHidden());
if (stillOpen !== wasOpen) throw new Error("从按钮上拖动触发了这个按钮");
await ui.locator('.dock .tool[aria-label="标注列表"]').click();
if (await ui.locator(".panel").isHidden()) await ui.locator('.dock .tool[aria-label="标注列表"]').click();

const marksBeforeCollapse = await ui.locator(".pin, .region-mark").count();
if (marksBeforeCollapse < 1) throw new Error("收起前页面上应该有标注");
const closeBox = await ui.locator('.dock .tool[aria-label="收起"]').boundingBox();
await ui.locator('.dock .tool[aria-label="收起"]').click();
if (await ui.locator(".pin, .region-mark").count()) throw new Error("收起后标注应该隐藏");
const chipText = await ui.locator(".chip .count").innerText();
if (chipText !== "1") throw new Error(`收起后数量不对: ${chipText}`);
if (!(await dock.isHidden())) throw new Error("收起后工具条还在");
const chipBox = await ui.locator(".chip").boundingBox();
const closeCenter = { x: closeBox.x + closeBox.width / 2, y: closeBox.y + closeBox.height / 2 };
const chipCenter = { x: chipBox.x + chipBox.width / 2, y: chipBox.y + chipBox.height / 2 };
if (!chipBox || Math.hypot(chipCenter.x - closeCenter.x, chipCenter.y - closeCenter.y) > 4) {
  throw new Error(`悬浮按钮不在关闭键上: ${JSON.stringify({ closeBox, chipBox })}`);
}
await ui.locator(".chip").click();
if (await dock.isHidden()) throw new Error("点开后工具条没回来");
if ((await ui.locator(".pin, .region-mark").count()) < 1) throw new Error("展开后标注应该回来");
const closeAgain = await ui.locator('.dock .tool[aria-label="收起"]').boundingBox();
const backCenter = { x: closeAgain.x + closeAgain.width / 2, y: closeAgain.y + closeAgain.height / 2 };
if (Math.hypot(backCenter.x - chipCenter.x, backCenter.y - chipCenter.y) > 4) {
  throw new Error(`展开后关闭键没回到悬浮按钮处: ${JSON.stringify({ chipBox, closeAgain })}`);
}

await page.locator("h1").click();
await ui.locator("textarea").fill("再加一条");
await page.getByRole("button", { name: "Pin" }).click();
await ui.locator('.dock .tool[aria-label="发给 AI"]').click();
await page.waitForFunction(() => {
  const text = document.querySelector("pinedit-root")?.shadowRoot?.querySelector(".toast")?.textContent || "";
  return text.includes("还没读取");
});
const merged = await page.evaluate(() => globalThis.__PINEDIT_POSTS.at(-1).annotations.map((item) => item.comment));
if (merged.length !== 2 || !merged.includes("再加一条") || !merged.includes("这里加一条顶栏，高度按选的来")) {
  throw new Error(`未读取的标注应该和新的一起交: ${JSON.stringify(merged)}`);
}

if (await ui.locator(".panel").isHidden()) await ui.locator('.dock .tool[aria-label="标注列表"]').click();
await ui.locator(".panel-clear").click();
const rowsCleared = await ui.locator(".row").count();
if (rowsCleared !== 0) throw new Error(`列表里的清空没生效: ${rowsCleared}`);
if (!(await ui.locator(".panel").isHidden())) throw new Error("清空后列表应该收起");

await browser.close();
server.close();
console.log("overlay ok");
