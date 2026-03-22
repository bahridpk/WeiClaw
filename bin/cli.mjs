#!/usr/bin/env node

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const [, , command = "init", ...args] = process.argv;

const commands = {
  init: () => import("../cli/commands/init.mjs"),
  start: () => import("../cli/commands/start.mjs"),
  stop: () => import("../cli/commands/stop.mjs"),
  status: () => import("../cli/commands/status.mjs"),
  switch: () => import("../cli/commands/switch.mjs"),
  help: () => showHelp(),
};

function showHelp() {
  console.log(`
🌉 wechat-to-anything — Connect WeChat to any AI Agent

Usage:
  npx wechat-to-anything <command>

Commands:
  init      Interactive setup wizard (default)
  start     Start all services
  stop      Stop all services
  status    Show running status
  switch    Switch to a different Agent template
  help      Show this help

Examples:
  npx wechat-to-anything init
  npx wechat-to-anything init --template @my/agent-template
  npx wechat-to-anything switch

Docs: https://github.com/kellyvv/wechat-to-anything
`);
}

async function main() {
  if (command === "help" || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  const loader = commands[command];
  if (!loader) {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }

  const mod = await loader();
  await mod.default({ root, args });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
