# Gemini CLI Agent

通过 Google Gemini CLI 将 Gemini 模型接入微信。

## 前置条件

```bash
npm install -g @google/gemini-cli
```

首次使用会引导 Google 账号登录（免费额度）。

## 启动

```bash
# 1. 启动 Agent
node server.mjs

# 2. 连接微信（另一个终端）
npx weiclaw http://localhost:3002/v1
```

## 多 Agent 模式

```bash
npx weiclaw \
  --agent codex=http://localhost:3001/v1 \
  --agent gemini=http://localhost:3002/v1 \
  --default codex
```

微信里发 `@gemini 你好` 路由到 Gemini。
