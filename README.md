# ⚡ Web3 AI Skill Hub

**Web3 AI Agent Skill 聚合平台 —— AI 智能筛选，一站发现**

收录 **1615** 个开源 AI Agent Skill，覆盖 **16 个技术赛道**、**19 个用户场景**，数据源自 [ClawHub](https://clawhub.ai) & [OpenClaw](https://github.com/openclaw/skills)，由 Claude AI 逐个分析并结构化。

🌐 **Live Demo**: [https://julian4313.github.io/Web3_AI_Skill_Hub](https://julian4313.github.io/Web3_AI_Skill_Hub)

---

## 特性

- 🔍 **全文搜索** — 按 Skill 名称、描述、DApp、作者实时检索
- 🏷️ **双维度筛选** — 技术赛道（DEX交易、借贷协议、NFT工具等）+ 用户场景（一键swap、空投猎手、套利机器人等）
- 🌐 **中英文切换** — 数据与 UI 完整国际化
- 📱 **响应式布局** — 桌面 / 平板 / 手机自适应
- ⚡ **纯静态** — 无后端、无构建步骤，GitHub Pages 直接部署
- 🔄 **每 6 小时同步** — 数据自动更新

---

## 技术赛道分布

| 赛道 | 数量 | 赛道 | 数量 |
|------|------|------|------|
| 综合工具 | 379 | 数据分析 | 321 |
| 支付转账 | 155 | 钱包管理 | 151 |
| DEX交易 | 131 | 预测市场 | 131 |
| 安全审计 | 67 | NFT工具 | 56 |
| 代币发行 | 56 | 衍生品交易 | 52 |
| 收益策略 | 48 | 借贷协议 | 25 |
| 跨链桥接 | 14 | 跟单交易 | 10 |
| 治理投票 | 10 | 质押挖矿 | 9 |

---

## 项目结构

```
Web3_AI_Skill_Hub/
├── index.html          # 入口页面
├── styles.css          # 样式
├── app.js              # 核心逻辑（搜索、筛选、i18n、渲染）
├── data/
│   ├── zh/             # 中文数据
│   │   ├── index.json  # 分类索引清单
│   │   ├── dex-trading.json
│   │   ├── lending.json
│   │   ├── prediction-market.json
│   │   └── ...         # 共 16 个分类文件
│   └── en/             # 英文数据（结构同上）
│       ├── index.json
│       └── ...
└── README.md
```

---

## 本地运行

```bash
git clone https://github.com/Julian4313/Web3_AI_Skill_Hub.git
cd Web3_AI_Skill_Hub

# 任选一种方式启动本地服务器
python3 -m http.server 8080
# 或
npx serve .
```

打开 `http://localhost:8080` 即可。

> ⚠️ 由于使用 `fetch()` 加载 JSON，直接双击 `index.html` 打开会因 CORS 限制而无法加载数据，需通过 HTTP 服务器访问。

---

## 添加新 Skill

1. 在 `data/zh/` 对应分类文件（如 `dex-trading.json`）的 `skills` 数组末尾添加新条目
2. 在 `data/en/` 中添加对应英文版本
3. 更新两个 `index.json` 中的 `count`
4. 提交并推送

单条 Skill 数据格式：

```json
{
  "name": "skill-name",
  "author": "github-username",
  "description": "Skill 描述",
  "category_tech": "DEX交易",
  "category_user": "一键swap",
  "example": "对 AI 说：\"帮我在 Uniswap 上 swap 1 ETH 到 USDC\"",
  "user_provides": "钱包私钥 / API Key",
  "dapps": "Uniswap, 1inch",
  "run_mode": "One-shot Execution",
  "github_url": "https://github.com/author/repo"
}
```

---

## 技术栈

- 原生 HTML / CSS / JavaScript（零依赖）
- 数据格式：JSON（按分类拆分，index.json 索引 → 并行加载）
- 部署：GitHub Pages

---

## 致谢

- [ClawHub](https://clawhub.ai) — 数据来源
- [OpenClaw Skills](https://github.com/openclaw/skills) — 开源 Skill 仓库
- [Claude AI](https://claude.ai) — 智能分析与结构化

---

## License

MIT
