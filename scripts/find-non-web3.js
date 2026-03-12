// Find skills that have no Web3 keywords in their description
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data/en');
const indexFiles = JSON.parse(fs.readFileSync(path.join(dataDir, 'index.json'), 'utf8')).files;

let all = [];
for (const f of indexFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', f.file), 'utf8'));
  all = all.concat(data.skills.map(s => ({ ...s, _file: f.file })));
}

const WEB3 = [
  'crypto','blockchain','defi','web3','ethereum','solana','bitcoin','btc','eth','sol',
  'token','nft','wallet','on-chain','onchain','smart contract','swap','dex','liquidity',
  'staking','lending','borrow','yield','vault','dao','governance','uniswap','aave',
  'compound','polymarket','hyperliquid','binance','coinbase','erc20','erc-20','evm',
  'usdc','usdt','tron','base chain','layer2','l2','cross-chain','bridge',
  'prediction market','perpetual','futures','trading bot','arbitrage','liquidat',
  'pump.fun','raydium','jupiter','kalshi','x402','zkp','zk-proof','merkle',
  'metamask','ledger','trezor','mnemonic','private key','gas fee','mempool',
  'sei network','kaspa','stellar','cosmos','polkadot','avalanche','sui','aptos',
  'bnb','polygon','arbitrum','optimism','base ','base\n','coinpilot','bybit',
  'okx','dydx','gmx','pendle','lido','curve','balancer','1inch','velodrome',
  'aerodrome','wormhole','layerzero','stargate','chainlink','pyth','helius',
  'jito','orca','mango','drift','kamino'
];

const nonWeb3 = [];
for (const s of all) {
  const text = (s.name + ' ' + s.description + ' ' + (s.dapps || '') + ' ' + (s.user_provides || '')).toLowerCase();
  const hasWeb3 = WEB3.some(kw => text.includes(kw));
  if (!hasWeb3) {
    nonWeb3.push(s);
  }
}

nonWeb3.sort((a, b) => (b.clawhub_downloads || 0) - (a.clawhub_downloads || 0));
console.log('Total non-Web3 candidates:', nonWeb3.length, '/', all.length);
console.log('');
nonWeb3.forEach((s, i) => {
  console.log(`${i + 1}. [${s.clawhub_downloads || 0}dl] [${s._file.replace('en/', '')}] ${s.name}`);
  console.log(`   ${s.description.slice(0, 130)}`);
  console.log('');
});
