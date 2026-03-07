// AI-powered skill enrichment engine
// Core principle: ALWAYS fetch SKILL.md source code from GitHub first,
// then analyze with Claude API or keyword fallback.
// Never classify based on API summary/tags alone.

const fs = require('fs');
const path = require('path');
const {
  TECH_CATEGORIES, USER_CATEGORIES, RUN_MODES,
  EN_TO_TECH, TECH_TO_USER, classifyByKeywords
} = require('./category-map.js');

const ENRICHED_FILE = path.join(__dirname, '../data/skills-enriched.json');
const BATCH_SIZE = 5;        // Concurrent fetches per batch
const API_DELAY_MS = 1000;   // Delay between batches
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 10000;

// ─── Claude API ──────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `你是 Web3 DeFi AI Agent Skill 分析专家。你的输入是一个 skill 的完整 SKILL.md 源码。
请仔细阅读源码中的 description、tools、actions、prompts、configuration 等所有内容，
准确判断这个 skill 的核心功能、运行方式和使用场景。

输出要求（只输出 JSON，不要解释）：
{
  "what_it_does": "中文功能描述，1-2句话，基于源码准确描述其核心能力",
  "example": "中文使用示例，格式为"对我说'xxx'或'xxx'"，要贴合源码里的实际 action",
  "user_provides": "用户需要提供的输入（中文，逗号分隔），从源码的 config/secrets/env 中提取",
  "dapps": "交互的 DApp/平台（英文名，逗号分隔），从源码的 API 调用、合约交互中提取",
  "run_mode": "从以下三选一，基于源码中的执行模式判断：
    - '一次性执行'：有明确 action 触发，执行完即结束（如查询、swap、转账、部署）
    - '持续AI决策'：有循环/监听/cron/自动触发逻辑，AI 持续自主运行（如量化bot、监控告警）
    - '混合'：部分操作自动执行 + 部分需要用户确认审批",
  "category_tech": "从以下14个技术赛道中选最匹配的一个：${TECH_CATEGORIES.join('、')}",
  "category_user": "从以下18个用户场景中选最匹配的一个：${USER_CATEGORIES.join('、')}"
}

