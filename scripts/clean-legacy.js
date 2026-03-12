const fs = require('fs');
const path = require('path');

const REMOVE = new Set([
  'competitive-intelligence-market-research','yoder-skill-auditor','just-fucking-cancel',
  'retake-tv-agent','moltbook-search','aegis-security','looper-golf','bitskins',
  'trading212-v2','options-strategies','send-signal','openclaw-questrade','hey-lol',
  'linear-browser-automation','lba','det','afrexai-email-marketing-engine',
  'afrexai-n8n-mastery','shellbot-video-generator','skill-5','plvr-event-discovery',
  'fast-io','tech-news-digest','multi-channel-engagement-agent',
  'danube','tools-marketplace','danube-tools',
  'fractal-memory','q-memory','qst-memory','tiered-memory',
]);

const dataDir = path.join(__dirname, '../data');
const files = ['skills-en.json', 'skills-enriched.json', 'skills.json'];

for (const fname of files) {
  const fpath = path.join(dataDir, fname);
  if (!fs.existsSync(fpath)) continue;
  const d = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  if (!d.skills) continue;
  const before = d.skills.length;
  d.skills = d.skills.filter(s => {
    const name = s.name || s.slug || s.displayName || '';
    return !REMOVE.has(name);
  });
  d.total = d.skills.length;
  fs.writeFileSync(fpath, JSON.stringify(d, null, 2));
  console.log(fname + ': ' + before + ' -> ' + d.skills.length + ' (removed ' + (before - d.skills.length) + ')');
}
console.log('Done');
