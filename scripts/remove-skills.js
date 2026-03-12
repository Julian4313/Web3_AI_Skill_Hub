// Remove specified non-Web3 skills from all en/ and zh/ data files
const fs = require('fs');
const path = require('path');

const REMOVE = new Set([
  // 用户追加删除
  'arc-security',
  // A类：明显非 Web3
  'competitive-intelligence-market-research',
  'yoder-skill-auditor',
  'just-fucking-cancel',
  'retake-tv-agent',
  'moltbook-search',
  'aegis-security',
  'looper-golf',
  'bitskins',
  'trading212-v2',
  'options-strategies',
  'send-signal',
  'openclaw-questrade',
  'hey-lol',
  'linear-browser-automation',
  'lba',
  'det',
  'afrexai-email-marketing-engine',
  'afrexai-n8n-mastery',
  'shellbot-video-generator',
  'skill-5',
  'plvr-event-discovery',
  'fast-io',
  'tech-news-digest',
  'multi-channel-engagement-agent',
  // B类选删
  'danube',
  'tools-marketplace',
  'danube-tools',
  'fractal-memory',
  'q-memory',
  'qst-memory',
  'tiered-memory',
]);

const dataDir = path.join(__dirname, '../data');

function processDir(lang) {
  const dir = path.join(dataDir, lang);
  const indexPath = path.join(dir, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  let totalRemoved = 0;

  for (const entry of index.files) {
    const filePath = path.join(dataDir, entry.file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const before = content.skills.length;
    content.skills = content.skills.filter(s => !REMOVE.has(s.name));
    const after = content.skills.length;
    const removed = before - after;

    if (removed > 0) {
      content.count = after;
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      console.log(`  ${entry.file}: removed ${removed}, now ${after}`);
      totalRemoved += removed;
    }

    // Update index count
    entry.count = after;
  }

  // Update index total
  index.total = index.files.reduce((s, f) => s + f.count, 0);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`  ${lang}/index.json: total now ${index.total} (removed ${totalRemoved})`);
  return totalRemoved;
}

console.log('\n── en/ ──');
const enRemoved = processDir('en');
console.log('\n── zh/ ──');
const zhRemoved = processDir('zh');
console.log(`\n✅ Done. Removed ${enRemoved} from en, ${zhRemoved} from zh.`);
console.log(`   Skills removed: ${[...REMOVE].join(', ')}`);
