import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function environment(overrides = {}) {
  return {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    ...overrides,
  };
}

const context = { waitUntil() {}, passThroughOnException() {} };

test("server-renders the outcome-first agent intake", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), environment(), context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Agent Studio 2027/);
  assert.match(html, /Enter your company website and describe the outcome you want/);
  assert.match(html, /Create my agent/);
  assert.doesNotMatch(html, /codex-preview|chatgpt\.site|openai-site/i);
});

test("keeps every legacy configurator parameter available in one studio", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const expected of [
    "Full name", "Work email", "Company", "Website URL", "Company description", "Primary use case", "Primary language",
    "Answer incoming calls", "Support customers", "Qualify leads", "Follow up and sell", "Help website visitors", "Help me choose", "Other language",
  ]) assert.match(page, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(page, /Apply changes & update routes/);
  assert.match(page, /protected manual edits/);
});

test("persists and restores a standalone agent configuration", async () => {
  const worker = await loadWorker();
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), "voiceagent-test-"));
  try {
    const config = { version: 1, agentName: "Sara", business: { name: "Acme" }, flowNodes: [1, 2, 3, 4, 5] };
    const saved = await worker.fetch(new Request("http://localhost/api/agent/save", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ config }),
    }), environment({ AGENT_DATA_DIR: dataRoot }), context);
    assert.equal(saved.status, 200);
    const savedBody = await saved.json();
    assert.match(savedBody.id, /^[a-z0-9-]{8,}$/);
    const loaded = await worker.fetch(new Request(`http://localhost/api/agent/load?id=${savedBody.id}`), environment({ AGENT_DATA_DIR: dataRoot }), context);
    assert.equal(loaded.status, 200);
    assert.deepEqual((await loaded.json()).config, config);
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
  }
});

test("extracts text knowledge instead of storing a decorative filename", async () => {
  const worker = await loadWorker();
  const form = new FormData();
  form.append("file", new Blob(["Pricing starts at 100 dollars. Support is available every weekday."], { type: "text/plain" }), "knowledge.txt");
  const response = await worker.fetch(new Request("http://localhost/api/agent/knowledge", { method: "POST", body: form }), environment(), context);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.name, "knowledge.txt");
  assert.match(body.text, /Pricing starts at 100 dollars/);
  assert.equal(body.status, "processed");
});
