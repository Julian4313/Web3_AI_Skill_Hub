# Web3 AI Skill Platform

> Web3 DeFi AI Agent Skills 展示平台 — 基于 ClawHub/OpenClaw 生态

🌐 **Live Site**: `https://julian4313.github.io/Web3_AI_Skill_Hub`

## What is this?

一个面向 Web3 行业的 AI Agent Skill 目录平台，从 [ClawHub](https://clawhub.ai) 采集数千个 Skill，通过 AI 智能分析生成中文元数据，以 App Store 风格展示。

## Features

### 🤖 AI 智能分析

- **源码优先** — 每个 Skill 从 GitHub 拉取 SKILL.md 源码，基于实际代码分析而非 API 摘要
- **Claude AI 富化** — 使用 Anthropic Claude API 生成中文功能描述、使用示例、DApp 交互信息
- **14 技术赛道 + 18 用户场景** — 精准分类（DeFi、跨链、量化策略、钱包工具等）
- **API Key 验证** — Sync 前自动验证 Anthropic API Key 有效性，无效则不执行

### 📊 App Store 风格展示

- **分类筛选** — 按技术赛道、用户场景快速过滤
- **搜索功能** — 支持中英文关键词搜索
- **Emoji 图标** — 基于源码内容自动匹配图标
- **运行模式标签** — 一次性执行 / 持续AI决策 / 混合模式
- **DApp 标注** — 自动识别交互的 DApp（Uniswap、Aave、Lido 等 80+）

### ⏰ 自动同步

- GitHub Actions 每 6 小时自动运行
- 从 ClawHub API 拉取最新 Skill
- AI 增量富化（仅处理新增 Skill）
- 自动提交更新到 `data/` 目录

## Tech Categories

| 赛道 | 说明 | 示例 |
|------|------|------|
| DEX交易 | 去中心化交易所 | Uniswap、Jupiter swap |
| 借贷协议 | DeFi 借贷 | Aave、Compound |
| 收益聚合 | 收益优化 | Yearn vault、Lido staking |
| 跨链桥 | 跨链资产转移 | LayerZero、Wormhole |
| 钱包工具 | 钱包管理与安全 | Gnosis Safe、多签 |
| 链上数据 | 数据查询与分析 | Dune、DeFiLlama |
| NFT | NFT 交易与铸造 | OpenSea、Magic Eden |
| 预言机 | 价格与数据预言机 | Chainlink、Pyth |
| 量化交易 | 自动化交易策略 | MEV、套利机器人 |
| 支付 | 链上支付 | x402、USDC 支付 |
| 开发工具 | SDK 与开发框架 | Hardhat、Foundry |
| 社交 | Web3 社交协议 | Farcaster、Lens |
| Layer2 | L2 扩展方案 | Base、Arbitrum、zkSync |
| 其他 | 未分类工具 | — |

## Project Structure

```
Web3_AI_Skill_Hub/
├── index.html              # 页面结构
├── styles.css              # 暗紫色主题 + glassmorphism
├── app.js                  # App Store 风格前端逻辑
├── package.json
├── data/
│   ├── skills.json         # 原始 Web3 skills 数据
│   └── skills-enriched.json # AI 富化后的数据（含中文元数据）
├── scripts/
│   ├── sync.js             # 同步主脚本（含 API Key 验证）
│   ├── enrich.js           # AI 富化引擎（Claude API + 关键词回退）
│   ├── category-map.js     # 分类常量与映射
│   └── web3-analyzer.js    # Web3 关键词分析器（150+ 关键词）
└── .github/
    └── workflows/
        └── sync.yml        # 定时同步 GitHub Actions
```

## How It Works

### Sync Pipeline (`scripts/sync.js`)

1. **验证 API Key** — 向 Anthropic API 发送最小请求验证 Key 有效性
2. **拉取 Skills** — 从 ClawHub API 分页获取所有 Skill
3. **Web3 过滤** — 通过 150+ 关键词评分，筛选 Web3 相关 Skill
4. **AI 富化** — 对每个 Skill：
   - 从 GitHub 拉取 SKILL.md 源码
   - 用 Claude AI 分析源码生成中文元数据
   - 无 API 时回退到关键词分析
5. **增量更新** — 已分析的 Skill 不重复处理

### AI Enrichment (`scripts/enrich.js`)

```
源码优先策略：
  GitHub SKILL.md → Claude AI 分析 → 中文元数据
  GitHub SKILL.md → 关键词回退分析 → 中文元数据
  无源码 → API 元数据回退 → 基础分类
```

输出字段：
- `desc` — 中文功能描述
- `category` / `userCat` — 技术赛道 / 用户场景
- `example` — 使用示例
- `dapps` — 交互的 DApp
- `runMode` — 运行模式（一次性执行/持续AI决策/混合）
- `userProvides` — 用户需提供的输入

## Development

```bash
# 本地运行
npx serve .
# 或直接打开 index.html

# 手动同步（需要 ANTHROPIC_API_KEY）
export ANTHROPIC_API_KEY="sk-ant-..."
node scripts/sync.js
```

## Deployment

1. Fork 本仓库
2. 在 Settings → Secrets → Actions 中添加 `ANTHROPIC_API_KEY`
3. 启用 GitHub Pages：Settings → Pages → Source: `main` branch
4. GitHub Actions 会自动每 6 小时同步

> ⚠️ **注意**：没有有效的 `ANTHROPIC_API_KEY`，sync 不会执行。这是设计决策——确保数据始终包含 AI 富化的中文元数据。

## API Reference

- **Skills 来源**: [ClawHub API](https://clawhub.ai/api/v1/skills)
- **AI 引擎**: [Anthropic Claude API](https://api.anthropic.com)
- **文档**: [github.com/openclaw/clawhub](https://github.com/openclaw/clawhub)

## License

MIT
