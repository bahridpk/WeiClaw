# 创建 Agent 模板

> 让你的 AI Agent 通过一条命令接入微信

## 模板结构

一个模板就是一个包含 `template.yaml` 的 npm 包或 GitHub 仓库。

```
my-agent-template/
├── template.yaml     # 必需：模板描述文件
├── package.json      # 可选：作为 npm 包发布
└── README.md         # 推荐：使用说明
```

## template.yaml 格式

### 模式 1: API 接入

最简单，适用于暴露 OpenAI 兼容 API 的服务。

```yaml
name: 我的 Agent
description: 一句话描述
icon: 🤖
mode: api

params:
  - key: base_url
    label: API 地址
    type: string
  - key: api_key
    label: API Key
    type: secret

providers:
  default:
    baseUrl: "{{base_url}}"
    api: "openai-completions"
```

### 模式 2: 插件接入

```yaml
name: 我的插件 Agent
mode: plugin
plugins:
  - "@my/openclaw-plugin"
params:
  - key: api_key
    label: API Key
    type: secret
```

### 模式 3: 全栈接入

```yaml
name: 我的全栈 Agent
mode: full-stack

plugins:
  - "@my/openclaw-plugin"

backends:
  - name: my-backend
    type: python               # python | node | docker
    repo: https://github.com/me/my-agent
    port: 8800
    setup: "pip install -r requirements.txt"
    start: "uvicorn main:app --port 8800"
    health: http://localhost:8800/health

params:
  - key: api_key
    label: API Key
    type: secret
    env: MY_API_KEY
```

## 参数类型

| type | 说明 | 示例 |
|------|------|------|
| `string` | 文本输入 | API 地址 |
| `secret` | 密码输入（隐藏） | API Key |
| `select` | 下拉选择 | 模型选择 |
| `number` | 数字 | 端口号 |
| `boolean` | 开关 | 是否启用 X |

## 发布方式

### npm

```bash
npm publish
# 用户安装：npx wechat-to-anything init --template @my/agent-template
```

### GitHub

```bash
# 直接推到 GitHub
# 用户安装：npx wechat-to-anything init --template github:me/my-template
```

### 本地

```bash
# 用户安装：npx wechat-to-anything init --template ./my-template
```

## 加入社区索引

在本项目 README 的社区模板表格中提 PR 添加一行即可。
