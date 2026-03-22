import { loadBuiltinTemplates } from "../lib/templates.mjs";

export default async function init({ root, args }) {
  console.log();
  console.log("🌉 wechat-to-anything");
  console.log();
  console.log("   一条命令，把微信变成任何 AI Agent 的入口");
  console.log();

  // Check for --template flag (external template)
  const templateIdx = args.indexOf("--template");
  if (templateIdx !== -1 && args[templateIdx + 1]) {
    console.log(`⚠ External template support coming soon: ${args[templateIdx + 1]}`);
    console.log("  For now, please use built-in templates.");
    console.log();
  }

  // Load built-in templates
  const templates = await loadBuiltinTemplates();
  if (templates.length === 0) {
    console.error("❌ No templates found");
    process.exit(1);
  }

  // Display template list
  console.log("📦 可用模板:\n");
  templates.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.icon || "📦"} ${t.name}`);
    if (t.description) {
      console.log(`     ${t.description}`);
    }
    console.log();
  });

  // TODO: Interactive selection with @clack/prompts
  // For now, show guidance
  console.log("─".repeat(50));
  console.log();
  console.log("🚧 交互式向导正在开发中...");
  console.log();
  console.log("目前请手动安装:");
  console.log();
  console.log("  # 1. 安装 OpenClaw");
  console.log("  npm install -g openclaw");
  console.log();
  console.log("  # 2. 安装微信插件");
  console.log("  npx -y @tencent-weixin/openclaw-weixin-cli@latest install");
  console.log();
  console.log("  # 3. 配置你的 Agent (参考模板的 template.yaml)");
  console.log();
  console.log("  # 4. 启动 Gateway");
  console.log("  openclaw gateway run");
  console.log();
}
