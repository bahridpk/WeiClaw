# wechat-to-anything

> 一条命令，把微信变成任何 AI Agent 的入口。以 Claude Code 为例。

```
你 (微信) → "帮我写个排序算法"
Claude Code  → 生成代码、解释、调试
```

## 快速开始

```bash
npx wechat-to-anything
```

填入 Anthropic API Key，剩下的全自动：
- ✅ 自动安装 OpenClaw 网关
- ✅ 自动安装微信 ClawBot 插件
- ✅ 自动写入配置（`~/.openclaw/`）

最后运行 `openclaw gateway run`，微信扫码即可。

## 原理

```
微信消息 ←→ OpenClaw Gateway ←→ 任意 AI Agent
```

[OpenClaw](https://openclaw.ai) 是开源 AI 网关，[微信 ClawBot](https://github.com/nicepkg/openclaw-weixin) 是微信接入插件。

`wechat-to-anything` 把配置自动化成一条命令。网关本身是通用的——改一下配置就能连 DeepSeek、Ollama、Dify 或任何 OpenAI 兼容的 API。这里用 Claude Code 做演示。

## License

[MIT](LICENSE)
