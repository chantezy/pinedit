import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { completePending, getPending, putPending } from "./store.js";
import { formatBatch } from "./format.js";
import { startHttp } from "./index.js";

const home = mkdtempSync(path.join(tmpdir(), "pinedit-"));
process.env.PINEDIT_HOME = home;
process.env.PINEDIT_PORT = "0";

after(() => {
  rmSync(home, { recursive: true, force: true });
});

const sample = {
  id: "batch-12345678",
  pageUrl: "http://localhost:5173/",
  pageTitle: "首页",
  viewport: { width: 1280, height: 800 },
  annotations: [
    {
      number: 1,
      comment: "加宽到 160",
      selector: "button.primary",
      tag: "button",
      text: "提交",
      box: {
        width: 120,
        height: 40,
        padding: "8px 16px 8px 16px",
        fontSize: "14px",
        fontWeight: "600",
        color: "rgb(255, 255, 255)",
        backgroundColor: "rgb(194, 77, 44)",
        borderRadius: "8px",
      },
    },
  ],
};

test("新的一批会换掉还没取走的", () => {
  const first = putPending(sample);
  assert.equal(first.replaced, false);
  const second = putPending({ ...sample, id: "batch-87654321" });
  assert.equal(second.replaced, true);
  assert.equal(getPending().id, "batch-87654321");
});

test("取走之后就没有待读取", () => {
  putPending(sample);
  assert.equal(completePending("wrong-id-value").ok, false);
  assert.equal(completePending(sample.id).ok, true);
  assert.equal(getPending(), null);
  assert.equal(completePending(sample.id).reason, "empty");
});

test("格式里以意见和元素描述为主", () => {
  const text = formatBatch(sample);
  assert.match(text, /button：「提交」/);
  assert.match(text, /120×40/);
  assert.match(text, /加宽到 160/);
  assert.match(text, /button\.primary/);
  assert.doesNotMatch(text, /\*\*内边距|\*\*字号|\*\*字色|\*\*底色|\*\*圆角/);
});

test("圈选文字会标明只改这段", () => {
  const text = formatBatch({
    ...sample,
    annotations: [
      {
        ...sample.annotations[0],
        text: "一年会员",
        selected: true,
      },
    ],
  });
  assert.match(text, /「一年会员」/);
  assert.match(text, /改的是圈选的这段文字，不是整个元素/);
});

test("区域标注能通过校验并写进格式", async () => {
  const region = {
    ...sample,
    id: "batch-region-01",
    annotations: [
      ...sample.annotations,
      {
        number: 2,
        comment: "这里加一条顶栏",
        selector: "rect(0, 0, 1280, 64)",
        tag: "region",
        text: "",
        rect: { x: 0, y: 0, width: 1280, height: 64 },
        box: {
          width: 1280,
          height: 64,
          padding: "—",
          fontSize: "—",
          fontWeight: "—",
          color: "—",
          backgroundColor: "—",
          borderRadius: "—",
        },
      },
    ],
  };
  const text = formatBatch(region);
  assert.match(text, /区域/);
  assert.match(text, /1280×64/);
  assert.match(text, /这里加一条顶栏/);
  assert.doesNotMatch(text, /rect\(0, 0, 1280, 64\)/);
  const server = await startHttp(0);
  assert.ok(server);
  const { port } = server.address();
  const posted = await fetch(`http://127.0.0.1:${port}/batches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(region),
  });
  assert.equal(posted.status, 200);
  server.close();
});

test("本机接口能收下一批", async () => {
  const server = await startHttp(0);
  assert.ok(server);
  const { port } = server.address();
  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  const posted = await fetch(`http://127.0.0.1:${port}/batches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sample),
  });
  const body = await posted.json();
  assert.equal(body.ok, true);
  const pending = await fetch(`http://127.0.0.1:${port}/pending`);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.pending.id, sample.id);
  server.close();
});

test("npx 的命令名不是 index.js 时也会启动", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pinedit-bin-"));
  const link = path.join(dir, "pinedit-mcp");
  symlinkSync(fileURLToPath(new URL("./index.js", import.meta.url)), link);
  const child = spawn(link, [], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PINEDIT_PORT: "0" },
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const line = await new Promise((resolve, reject) => {
    let stdout = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timeout stdout=${stdout} stderr=${stderr}`));
    }, 8000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const newline = stdout.indexOf("\n");
      if (newline === -1) return;
      clearTimeout(timer);
      resolve(stdout.slice(0, newline));
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`exit ${code} stderr=${stderr}`));
    });
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "probe", version: "0" },
        },
      })}\n`,
    );
  });
  child.kill();
  rmSync(dir, { recursive: true, force: true });
  const message = JSON.parse(line);
  assert.equal(message.id, 1);
  assert.equal(message.result.serverInfo.name, "pinedit");
});
