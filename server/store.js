import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function dataFile() {
  const root = process.env.PINEDIT_HOME || path.join(os.homedir(), ".pinedit");
  return path.join(root, "pending.json");
}

function read() {
  const file = dataFile();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function write(batch) {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(batch, null, 2));
  fs.renameSync(tmp, file);
}

export function getPending() {
  const batch = read();
  if (!batch || batch.consumed) return null;
  return batch;
}

export function putPending(batch) {
  const previous = getPending();
  const next = {
    ...batch,
    createdAt: new Date().toISOString(),
    consumed: false,
  };
  write(next);
  return { batch: next, replaced: Boolean(previous) };
}

export function completePending(id) {
  const batch = getPending();
  if (!batch) return { ok: false, reason: "empty" };
  if (batch.id !== id) return { ok: false, reason: "mismatch" };
  const file = dataFile();
  fs.rmSync(file, { force: true });
  return { ok: true };
}
