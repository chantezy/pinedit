import { shouldInject } from "./page-guard.js";

const API = "http://127.0.0.1:4737";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  if (!shouldInject(tab.url)) {
    await showBlocked(tab.id, "这个页面不能标注。请打开本地 html 文件或普通网页后再点图标。");
    return;
  }
  try {
    await openDock(tab.id);
    await clearBadge(tab.id);
  } catch (error) {
    await showBlocked(tab.id, "本地 html 请先到扩展详情勾选「允许访问文件网址」，再回到文件页点图标。");
    console.error("PinEdit", error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "pinedit:http") return undefined;
  fetch(`${API}${message.path}`, {
    method: message.method,
    headers: message.body ? { "content-type": "application/json" } : undefined,
    body: message.body ? JSON.stringify(message.body) : undefined,
  })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      sendResponse({ ok: response.ok, status: response.status, body });
    })
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

async function openDock(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "pinedit:toggle" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["overlay-css.js", "icon-src.js", "content.js"],
    });
    await chrome.tabs.sendMessage(tabId, { type: "pinedit:toggle" });
  }
}

function clearBadge(tabId) {
  return chrome.action.setBadgeText({ tabId, text: "" });
}

async function showBlocked(tabId, title) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#8E2E28" });
  await chrome.action.setBadgeText({ tabId, text: "!" });
  await chrome.action.setTitle({ tabId, title });
}
