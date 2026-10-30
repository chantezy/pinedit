#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { formatBatch } from "./format.js";
import { completePending, getPending, putPending } from "./store.js";

const { version } = createRequire(import.meta.url)("./package.json");

export function listenPort() {
  return Number(process.env.PINEDIT_PORT || 4737);
}

const annotationSchema = z.object({
  number: z.number().int().positive(),
  comment: z.string().max(1000),
  selector: z.string().min(1).max(2000),
  tag: z.string().min(1).max(40),
  text: z.string().max(200),
  selected: z.boolean().optional(),
  rect: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().nonnegative(),
      height: z.number().nonnegative(),
    })
    .optional(),
  box: z.object({
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
    padding: z.string().max(80),
    fontSize: z.string().max(40),
    fontWeight: z.string().max(40),
    color: z.string().max(80),
    backgroundColor: z.string().max(80),
    borderRadius: z.string().max(80),
  }),
});

const batchSchema = z.object({
  id: z.string().min(8).max(80),
  pageUrl: z.string().max(4000),
  pageTitle: z.string().max(500),
  viewport: z.object({
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
  }),
  annotations: z.array(annotationSchema).min(1).max(50),
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function startHttp(port = listenPort()) {
  const server = http.createServer(async (req, res) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    try {
      if (req.method === "GET" && req.url === "/health") {
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.method === "GET" && req.url === "/mcp-config") {
        const config = mcpConfig();
        res.end(JSON.stringify({ ok: true, ...config }));
        return;
      }
      if (req.method === "GET" && req.url === "/pending") {
        res.end(JSON.stringify({ pending: getPending() }));
        return;
      }
      if (req.method === "POST" && req.url === "/batches") {
        const parsed = batchSchema.safeParse(JSON.parse(await readBody(req)));
        if (!parsed.success) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: "invalid_batch" }));
          return;
        }
        const saved = putPending(parsed.data);
        res.end(JSON.stringify({ ok: true, id: saved.batch.id, replaced: saved.replaced }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false }));
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: "bad_request" }));
    }
  });
  return new Promise((resolve) => {
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`PinEdit: ${port} 已有服务在听，这次只提供 MCP。`);
        resolve(null);
        return;
      }
      throw error;
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

export function mcpConfig() {
  const self = fileURLToPath(import.meta.url);
  const installed = self.includes(`${path.sep}node_modules${path.sep}`);
  const npx = { mcpServers: { pinedit: { command: "npx", args: ["-y", "pinedit-mcp"] } } };
  const local = { mcpServers: { pinedit: { command: "node", args: [self] } } };
  return {
    installed,
    config: JSON.stringify(npx, null, 2),
    localConfig: JSON.stringify(local, null, 2),
  };
}

export function createMcp() {
  const mcp = new McpServer({ name: "pinedit", version });
  mcp.registerTool(
    "pinedit_get_pending",
    {
      title: "读取待处理标注",
      description:
        "读取用户在 PinEdit 里交给 AI、尚未取走的一批页面标注。包含选择器、真实尺寸和意见。没有则明确说明为空。不要编造标注。",
      inputSchema: z.object({}),
    },
    async () => {
      const batch = getPending();
      if (!batch) {
        return textResult("没有待读取的标注。请让用户在浏览器里标完，并点右下角的 PinEdit 按钮。");
      }
      return textResult(`${formatBatch(batch)}\n读完并开始改之前，调用 pinedit_complete，batchId 用上面的批次 id。`);
    },
  );
  mcp.registerTool(
    "pinedit_complete",
    {
      title: "取走一批标注",
      description: "确认这批标注已经进入当前对话后删除它，让用户可以开始下一轮。只删除 id 匹配的那一批。",
      inputSchema: z.object({
        batchId: z.string().describe("pinedit_get_pending 返回的批次 id"),
      }),
    },
    async ({ batchId }) => {
      const result = completePending(batchId);
      if (!result.ok && result.reason === "empty") return textResult("没有待删除的标注。");
      if (!result.ok) return textResult("批次 id 对不上，没有删除。请重新读取。");
      return textResult(`已取走 ${batchId}。按标注修改页面，下一轮页面上会是新的一批。`);
    },
  );
  return mcp;
}

async function main() {
  await startHttp();
  const mcp = createMcp();
  await mcp.connect(new StdioServerTransport());
}

export function startedAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(fs.realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (startedAsCli()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
