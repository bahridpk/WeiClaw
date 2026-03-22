/**
 * Claude Code → OpenAI 兼容 HTTP 服务
 * 
 * 把 Claude Code SDK 包装成标准 HTTP 接口，
 * 供 wechat-to-anything 桥转发微信消息。
 * 
 * 用法:
 *   npm install
 *   ANTHROPIC_API_KEY=sk-ant-xxx node server.mjs
 */

import { createServer } from "node:http";

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  // 只处理 POST /v1/chat/completions
  if (req.method !== "POST" || !req.url.startsWith("/v1/chat/completions")) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const body = await readBody(req);
  const { messages } = JSON.parse(body);
  const userMessage = messages?.findLast((m) => m.role === "user")?.content || "";

  try {
    // 调 Claude Code SDK
    const { claude } = await import("@anthropic-ai/claude-code");
    const result = await claude(userMessage, { abortController: new AbortController() });

    // 返回 OpenAI 兼容格式
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      choices: [{
        message: { role: "assistant", content: String(result) },
      }],
    }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`🧬 Claude Code Agent 运行在 http://localhost:${PORT}/v1`);
  console.log(`   然后运行: npx wechat-to-anything http://localhost:${PORT}/v1`);
});

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}
