// Category constants and mapping tables for Web3 Skill enrichment
// Used by enrich.js for AI analysis and fallback classification

// 14 技术赛道
const TECH_CATEGORIES = [
  'DEX交易', '预测市场', '数据分析', '交易策略', '代币发射',
  '钱包管理', 'DeFi借贷', '开发工具', 'NFT', '跨链桥接',
  '支付', '收益策略', '社交', '其他'
];

// 18 用户场景
const USER_CATEGORIES = [
  '一键swap', '自动交易', '量化策略', '市场预测', '数据看板',
  '代币狙击', '聪明钱跟单', '钱包工具', '开发SDK', '套利机器人',
  '收益优化', 'AI研究员', '价格监控', '借贷管理', 'NFT交易',
  '跨链转账', '链上支付', '其他'
];

// 3 运行模式
const RUN_MODES = ['一次性执行', '持续AI决策', '混合'];

// English web3-analyzer category → Chinese tech category (fallback mapping)
const EN_TO_TECH = {
  'defi':     'DEX交易',
  'wallet':   '钱包管理',
  'payments': '支付',
  'nft':      'NFT',
  'sdk':      '开发工具',
  'bridge':   '跨链桥接',
  'chains':   '开发工具',
  'tools':    '数据分析'
};

// Tech category → default user category (fallback mapping)
const TECH_TO_USER = {
  'DEX交易':   '一键swap',
  '预测市场':  '市场预测',
  '数据分析':  '数据看板',
  '交易策略':  '量化策略',
  '代币发射':  '代币狙击',
  '钱包管理':  '钱包工具',
  'DeFi借贷':  '借贷管理',
  '开发工具':  '开发SDK',
  'NFT':       'NFT交易',
  '跨链桥接':  '跨链转账',
  '支付':      '链上支付',
  '收益策略':  '收益优化',
  '社交':      'AI研究员',
  '其他':      '其他'
};

// Keyword-based tech category detection (for fallback without AI)
const TECH_KEYWORDS = {
  'DEX交易':   ['swap', 'dex', 'uniswap', 'sushiswap', 'pancakeswap', 'exchange', 'amm', 'liquidity pool', 'router'],
  '预测市场':  ['predict', 'polymarket', 'forecast', 'bet', 'oracle', 'odds', 'market prediction', 'sentiment'],
  '数据分析':  ['data', 'analytics', 'chart', 'query', 'subgraph', 'dune', 'dashboard', 'monitor', 'track', 'price', 'defillama'],
  '交易策略':  ['trading', 'strategy', 'arbitrage', 'snipe', 'bot', 'mev', 'copy trade', 'smart money', 'alpha'],
  '代币发射':  ['token', 'launch', 'deploy', 'create token', 'erc20', 'mint', 'bonding curve', 'fair launch', 'pump'],
  '钱包管理':  ['wallet', 'account', 'key', 'sign', 'transfer', 'send', 'balance', 'portfolio', 'safe', 'gnosis'],
  'DeFi借贷':  ['lend', 'borrow', 'aave', 'compound', 'morpho', 'collateral', 'liquidat', 'interest', 'cdp'],
  '开发工具':  ['sdk', 'api', 'developer', 'solidity', 'compile', 'deploy contract', 'debug', 'test', 'framework', 'evm'],
  'NFT':       ['nft', 'erc721', 'erc1155', 'opensea', 'collectible', 'metadata', 'mint nft'],
  '跨链桥接':  ['bridge', 'cross-chain', 'interop', 'relay', 'wormhole', 'layerzero', 'multichain'],
  '支付':      ['payment', 'pay', 'invoice', 'x402', 'micropayment', 'checkout'],
  '收益策略':  ['yield', 'farm', 'staking', 'reward', 'vault', 'compound', 'auto-compound', 'apy'],
  '社交':      ['social', 'farcaster', 'lens', 'message', 'chat', 'community', 'dao governance'],
  '其他':      []
};

// User category keywords (for fallback)
const USER_KEYWORDS = {
  '一键swap':    ['swap', 'exchange', 'convert', 'trade token'],
  '自动交易':    ['auto trade', 'automated', 'execution', 'order', 'limit order', 'stop loss'],
  '量化策略':    ['quant', 'strategy', 'backtest', 'signal', 'indicator', 'algo'],
  '市场预测':    ['predict', 'forecast', 'sentiment', 'polymarket', 'odds', 'bet'],
  '数据看板':    ['dashboard', 'analytics', 'chart', 'monitor', 'overview', 'portfolio view'],
  '代币狙击':    ['snipe', 'launch', 'new token', 'pump', 'early', 'bonding'],
  '聪明钱跟单':  ['smart money', 'copy', 'follow', 'whale', 'alpha', 'wallet track'],
  '钱包工具':    ['wallet', 'account', 'balance', 'send', 'receive', 'key management'],
  '开发SDK':     ['sdk', 'api', 'library', 'developer', 'integrate', 'framework'],
  '套利机器人':  ['arbitrage', 'arb', 'mev', 'sandwich', 'flashloan', 'frontrun'],
  '收益优化':    ['yield', 'farm', 'staking', 'vault', 'optimize', 'auto-compound'],
  'AI研究员':    ['research', 'report', 'analysis', 'summarize', 'insight', 'ai agent'],
  '价格监控':    ['price', 'alert', 'monitor', 'track', 'notification', 'watch'],
  '借贷管理':    ['lend', 'borrow', 'loan', 'collateral', 'liquidation', 'health factor'],
  'NFT交易':     ['nft', 'mint', 'buy nft', 'sell nft', 'collection'],
  '跨链转账':    ['bridge', 'cross-chain', 'transfer', 'relay'],
  '链上支付':    ['payment', 'pay', 'invoice', 'checkout'],
  '其他':        []
};

// Run mode detection keywords
const RUN_MODE_KEYWORDS = {
  '持续AI决策': ['autonomous', 'continuous', 'monitor', 'watch', 'loop', 'recurring', 'agent', 'auto-', 'ongoing', 'daemon', 'periodic', 'cron'],
  '混合':       ['interactive', 'approve', 'confirm', 'review', 'human-in-loop', 'semi-auto', 'step-by-step', 'guided'],
  '一次性执行': [] // default
};

// Classify by keyword matching
function classifyByKeywords(text) {
  const lower = (text || '').toLowerCase();

  let bestTech = '其他', bestTechScore = 0;
  for (const [cat, keywords] of Object.entries(TECH_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestTechScore) { bestTechScore = score; bestTech = cat; }
  }

  let bestUser = TECH_TO_USER[bestTech] || '其他', bestUserScore = 0;
  for (const [cat, keywords] of Object.entries(USER_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestUserScore) { bestUserScore = score; bestUser = cat; }
  }

  let runMode = '一次性执行';
  for (const [mode, keywords] of Object.entries(RUN_MODE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) { runMode = mode; break; }
  }

  return { category_tech: bestTech, category_user: bestUser, run_mode: runMode };
}

module.exports = {
  TECH_CATEGORIES,
  USER_CATEGORIES,
  RUN_MODES,
  EN_TO_TECH,
  TECH_TO_USER,
  TECH_KEYWORDS,
  USER_KEYWORDS,
  RUN_MODE_KEYWORDS,
  classifyByKeywords
};