判断依据优先级：
1. 源码中的 tools/actions 定义（最重要——它实际做什么）
2. 源码中的 description/system prompt
3. 源码中引用的外部 API / 合约地址 / SDK
4. 配置项和环境变量名`;

async function callClaude(skillMd, skillName) {
  if (!ANTHROPIC_API_KEY) return null;

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `分析以下 skill 的完整源码（skill: ${skillName}）:\n\n\`\`\`markdown\n${skillMd.slice(0, 6000)}\n\`\`\``
    }]
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(CLAUDE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });

      if (resp.status === 429) {
        const wait = Math.pow(2, attempt) * 5000;
        console.log(`    Rate limited, waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = await resp.json();
      const text = data.content?.[0]?.text || '';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`    No JSON in Claude response for ${skillName}`);
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate categories — force to valid values
      if (!TECH_CATEGORIES.includes(parsed.category_tech)) parsed.category_tech = '其他';
      if (!USER_CATEGORIES.includes(parsed.category_user)) parsed.category_user = '其他';
      if (!RUN_MODES.includes(parsed.run_mode)) parsed.run_mode = '一次性执行';

      return parsed;

    } catch (err) {
      console.warn(`    Claude attempt ${attempt + 1} failed for ${skillName}: ${err.message}`);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 2000));
      }
    }
  }
  return null;
}

// ─── Fetch source code from GitHub ───────────────────────────────────
// This is the CRITICAL step — we must read actual source code, not rely
// on API summaries. We try multiple file paths in priority order.

async function fetchSourceCode(slug) {
  // Priority order: SKILL.md is the primary source,
  // then README, then try to list repo files
  const candidates = [
    `https://raw.githubusercontent.com/${slug}/main/SKILL.md`,
    `https://raw.githubusercontent.com/${slug}/master/SKILL.md`,
    `https://raw.githubusercontent.com/${slug}/main/skill.md`,
    `https://raw.githubusercontent.com/${slug}/main/README.md`,
    `https://raw.githubusercontent.com/${slug}/master/README.md`,
  ];

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const text = await resp.text();
        if (text.length > 50) { // Sanity check — skip empty/trivial files
          return { content: text, source: url };
        }
      }
    } catch (e) {
      // timeout or network error, try next
    }
  }

  // Last resort: try to fetch package.json or index.js to at least get deps/description
  for (const file of ['package.json', 'index.js', 'src/index.ts', 'main.py']) {
    try {
      const url = `https://raw.githubusercontent.com/${slug}/main/${file}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const text = await resp.text();
        if (text.length > 20) return { content: text, source: url };
      }
    } catch (e) { /* ignore */ }
  }

  return null;
}

// ─── Fallback enrichment (keyword-based on source code) ──────────────
// Even without Claude API, we analyze the ACTUAL source code content,
// not just API metadata.

function fallbackEnrichFromSource(sourceContent, skill) {
  // Combine source code + API metadata for keyword analysis
  // But SOURCE CODE takes priority (it's the full text to scan)
  const sourceText = sourceContent || '';
  const apiText = [
    skill.displayName || '',
    skill.summary || '',
    (skill.tags || []).join(' ')
  ].join(' ');

  // Classify primarily from source code
  const classified = classifyByKeywords(sourceText + ' ' + apiText);

  // If source code classification is weak, try API category as signal
  if (classified.category_tech === '其他' && skill.category && EN_TO_TECH[skill.category]) {
    classified.category_tech = EN_TO_TECH[skill.category];
    classified.category_user = TECH_TO_USER[classified.category_tech] || '其他';
  }

  // Extract DApps from source code (much more accurate than API tags)
  const dapps = extractDapps(sourceText);

  // Try to extract user_provides from source code (look for env vars, secrets, config)
  const userProvides = extractUserProvides(sourceText);

  // Try to extract a basic description from source
  const desc = extractDescription(sourceText) || skill.summary || skill.displayName || '';

  return {
    what_it_does: desc,
    example: '',
    user_provides: userProvides,
    dapps: dapps,
    run_mode: classified.run_mode,
    category_tech: classified.category_tech,
    category_user: classified.category_user,
    _enriched_by: 'fallback-source'
  };
}

// Pure API fallback (only when GitHub fetch also fails)
function fallbackEnrichFromApi(skill) {
  const text = [
    skill.displayName || '',
    skill.summary || '',
    (skill.tags || []).join(' '),
    skill.slug || ''
  ].join(' ');

  const classified = classifyByKeywords(text);
  if (classified.category_tech === '其他' && skill.category && EN_TO_TECH[skill.category]) {
    classified.category_tech = EN_TO_TECH[skill.category];
    classified.category_user = TECH_TO_USER[classified.category_tech] || '其他';
  }

  return {
    what_it_does: skill.summary || skill.displayName || '',
    example: '',
    user_provides: '',
    dapps: extractDapps(text),
    run_mode: classified.run_mode,
    category_tech: classified.category_tech,
    category_user: classified.category_user,
    _enriched_by: 'fallback-api'
  };
}

// ─── Source code content extractors ──────────────────────────────────

// Extract description from SKILL.md frontmatter or first paragraph
function extractDescription(text) {
  if (!text) return '';
  // Try YAML frontmatter description
  const yamlMatch = text.match(/description:\s*["|']?(.+?)["|']?\s*[\n\r]/i);
  if (yamlMatch) return yamlMatch[1].trim();
  // Try first meaningful paragraph after title
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('---'));
  for (const line of lines) {
    if (line.length > 30 && !line.startsWith('```') && !line.startsWith('|') && !line.startsWith('-')) {
      return line.slice(0, 200);
    }
  }
  return '';
}

// Extract environment variables / secrets / config requirements from source
function extractUserProvides(text) {
  if (!text) return '';
  const patterns = [
    /(?:env|secret|config|key|token|api[_-]?key|private[_-]?key|password|rpc[_-]?url|wallet[_-]?address)[\s:=]+["']?(\w+)/gi,
    /process\.env\.(\w+)/g,
    /\$\{(\w+)\}/g,
    /secrets\.(\w+)/gi
  ];

  const vars = new Set();
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const v = match[1];
      // Filter out common code variables, keep meaningful config names
      if (v.length > 2 && !['true', 'false', 'null', 'undefined', 'string', 'number'].includes(v.toLowerCase())) {
        vars.add(v);
      }
    }
  }

  return [...vars].slice(0, 10).join(', ');
}

