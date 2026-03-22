#!/usr/bin/env node

import pc from "picocolors";

const url = process.argv[2];

if (!url || url === "--help" || url === "-h") {
  console.log(`
${pc.cyan("🌉 wechat-to-anything")}

${pc.dim("一条命令，把微信变成任何 AI Agent 的入口")}

${pc.bold("用法:")}
  npx wechat-to-anything ${pc.green("<agent-url>")}

${pc.bold("示例:")}
  npx wechat-to-anything http://localhost:3000/v1
  npx wechat-to-anything https://my-agent.example.com/v1

Agent 需要暴露一个 OpenAI 兼容的 HTTP 接口 (POST /v1/chat/completions)。
参考 examples/claude-code/ 目录的示例。

${pc.dim("Docs: https://github.com/kellyvv/wechat-to-anything")}
`);
  process.exit(url ? 0 : 1);
}

// 验证 URL 格式
try {
  new URL(url);
} catch {
  console.error(pc.red(`无效的 URL: ${url}`));
  process.exit(1);
}

console.log();
console.log(pc.cyan("🌉 wechat-to-anything"));
console.log(pc.dim(`   Agent: ${url}`));
console.log();

import("../cli/bridge.mjs").then((mod) => mod.start(url)).catch((err) => {
  console.error(pc.red(err.message));
  process.exit(1);
});
