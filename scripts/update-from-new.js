// One-time migration: inject clawhub_downloads/stars/is_certified from new.txt
// into en/*.json and zh/*.json files
// Usage: node scripts/update-from-new.js <path-to-new.txt>

const fs = require('fs');
const path = require('path');

const newFile = process.argv[2];
if (!newFile) {
  console.error('Usage: node scripts/update-from-new.js <path-to-new.txt>');
  process.exit(1);
}

const raw = fs.readFileSync(newFile, 'utf-8');
const newData = JSON.parse(raw);

const dataDir = path.join(__dirname, '../data');

// ─── Step 1: Update en/*.json with full data from new.txt ────────────
let totalCount = 0;
const indexFiles = [];
const clawhubMap = {}; // name -> clawhub fields

for (const entry of newData.files) {
  // entry.file is like "en/copy-trading.json"
  const filePath = path.join(dataDir, entry.file);

  // Build en file content (skills with all new fields)
  const skills = entry.skills.map(s => ({
    name: s.name,
    author: s.author,
    description: s.description,
    category_tech: s.category_tech,
    category_user: s.category_user,
    example: s.example,
    user_provides: s.user_provides,
    dapps: s.dapps,
    run_mode: s.run_mode,
    github_url: s.github_url,
    clawhub_downloads: s.clawhub_downloads || 0,
    clawhub_stars: s.clawhub_stars || 0,
    clawhub_is_certified: s.clawhub_is_certified || false,
    clawhub_slug: s.clawhub_slug || s.name,
    clawhub_url: s.clawhub_url || `https://clawhub.ai/skills/${s.clawhub_slug || s.name}`,
    clawhub_display_name: s.clawhub_display_name || s.name,
  }));

  fs.writeFileSync(filePath, JSON.stringify({ count: skills.length, skills }, null, 2));
  console.log(`✓ Updated ${entry.file} (${skills.length} skills)`);
  totalCount += skills.length;

  // Build lookup map
  for (const s of entry.skills) {
    clawhubMap[s.name] = {
      clawhub_downloads: s.clawhub_downloads || 0,
      clawhub_stars: s.clawhub_stars || 0,
      clawhub_is_certified: s.clawhub_is_certified || false,
      clawhub_slug: s.clawhub_slug || s.name,
      clawhub_url: s.clawhub_url || `https://clawhub.ai/skills/${s.clawhub_slug || s.name}`,
      clawhub_display_name: s.clawhub_display_name || s.name,
    };
  }

  indexFiles.push({ file: entry.file, category: entry.category, count: skills.length });
}

// ─── Step 2: Update en/index.json ────────────────────────────────────
const enIndex = {
  total: totalCount,
  generated: newData.generated || new Date().toISOString().slice(0, 10),
  files: indexFiles
};
fs.writeFileSync(path.join(dataDir, 'en/index.json'), JSON.stringify(enIndex, null, 2));
console.log(`✓ Updated en/index.json (total: ${totalCount})`);

// ─── Step 3: Update zh/*.json with clawhub fields injected ───────────
const zhDir = path.join(dataDir, 'zh');
const zhFiles = fs.readdirSync(zhDir).filter(f => f.endsWith('.json') && f !== 'index.json');

let zhTotal = 0;
const zhIndexFiles = [];

for (const fname of zhFiles) {
  const filePath = path.join(zhDir, fname);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let updated = 0;
  const newSkills = content.skills.map(s => {
    const clawhub = clawhubMap[s.name];
    if (clawhub) {
      updated++;
      return { ...s, ...clawhub };
    }
    // Preserve existing or set defaults
    return {
      ...s,
      clawhub_downloads: s.clawhub_downloads || 0,
      clawhub_stars: s.clawhub_stars || 0,
      clawhub_is_certified: s.clawhub_is_certified || false,
      clawhub_slug: s.clawhub_slug || s.name,
      clawhub_url: s.clawhub_url || `https://clawhub.ai/skills/${s.name}`,
      clawhub_display_name: s.clawhub_display_name || s.name,
    };
  });

  const out = { count: newSkills.length, skills: newSkills };
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2));
  console.log(`✓ Updated zh/${fname} (${newSkills.length} skills, ${updated} with clawhub data)`);
  zhTotal += newSkills.length;

  // Infer category from en index
  const enEntry = indexFiles.find(e => e.file === `en/${fname}`);
  zhIndexFiles.push({
    file: `zh/${fname}`,
    category: enEntry ? enEntry.category : fname.replace('.json', ''),
    count: newSkills.length
  });
}

// ─── Step 4: Update zh/index.json ────────────────────────────────────
const zhIndexPath = path.join(dataDir, 'zh/index.json');
let zhIndex = {};
if (fs.existsSync(zhIndexPath)) {
  zhIndex = JSON.parse(fs.readFileSync(zhIndexPath, 'utf-8'));
}
zhIndex.total = zhTotal;
zhIndex.generated = newData.generated || new Date().toISOString().slice(0, 10);
fs.writeFileSync(zhIndexPath, JSON.stringify(zhIndex, null, 2));
console.log(`✓ Updated zh/index.json (total: ${zhTotal})`);

console.log(`\n✅ Done! Injected clawhub fields into ${Object.keys(clawhubMap).length} skills`);