// Known DApp names to extract
const KNOWN_DAPPS = [
  'Uniswap', 'SushiSwap', 'PancakeSwap', 'Aave', 'Compound', 'MakerDAO',
  'Curve', 'Balancer', 'dYdX', 'GMX', 'Synthetix', 'Yearn', 'Lido',
  'OpenSea', 'Blur', 'Raydium', 'Jupiter', 'Orca', 'Marinade',
  'Polymarket', 'Hyperliquid', 'KyberSwap', 'CoW Protocol', '1inch',
  'Morpho', 'Spark', 'EigenLayer', 'Pendle', 'Ethena', 'Orderly',
  'LayerZero', 'Wormhole', 'Across', 'Stargate', 'Chainlink',
  'The Graph', 'Alchemy', 'Infura', 'QuickNode', 'Tenderly',
  'Safe', 'Gnosis Safe', 'Snapshot', 'Aragon', 'ENS',
  'Farcaster', 'Lens', 'XMTP', 'Zora', 'Mirror',
  'DeFiLlama', 'Dune', 'CoinGecko', 'CoinMarketCap',
  'Etherscan', 'Basescan', 'Arbiscan', 'Optimistic Etherscan',
  'Aerodrome', 'Velodrome', 'TraderJoe', 'SpookySwap',
  'Benqi', 'Venus', 'Radiant', 'Kamino', 'Drift',
  'Tensor', 'Magic Eden', 'Pump.fun', 'Bonk',
  'Pyth', 'Switchboard', 'Helius', 'Jito'
];

