import pc from "picocolors";
import { loadCredentials, loginWithQR, getUpdates, sendMessage, extractText } from "./weixin.mjs";

/**
 * 启动桥：WeChat ilinkai API ←→ Agent HTTP
 * 完全独立，不依赖 OpenClaw
 */
export async function start(agentUrl) {
  // 1. 读取或获取 WeChat 登录凭证
  let creds = loadCredentials();
  if (!creds) {
    console.log(pc.yellow("📱 首次使用，请扫码登录微信\n"));
    try {
      creds = await loginWithQR(async (qrUrl) => {
        try {
          const qrt = await import("qrcode-terminal");
          await new Promise((resolve) => {
            qrt.default.generate(qrUrl, { small: true }, (qr) => {
              console.log(qr);
              resolve();
            });
          });
        } catch {
          console.log(`扫码链接: ${qrUrl}`);
        }
      });
      console.log(pc.green("✅ 微信登录成功！"));
    } catch (err) {
      console.error(pc.red(`❌ 登录失败: ${err.message}`));
      process.exit(1);
    }
  }
  console.log(pc.green(`✅ 微信已登录`));

  // 2. 检查 Agent 是否可达
  console.log(pc.dim(`🔍 检查 Agent: ${agentUrl}`));
  try {
    await fetch(agentUrl, { signal: AbortSignal.timeout(5000) });
    console.log(pc.green("✅ Agent 可达"));
  } catch {
    console.error(pc.red(`❌ 无法连接 Agent: ${agentUrl}`));
    process.exit(1);
  }

  // 3. 启动消息循环
  console.log(pc.green("🚀 桥已启动"));
  console.log(pc.dim("   微信消息 → Agent → 微信回复"));
  console.log();

  let getUpdatesBuf = "";

  const loop = async () => {
    while (true) {
      try {
        const result = await getUpdates(creds.token, getUpdatesBuf);
        getUpdatesBuf = result.get_updates_buf;

        for (const msg of result.msgs) {
          const text = extractText(msg);
          const from = msg.from_user_id || "";
          const contextToken = msg.context_token || "";

          if (!text || !from) continue;

          console.log(pc.cyan(`← [微信] ${from}: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`));

          try {
            const reply = await callAgent(agentUrl, text);
            console.log(pc.green(`→ [Agent] ${reply.slice(0, 80)}${reply.length > 80 ? "..." : ""}`));
            await sendMessage(creds.token, from, reply, contextToken);
          } catch (err) {
            console.error(pc.red(`   Agent 错误: ${err.message}`));
            await sendMessage(creds.token, from, `⚠️ Agent 错误: ${err.message}`, contextToken);
          }
        }
      } catch (err) {
        console.error(pc.yellow(`⚠️ ${err.message}`));
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  };

  process.on("SIGINT", () => {
    console.log(pc.dim("\n桥已停止"));
    process.exit(0);
  });

  await loop();
}

async function callAgent(agentUrl, userMessage) {
  const res = await fetch(`${agentUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "(empty response)";
}
