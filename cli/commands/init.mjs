import * as p from "@clack/prompts";
import pc from "picocolors";
import { writeFile, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

function commandExists(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd, label) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (err) {
    p.log.error(`${label} 失败: ${err.message}`);
    return false;
  }
}

export default async function init({ root }) {
  console.log();
  p.intro(pc.bgCyan(pc.black(" 🌉 wechat-to-anything ")));

  // ── 第 1 步：填 API Key ──
  const apiKey = await p.text({
    message: "输入你的 Anthropic API Key",
    placeholder: "sk-ant-...",
    validate: (v) => {
      if (!v || v.trim().length === 0) return "API Key 不能为空";
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("已取消");
    process.exit(0);
  }

  // ── 第 2 步：安装 OpenClaw（如果没有）──
  const s = p.spinner();

  if (!commandExists("openclaw")) {
    s.start("正在安装 OpenClaw...");
    if (!run("npm install -g openclaw", "安装 OpenClaw")) {
      s.stop("❌ OpenClaw 安装失败");
      p.log.info("请手动运行: npm install -g openclaw");
      process.exit(1);
    }
    s.stop("OpenClaw 已安装 ✅");
  } else {
    p.log.success("OpenClaw 已存在 ✅");
  }

  // ── 第 3 步：安装微信 ClawBot 插件 ──
  s.start("正在安装微信 ClawBot 插件...");
  run("npx -y @anthropic-ai/claude-code@latest install", "安装 ClawBot");
  s.stop("微信插件已安装 ✅");

  // ── 第 4 步：写入配置 ──
  s.start("正在写入配置...");

  const openclawDir = resolve(homedir(), ".openclaw");
  await mkdir(openclawDir, { recursive: true });

  // 写 .env（API Key）
  await writeFile(
    resolve(openclawDir, ".env"),
    `ANTHROPIC_API_KEY=${apiKey.trim()}\n`
  );

  // 写 openclaw.json（JSON5 格式）
  const config = {
    models: {
      providers: {
        mode: "merge",
        list: [
          {
            name: "anthropic",
            baseUrl: "https://api.anthropic.com",
            api: "anthropic-messages",
            apiKey: "${ANTHROPIC_API_KEY}",
            models: [
              { id: "claude-sonnet-4-20250514" },
              { id: "claude-opus-4-20250514" },
            ],
          },
        ],
      },
    },
    agents: {
      defaults: {
        models: ["claude-sonnet-4-20250514"],
      },
    },
  };

  await writeFile(
    resolve(openclawDir, "openclaw.json"),
    JSON.stringify(config, null, 2) + "\n"
  );

  s.stop("配置已写入 ✅");

  // ── 第 5 步：提示启动 ──
  p.note(
    [
      pc.cyan("启动:"),
      "",
      `  ${pc.green("$")} openclaw gateway run`,
      "",
      "然后用微信扫码，就可以在微信里和 Claude 对话了 🎉",
    ].join("\n"),
    "最后一步"
  );

  p.outro(pc.green("配置完成！"));
}