function extractDapps(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  return KNOWN_DAPPS
    .filter(d => {
      const dLower = d.toLowerCase();
      // For short names (≤4 chars like ENS, Safe, Blur), require word boundary
      if (dLower.length <= 4) {
        const regex = new RegExp(`\\b${dLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(text);
      }
      return lower.includes(dLower);
    })
    .join(', ');
}

// ─── Emoji icon assignment (based on source code) ────────────────────

const ICON_KEYWORDS = {
  '🔄': ['swap', 'exchange', 'convert', 'router', 'amm'],
  '📊': ['data', 'analytics', 'chart', 'dashboard', 'monitor', 'track', 'query', 'subgraph'],
  '🤖': ['bot', 'auto', 'agent', 'autonomous', 'loop', 'cron'],
  '💰': ['yield', 'earn', 'reward', 'staking', 'farm', 'vault', 'compound'],
  '🏦': ['lend', 'borrow', 'loan', 'collateral', 'liquidat', 'cdp', 'aave', 'morpho'],
  '👛': ['wallet', 'account', 'balance', 'portfolio', 'safe', 'gnosis', 'multisig'],
  '🎯': ['snipe', 'launch', 'mint', 'deploy', 'create token', 'bonding', 'pump'],
  '📈': ['trade', 'strategy', 'signal', 'quant', 'alpha', 'order', 'perpetual'],
  '🔮': ['predict', 'forecast', 'oracle', 'polymarket', 'bet', 'odds', 'sentiment'],
  '🌉': ['bridge', 'cross-chain', 'relay', 'wormhole', 'layerzero'],
  '💳': ['payment', 'pay', 'invoice', 'checkout', 'x402'],
  '🖼️': ['nft', 'collectible', 'opensea', 'erc721', 'erc1155', 'metadata'],
  '🛡️': ['security', 'audit', 'guard', 'permission', 'access control'],
  '🔧': ['tool', 'sdk', 'api', 'developer', 'framework', 'compile', 'test', 'debug'],
  '💬': ['social', 'chat', 'message', 'farcaster', 'lens', 'xmtp'],
  '🔍': ['search', 'query', 'find', 'explore', 'scan', 'etherscan'],
  '⚡': ['fast', 'flash', 'mev', 'arbitrage', 'frontrun', 'jit'],
  '🎰': ['game', 'casino', 'random', 'luck', 'gamble'],
  '📡': ['rpc', 'infra', 'node', 'network', 'provider', 'indexer'],
  '🧠': ['research', 'analyze', 'insight', 'report', 'summarize', 'ai']
};

const ICON_BG_MAP = {
  '🔄': 'linear-gradient(135deg,#6c5ce7,#a29bfe)',
  '📊': 'linear-gradient(135deg,#0984e3,#74b9ff)',
  '🤖': 'linear-gradient(135deg,#00b894,#55efc4)',
  '💰': 'linear-gradient(135deg,#fdcb6e,#f39c12)',
  '🏦': 'linear-gradient(135deg,#e17055,#fab1a0)',
  '👛': 'linear-gradient(135deg,#fd79a8,#e84393)',
  '🎯': 'linear-gradient(135deg,#e74c3c,#ff7675)',
  '📈': 'linear-gradient(135deg,#00cec9,#81ecec)',
  '🔮': 'linear-gradient(135deg,#a29bfe,#6c5ce7)',
  '🌉': 'linear-gradient(135deg,#636e72,#b2bec3)',
  '💳': 'linear-gradient(135deg,#00b894,#00cec9)',
  '🖼️': 'linear-gradient(135deg,#636e72,#b2bec3)',
  '🛡️': 'linear-gradient(135deg,#00b894,#00cec9)',
  '🔧': 'linear-gradient(135deg,#636e72,#dfe6e9)',
  '💬': 'linear-gradient(135deg,#0984e3,#74b9ff)',
  '🔍': 'linear-gradient(135deg,#6c5ce7,#a29bfe)',
  '⚡': 'linear-gradient(135deg,#fdcb6e,#e17055)',
  '🎰': 'linear-gradient(135deg,#e74c3c,#fd79a8)',
  '📡': 'linear-gradient(135deg,#636e72,#b2bec3)',
  '🧠': 'linear-gradient(135deg,#a29bfe,#74b9ff)'
};

function assignIcon(text) {
  const lower = (text || '').toLowerCase();
  let bestIcon = '🔗', bestScore = 0;
  for (const [icon, keywords] of Object.entries(ICON_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestIcon = icon; }
  }
  return bestIcon;
}

function assignIconBg(icon) {
  return ICON_BG_MAP[icon] || 'linear-gradient(135deg,#636e72,#b2bec3)';
}

// ─── User category CSS class ─────────────────────────────────────────

function getUserCls(userCat) {
  const map = {
    '一键swap': 'defi', '自动交易': 'trade', '量化策略': 'trade',
    '市场预测': 'predict', '数据看板': 'data', '代币狙击': 'trade',
    '聪明钱跟单': 'trade', '钱包工具': 'tool', '开发SDK': 'dev',
    '套利机器人': 'trade', '收益优化': 'defi', 'AI研究员': 'data',
    '价格监控': 'data', '借贷管理': 'defi', 'NFT交易': 'nft',
    '跨链转账': 'bridge', '链上支付': 'defi', '其他': 'other'
  };
  return map[userCat] || 'other';
}

// ─── Main enrichment pipeline ────────────────────────────────────────
// Flow for EVERY new skill:
//   1. Fetch SKILL.md source code from GitHub (ALWAYS)
//   2. If Claude API available → send source code to Claude for analysis
//   3. If no API or Claude fails → keyword-analyze the source code
//   4. If GitHub fetch also fails → last resort: use API metadata

async function enrich(web3Skills) {
  console.log(`\n🔬 Starting enrichment for ${web3Skills.length} Web3 skills...`);
  console.log(`   Strategy: GitHub source code → Claude AI → keyword fallback`);

  // Load existing enriched data (skip re-processing)
  let existing = {};
  if (fs.existsSync(ENRICHED_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf-8'));
      if (data.skills) {
        for (const s of data.skills) {
          existing[s.slug || s.name] = s;
        }
      }
      console.log(`   Loaded ${Object.keys(existing).length} previously enriched skills`);
    } catch (e) {
      console.warn('   Could not load existing enriched data:', e.message);
    }
  }

  // Split into existing vs new
  const newSkills = web3Skills.filter(s => !existing[s.slug]);
  const unchangedSkills = web3Skills.filter(s => existing[s.slug]);
  console.log(`   ${unchangedSkills.length} already enriched, ${newSkills.length} new to process`);

  const hasApi = !!ANTHROPIC_API_KEY;
  if (!hasApi) {
    console.log('   ⚠️ No ANTHROPIC_API_KEY — will use source-code keyword analysis');
  }

  // Stats
  let stats = { githubOk: 0, githubFail: 0, claudeOk: 0, claudeFail: 0, fallbackSource: 0, fallbackApi: 0 };

  // Process new skills in batches
  const enrichedNew = [];
  for (let i = 0; i < newSkills.length; i += BATCH_SIZE) {
    const batch = newSkills.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newSkills.length / BATCH_SIZE);
    console.log(`\n   Batch ${batchNum}/${totalBatches} (${batch.length} skills):`);

    const results = await Promise.all(batch.map(async (skill) => {
      const slug = skill.slug;
      const name = skill.displayName || slug;

      // ═══ STEP 1: Always fetch source code from GitHub ═══
      const source = await fetchSourceCode(slug);
      const sourceContent = source ? source.content : null;

      if (source) {
        stats.githubOk++;
        console.log(`     ✓ ${name} — source fetched (${(sourceContent.length / 1024).toFixed(1)}KB)`);
      } else {
        stats.githubFail++;
        console.log(`     ✗ ${name} — no source found on GitHub`);
      }

      // ═══ STEP 2: Analyze with Claude (if API available + source exists) ═══
      let aiResult = null;
      if (hasApi && sourceContent) {
        aiResult = await callClaude(sourceContent, name);
        if (aiResult) {
          stats.claudeOk++;
        } else {
          stats.claudeFail++;
        }
      }

      // ═══ STEP 3: Determine enrichment result ═══
      let enrichment;
      if (aiResult) {
        enrichment = aiResult;
        enrichment._enriched_by = 'claude';
      } else if (sourceContent) {
        // Fallback: keyword analysis on actual source code
        enrichment = fallbackEnrichFromSource(sourceContent, skill);
        stats.fallbackSource++;
      } else {
        // Last resort: only API metadata available
        enrichment = fallbackEnrichFromApi(skill);
        stats.fallbackApi++;
      }

      // ═══ STEP 4: Build final skill object ═══
      // Icon is based on source code content (or API text if no source)
      const iconText = sourceContent || [name, skill.summary, (skill.tags || []).join(' ')].join(' ');
      const icon = assignIcon(iconText);

      return {
        slug: slug,
        name: name,
        author: slug.split('/')[0] || 'unknown',
        desc: enrichment.what_it_does || skill.summary || '',
        category: enrichment.category_tech || '其他',
        userCat: enrichment.category_user || '其他',
        userCls: getUserCls(enrichment.category_user || '其他'),
        example: enrichment.example || '',
        userProvides: enrichment.user_provides || '',
        dapps: enrichment.dapps || '',
        runMode: enrichment.run_mode || '一次性执行',
        github: `https://github.com/${slug}`,
        icon: icon,
        iconBg: assignIconBg(icon),
        web3Score: skill.web3Score || 0,
        web3Keywords: skill.web3Keywords || [],
        tags: skill.tags || [],
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
        _enriched_by: enrichment._enriched_by || 'unknown',
        _enriched_at: new Date().toISOString(),
        _source_url: source ? source.source : null
      };
    }));

    enrichedNew.push(...results);

    // Rate limiting between batches
    if (i + BATCH_SIZE < newSkills.length) {
      await new Promise(r => setTimeout(r, API_DELAY_MS));
    }
  }

  // Merge: previously enriched + newly enriched
  const allEnriched = [
    ...unchangedSkills.map(s => existing[s.slug]),
    ...enrichedNew
  ];

  // Sort by web3Score descending, then assign sequential IDs
  allEnriched.sort((a, b) => (b.web3Score || 0) - (a.web3Score || 0));
  allEnriched.forEach((s, i) => { s.id = i + 1; });

  // Build output
  const output = {
    lastSync: new Date().toISOString(),
    total: allEnriched.length,
    source: 'https://clawhub.ai',
    enrichedByAI: allEnriched.filter(s => s._enriched_by === 'claude').length,
    enrichedByFallback: allEnriched.filter(s => s._enriched_by !== 'claude').length,
    categories_tech: {},
    categories_user: {},
    skills: allEnriched
  };

  for (const s of allEnriched) {
    output.categories_tech[s.category] = (output.categories_tech[s.category] || 0) + 1;
    output.categories_user[s.userCat] = (output.categories_user[s.userCat] || 0) + 1;
  }

  // Ensure output directory
  const dir = path.dirname(ENRICHED_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(ENRICHED_FILE, JSON.stringify(output, null, 2));

  // Summary
  console.log(`\n✅ Enrichment complete: ${allEnriched.length} total skills`);
  console.log(`   New skills processed: ${enrichedNew.length}`);
  console.log(`   GitHub source fetched: ${stats.githubOk} ok, ${stats.githubFail} failed`);
  if (hasApi) {
    console.log(`   Claude AI analysis: ${stats.claudeOk} ok, ${stats.claudeFail} failed`);
  }
  console.log(`   Fallback (source keywords): ${stats.fallbackSource}`);
  console.log(`   Fallback (API only): ${stats.fallbackApi}`);

  console.log('\n   Tech categories:');
  Object.entries(output.categories_tech)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`     ${cat}: ${count}`));

  return output;
}

// Allow standalone testing
if (require.main === module) {
  const skillsFile = path.join(__dirname, '../data/skills.json');
  if (fs.existsSync(skillsFile)) {
    const data = JSON.parse(fs.readFileSync(skillsFile, 'utf-8'));
    enrich(data.skills || []).then(() => process.exit(0)).catch(e => {
      console.error('Enrichment failed:', e);
      process.exit(1);
    });
  } else {
    console.error('No skills.json found. Run sync.js first.');
    process.exit(1);
  }
}

module.exports = { enrich, fetchSourceCode, fallbackEnrichFromSource, assignIcon, assignIconBg, getUserCls };
