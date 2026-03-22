import { spawn, execSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import pc from "picocolors";

/**
 * 启动桥：配置 OpenClaw Gateway → 连接微信 ↔ Agent HTTP
 */
export async function start(agentUrl) {
  // 1. 确保 OpenClaw 已安装
  if (!commandExists("openclaw")) {
    console.log(pc.yellow("⏳ 正在安装 OpenClaw Gateway..."));
    try {
      execSync("npm install -g openclaw@latest", { stdio: "inherit" });
      console.log(pc.green("✅ OpenClaw 已安装"));
    } catch {
      console.error(pc.red("❌ 安装失败，请手动运行: npm install -g openclaw"));
      process.exit(1);
    }
  }

  // 2. 写入配置：把 Agent URL 注册为自定义 Provider
  console.log(pc.dim("📝 写入网关配置..."));
  await writeConfig(agentUrl);

  // 3. 启动 Gateway
  console.log(pc.green("🚀 启动网关..."));
  console.log(pc.dim("   微信扫码后即可开始对话"));
  console.log();

  const gateway = spawn("openclaw", ["gateway", "run"], {
    stdio: "inherit",
    env: { ...process.env },
  });

  gateway.on("error", (err) => {
    console.error(pc.red(`网关启动失败: ${err.message}`));
    process.exit(1);
  });

  gateway.on("exit", (code) => {
    process.exit(code || 0);
  });

  // Ctrl+C 清理
  process.on("SIGINT", () => {
    gateway.kill("SIGINT");
  });
}

/**
 * 写入 OpenClaw 配置，将 Agent URL 注册为自定义 Provider
 */
async function writeConfig(agentUrl) {
  const openclawDir = resolve(homedir(), ".openclaw");
  await mkdir(openclawDir, { recursive: true });

  const config = {
    models: {
      providers: {
        mode: "merge",
        list: [
          {
            name: "wechat-to-anything",
            baseUrl: agentUrl,
            api: "openai-completions",
            models: [{ id: "default" }],
          },
        ],
      },
    },
    agents: {
      defaults: {
        models: ["default"],
      },
    },
  };

  await writeFile(
    resolve(openclawDir, "openclaw.json"),
    JSON.stringify(config, null, 2) + "\n"
  );
}

function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
