import assert from "node:assert/strict";
import test from "node:test";
import { shouldInject } from "./page-guard.js";

test("没有地址时仍然注入，Chrome 点击经常不给 url", () => {
  assert.equal(shouldInject(undefined), true);
  assert.equal(shouldInject(""), true);
});

test("普通网页可以标注", () => {
  assert.equal(shouldInject("https://example.com"), true);
  assert.equal(shouldInject("http://localhost:5173/"), true);
  assert.equal(shouldInject("file:///Users/Fronter/4399/AI/workniu/github/index.html"), true);
});

test("浏览器内部页不注入", () => {
  assert.equal(shouldInject("chrome://extensions"), false);
  assert.equal(shouldInject("chrome://newtab/"), false);
});
