// Enhanced Web3 Skill Detection for ClawHub
// Based on ClawHub data structure analysis

// Comprehensive Web3 Keywords for filtering
const WEB3_KEYWORDS = {
  // Core Web3
  core: [
    'web3', 'blockchain', 'crypto', 'cryptocurrency', 'defi', 'dex', 
    'decentralized', 'dapp', 'dao', 'web3.'
  ],
  
  // Chains
  chains: [
    'ethereum', 'solana', 'polygon', 'arbitrum', 'base', 'optimism', 
    'avalanche', 'bsc', 'binance', 'celo', 'fantom', 'near', 'cosmos',
    'polkadot', 'aptos', 'sui', 'zksync', 'scroll', 'linea', 'mantle'
  ],
  
  // Tokens
  tokens: [
    'usdc', 'usdt', 'dai', 'bitcoin', 'btc', 'eth', 'erc20', 'erc721',
    'nft', 'token', 'stablecoin', 'wrapped'
  ],
  
  // Wallet
  wallet: [
    'wallet', 'metamask', 'walletconnect', 'phantom', 'coinbase wallet',
    'rainbow', 'ledger', 'trezor', 'keystore', 'private key', 'mnemonic'
  ],
  
  // DeFi
  defi: [
    'swap', 'liquidity', 'yield', 'staking', 'lending', 'borrowing',
    'amm', 'orderbook', 'perpetual', 'futures', 'options', 'bridge',
    'cross-chain', 'dex ', 'trading', 'market maker', 'tvl', 'apy'
  ],
  
  // Infrastructure
  infra: [
    'smart contract', 'solidity', 'vyper', 'evm', 'gas', 'rpc', 
    'infura', 'alchemy', 'quicknode', 'the graph', 'subgraph',
    'ipfs', 'arweave', 'filecoin', 'zkp', 'zero-knowledge'
  ],
  
  // Payments
  payments: [
    'micropayment', 'x402', '402', 'payment', 'crypto payment',
    'on-chain', 'transaction'
  ],
  
  // Data & APIs
  data: [
    'coinmarketcap', 'coingecko', 'dexscreener', 'dune', 'defillama',
    'etherscan', 'solscan', 'on-chain data', 'market data'
  ],
  
  // Protocols
  protocols: [
    'uniswap', 'aave', 'compound', 'maker', 'curve', 'lido', 
    'rocket pool', 'ens', 'chainlink', 'pyth', 'orderly'
  ]
};

// Get all keywords as flat array
const ALL_WEB3_KEYWORDS = Object.values(WEB3_KEYWORDS).flat();

// Weight for each category (higher = more likely Web3)
const CATEGORY_WEIGHTS = {
  core: 3,
  chains: 2,
  tokens: 2,
  wallet: 2,
  defi: 2,
  infra: 2,
  payments: 2,
  data: 1.5,
  protocols: 2.5
};

// Check if skill is Web3 related and return score
function analyzeWeb3Score(skill) {
  const text = [
    skill.displayName || '',
    skill.summary || '',
    Object.keys(skill.tags || {}).join(' '),
    skill.slug || ''
  ].join(' ').toLowerCase();
  
  let score = 0;
  const matchedKeywords = [];
  const matchedCategories = new Set();
  
  for (const [category, keywords] of Object.entries(WEB3_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += CATEGORY_WEIGHTS[category] || 1;
        matchedKeywords.push(keyword);
        matchedCategories.add(category);
      }
    }
  }
  
  // Bonus for multiple category matches
  if (matchedCategories.size > 1) {
    score += matchedCategories.size * 0.5;
  }
  
  // Check changelog if available
  if (skill.latestVersion?.changelog) {
    const changelogText = skill.latestVersion.changelog.toLowerCase();
    for (const keyword of ALL_WEB3_KEYWORDS) {
      if (changelogText.includes(keyword.toLowerCase())) {
        score += 0.5;
        matchedKeywords.push(`changelog:${keyword}`);
      }
    }
  }
  
  return {
    isWeb3: score >= 1,
    score,
    matchedKeywords: [...new Set(matchedKeywords)],
    matchedCategories: [...matchedCategories]
  };
}

// Categorize skill into Web3 subcategory
function categorizeWeb3Skill(skill) {
  const text = [
    skill.displayName || '',
    skill.summary || '',
    Object.keys(skill.tags || {}).join(' ')
  ].join(' ').toLowerCase();
  
  // Priority-based categorization
  if (/(dex|swap|liquidity|trading|perpetual|orderly|amm)/.test(text)) {
    return 'defi';
  }
  if (/(wallet|metamask|walletconnect|sign|private key)/.test(text)) {
    return 'wallet';
  }
  if (/(payment|usdc|usdt|x402|micropayment|transaction)/.test(text)) {
    return 'payments';
  }
  if (/(nft|erc721|erc1155|collectible)/.test(text)) {
    return 'nft';
  }
  if (/(sdk|api|library|developer|evm|solidity)/.test(text)) {
    return 'sdk';
  }
  if (/(bridge|cross-chain|interop)/.test(text)) {
    return 'bridge';
  }
  if (/(chain|ethereum|solana|polygon|arbitrum|base|optimism)/.test(text)) {
    return 'chains';
  }
  
  return 'tools';
}

// Check if skill is Web3 related (simple boolean)
function isWeb3Skill(skill) {
  return analyzeWeb3Score(skill).isWeb3;
}

// Process and filter skills
function processSkills(skills) {
  const web3Skills = [];
  
  for (const skill of skills) {
    const analysis = analyzeWeb3Score(skill);
    
    if (analysis.isWeb3) {
      web3Skills.push({
        ...skill,
        category: categorizeWeb3Skill(skill),
        web3Score: analysis.score,
        web3Keywords: analysis.matchedKeywords,
        web3Categories: analysis.matchedCategories
      });
    }
  }
  
  // Sort by score
  web3Skills.sort((a, b) => b.web3Score - a.web3Score);
  
  return web3Skills;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WEB3_KEYWORDS,
    ALL_WEB3_KEYWORDS,
    analyzeWeb3Score,
    categorizeWeb3Skill,
    isWeb3Skill,
    processSkills
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.Web3Analyzer = {
    analyzeWeb3Score,
    categorizeWeb3Skill,
    isWeb3Skill,
    processSkills
  };
}

