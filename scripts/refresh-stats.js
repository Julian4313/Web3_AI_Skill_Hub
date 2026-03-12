// Refresh clawhub_downloads / clawhub_stars / clawhub_is_certified
// from the ClawHub API for all en/*.json and zh/*.json data files.
//
// No Anthropic API key required — pure stats refresh.
// Run manually: node scripts/refresh-stats.js
// Or via GitHub Actions: .github/workflows/refresh-stats.yml (daily cron)

const fs = require('fs');
const path = require('path');

const CLAWHUB_API = 'https://clawhub.ai/api/v1/skills';
const DATA_DIR = path.join(__dirname, '../data');

// ─── Fetch with retry + exponential backoff ──────────────────────────

async function fetchWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429) {
          const wait = Math.pow(2, i) * 10;
          console.log(`  Rate limited, waiting ${wait}s...`);
          await new Promise(r => setTimeout(r, wait * 1000));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${url}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      const wait = Math.pow(2, i) * 2;
      console.log(`  Retry ${i + 1}/${retries} in ${wait}s... (${err.message})`);
      await new Promise(r => setTimeout(r, wait * 1000));
    }
  }
}

// ─── Fetch all skills (cursor-based pagination) ──────────────────────

async function fetchAllSkills() {
  console.log('Fetching skills from ClawHub API...');
  let all = [];
  let cursor = null;
  let page = 1;

  do {
    const url = cursor
      ? `${CLAWHUB_API}?cursor=${encodeURIComponent(cursor)}`
      : CLAWHUB_API;

    process.stdout.write(`  Page ${page}...`);
    const data = await fetchWithRetry(url);

    if (data.items && data.items.length > 0) {
      all = all.concat(data.items);
      process.stdout.write(` (${data.items.length} items)\n`);
      cursor = data.nextCursor || null;
      page++;
      await new Promise(r => setTimeout(r, 800)); // Polite delay
    } else {
      process.stdout.write(` (done)\n`);
      cursor = null;
    }
  } while (cursor);

  console.log(`Total fetched: ${all.length} skills`);
  return all;
}

// ─── Build slug → stats lookup map ───────────────────────────────────
// Defensive extraction handles multiple possible API field shapes.

function buildStatsMap(apiSkills) {
  const map = {};

  for (const s of apiSkills) {
    const slug = s.slug || s.name;
    if (!slug) continue;

    const stats = s.stats || {};

    // Try all common field names for downloads and stars
    const rawDownloads =
      stats.downloads     ?? stats.downloadCount  ?? stats.download_count ??
      s.downloads         ?? s.downloadCount      ?? s.download_count     ?? 0;

    const rawStars =
      stats.stars         ?? stats.starCount      ?? stats.star_count     ??
      s.stars             ?? s.starCount          ?? s.star_count         ?? 0;

    const rawCertified =
      s.isCertified       ?? s.is_certified       ?? s.certified          ??
      stats.isCertified   ?? stats.is_certified   ?? false;

    map[slug] = {
      clawhub_downloads:    typeof rawDownloads === 'number' ? rawDownloads : (parseInt(rawDownloads) || 0),
      clawhub_stars:        typeof rawStars === 'number'     ? rawStars     : (parseInt(rawStars)     || 0),
      clawhub_is_certified: Boolean(rawCertified),
    };
  }

  return map;
}

// ─── Update one category JSON file ───────────────────────────────────

function updateFile(filePath, statsMap) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let updated = 0;

  content.skills = content.skills.map(skill => {
    const slug = skill.clawhub_slug || skill.name;
    const fresh = statsMap[slug];
    if (!fresh) return skill;

    const changed =
      skill.clawhub_downloads    !== fresh.clawhub_downloads    ||
      skill.clawhub_stars        !== fresh.clawhub_stars        ||
      skill.clawhub_is_certified !== fresh.clawhub_is_certified;

    if (changed) {
      updated++;
      return { ...skill, ...fresh };
    }
    return skill;
  });

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  }
  return updated;
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const apiSkills = await fetchAllSkills();
  const statsMap  = buildStatsMap(apiSkills);
  console.log(`Stats map built: ${Object.keys(statsMap).length} entries\n`);

  const today = new Date().toISOString().slice(0, 10);
  let grandTotal = 0;

  for (const lang of ['en', 'zh']) {
    const indexPath = path.join(DATA_DIR, lang, 'index.json');
    if (!fs.existsSync(indexPath)) continue;

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    let langTotal = 0;

    console.log(`── ${lang}/ ──`);
    for (const entry of index.files) {
      const filePath = path.join(DATA_DIR, entry.file);
      if (!fs.existsSync(filePath)) continue;

      const updated = updateFile(filePath, statsMap);
      if (updated > 0) {
        console.log(`  ${entry.file}: ${updated} updated`);
        langTotal += updated;
      }
    }

    // Update index generated date
    index.generated = today;
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`  ${lang}/index.json: generated = ${today}`);
    grandTotal += langTotal;
  }

  console.log(`\n✅ Done. ${grandTotal} skill stats refreshed (${today})`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
