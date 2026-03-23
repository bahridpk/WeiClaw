/**
 * Google Gemini CLI Agent — 通过 gemini CLI 调用
 *
 * 前置：npm install -g @google/gemini-cli
 * 用法：node server.mjs
 */

import { createServer } from "node:http";
import crossSpawn from "cross-spawn";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const PORT = 3002;
const TMP_DIR = join(tmpdir(), "wechat-gemini");

function runGemini(prompt) {
  return new Promise(async (resolve, reject) => {
    await mkdir(TMP_DIR, { recursive: true });

    const child = crossSpawn("gemini", [], {
      cwd: tmpdir(),
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300_000,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    // 发送 prompt 到 stdin 然后关闭
    child.stdin.write(prompt);
    child.stdin.end();

    child.on("close", (code) => {
      const reply = stdout.trim();
      if (reply) {
        resolve(reply);
      } else if (code !== 0) {
        reject(new Error((stderr || `exit code ${code}`).trim().slice(0, 300)));
      } else {
        resolve("(empty response)");
      }
    });

    child.on("error", (err) => {
      reject(new Error(`gemini CLI 未安装或不可用: ${err.message}`));
    });
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url.endsWith("/chat/completions")) {
    let body = "";
    for await (const chunk of req) body += chunk;

    try {
      const { messages } = JSON.parse(body);
      const lastMsg = messages[messages.length - 1];
      let prompt = "";

      if (typeof lastMsg.content === "string") {
        prompt = lastMsg.content;
      } else if (Array.isArray(lastMsg.content)) {
        for (const part of lastMsg.content) {
          if (part.type === "text") {
            prompt += (prompt ? "\n" : "") + part.text;
          }
        }
      }

      if (!prompt) { res.writeHead(400); res.end('{"error":"empty"}'); return; }

      console.log(`← ${prompt.slice(0, 80)}`);

      const reply = await runGemini(prompt);
      console.log(`→ ${reply.slice(0, 80)}`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: reply } }] }));
    } catch (err) {
      console.error(`❌ ${err.message.slice(0, 200)}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"status":"ok","agent":"gemini"}');
  }
});

server.listen(PORT, () => {
  console.log(`🤖 Gemini Agent 运行在 http://localhost:${PORT}/v1`);
  console.log(`   通过 Gemini CLI 调用`);
});
