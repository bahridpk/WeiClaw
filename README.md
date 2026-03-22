# wechat-to-anything

> 一条命令，把微信变成任何 AI Agent 的入口
>
> Connect WeChat to any AI Agent with one command

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18-green.svg" alt="Node">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

## 30 秒上手

```bash
npx wechat-to-anything init
```

选 Agent → 填 Key → 扫码 → 完成。

## 它做了什么？

```
微信 ←→ OpenClaw Gateway ←→ 你选的 AI Agent
```

基于腾讯[微信 ClawBot](https://github.com/nicepkg/openclaw-weixin) 插件 + [OpenClaw](https://openclaw.ai) 开源网关，
`wechat-to-anything` 把复杂的配置过程自动化成**一条交互式命令**。

## 内置支持

开箱即用，直接连接主流大模型：

| 模型 | 命令 |
|------|------|
| Claude (Anthropic) | `npx wechat-to-anything init` |
| GPT-4o (OpenAI) | `npx wechat-to-anything init` |
| MiniMax M2.7 | `npx wechat-to-anything init` |
| DeepSeek | `npx wechat-to-anything init` |
| Gemini (Google) | `npx wechat-to-anything init` |
| Ollama (本地) | `npx wechat-to-anything init` |

所有模型通过同一条命令进入交互式选择，填入 API Key 即可。

## 第三方 Agent 模板

除了直连大模型，还支持通过 `--template` 接入任何第三方 Agent：

```bash
# 从 npm
npx wechat-to-anything init --template @openher/wxta-template

# 从 GitHub
npx wechat-to-anything init --template github:username/my-agent-template

# 从本地目录
npx wechat-to-anything init --template ./my-template
```

### 社区模板

| 模板 | 说明 | 安装 |
|------|------|------|
| 🧬 [OpenHer](https://github.com/kellyvv/openher-openclaw-plugin) | 有情感、有记忆的 AI 伴侣 | `--template @openher/wxta-template` |
| 🔧 Dify | 连接 Dify 工作流 Agent | `--template @wxta/dify` |
| _你的 Agent_ | _[发布模板 →](docs/create-template.md)_ | |

## 管理

```bash
npx wechat-to-anything start    # 启动所有服务
npx wechat-to-anything stop     # 停止
npx wechat-to-anything status   # 查看状态
npx wechat-to-anything switch   # 热切换 Agent（微信用户无感）
```

## 发布你的 Agent 模板

只需一个 `template.yaml`，支持三种模式：

### 模式 1: API 接入（最简单）

适用于 Dify / Coze / FastGPT 等 OpenAI 兼容 API 服务。

```yaml
name: 我的 Agent
mode: api
params:
  - key: api_key
    label: API Key
    type: secret
  - key: base_url
    label: API 地址
    type: string
providers:
  default:
    baseUrl: "{{base_url}}"
    api: "openai-completions"
```

### 模式 2: 插件接入

已有 OpenClaw 插件的项目。

```yaml
name: 我的插件 Agent
mode: plugin
plugins:
  - "@my/openclaw-plugin"
```

### 模式 3: 全栈接入

需要独立后端的 Agent。

```yaml
name: 我的全栈 Agent
mode: full-stack
plugins:
  - "@my/openclaw-plugin"
backends:
  - name: my-backend
    type: python
    repo: https://github.com/me/my-agent
    port: 8800
    start: "uvicorn main:app --port 8800"
    health: http://localhost:8800/health
```

详见 [模板开发指南](docs/create-template.md)。

## 工作原理

```
npx wechat-to-anything init
  │
  ├─ 1. 检测 / 安装 OpenClaw
  ├─ 2. 安装微信 ClawBot 插件
  ├─ 3. 选择模型 或 加载外部模板
  ├─ 4. 交互式收集参数
  ├─ 5. 生成 OpenClaw 配置
  ├─ 6. 启动后端服务 (如需)
  ├─ 7. 启动 Gateway
  └─ 8. 微信扫码连接
```

## License

[MIT](LICENSE)

---

Built with 🌉 by the community. Powered by [OpenClaw](https://openclaw.ai) + [微信 ClawBot](https://github.com/nicepkg/openclaw-weixin).
