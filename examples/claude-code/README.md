# 示例：Claude Code Agent

把 Claude Code 包装成 HTTP 服务，供 `wechat-to-anything` 连接。

## 运行

```bash
cd examples/claude-code
npm install
ANTHROPIC_API_KEY=sk-ant-xxx npm start
```

然后在另一个终端：

```bash
npx wechat-to-anything http://localhost:3000/v1
```

微信扫码 → 在微信里和 Claude Code 对话。
