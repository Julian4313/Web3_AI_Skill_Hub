// Sync script - Fetches all skills from ClawHub and filters Web3 related ones
// Run with: node scripts/sync.js
//
// IMPORTANT: This script requires a VALID Anthropic API key to run.
// If ANTHROPIC_API_KEY is missing or invalid, sync will NOT proceed.
// This ensures we never produce unenriched data.

const fs = require('fs');
const path = require('path');
const { WEB3_KEYWORDS, analyzeWeb3Score, categorizeWeb3Skill, processSkills } = require('./web3-analyzer.js');
const { enrich } = require('./enrich.js');

const CLAWHUB_API = 'https://clawhub.ai/api/v1/skills';
const OUTPUT_FILE = path.join(__dirname, '../data/skills.json');

// ─── API Key Validation ─────────────────────────────────────────────
// Validates that the Anthropic API key exists AND is currently working
// by making a minimal API call (cheapest possible: 1 token output).

async function validateApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Step 1: Check existence
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ ANTHROPIC_API_KEY is not set.');
    console.error('   Sync requires a valid API key for AI enrichment.');
    console.error('   Set it via: export ANTHROPIC_API_KEY="sk-ant-..."');
    console.error('   Or add it to GitHub Secrets for CI.');
    return false;
  }

  // Step 2: Validate by making a minimal test call
  console.log('🔑 Validating Anthropic API key...');
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      })
    });

    if (resp.ok) {
      console.log('✅ API key is valid and working.');
      return true;
    }

    // Handle specific error codes
    const errBody = await resp.text().catch(() => '');
    if (resp.status === 401) {
      console.error('❌ API key is INVALID (401 Unauthorized).');
      console.error('   Please check your ANTHROPIC_API_KEY.');
    } else if (resp.status === 403) {
      console.error('❌ API key is FORBIDDEN (403). Key may be revoked or lacks permission.');
    } else if (resp.status === 429) {
      // Rate limited but key IS valid — this is okay
      console.log('✅ API key is valid (rate limited, but authenticated).');
      return true;
    } else if (resp.status === 529) {
      console.error('❌ Anthropic API is overloaded (529). Try again later.');
    } else {
      console.error(`❌ API validation failed: HTTP ${resp.status}`);
      console.error(`   ${errBody.slice(0, 200)}`);
    }
    return false;

  } catch (err) {
    console.error(`❌ API validation failed (network error): ${err.message}`);
    console.error('   Check your internet connection and try again.');
    return false;
  }
}

// ─── Fetch with retry ────────────────────────────────────────────────

async function fetchWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429) {
          const waitTime = Math.pow(2, i) * 10; // Exponential backoff
          console.log(`Rate limited, waiting ${waitTime}s...`);
          await new Promise(r => setTimeout(r, waitTime * 1000));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 2000));
    }
  }
}

// Fetch all skills with pagination
async function fetchAllSkills() {
  console.log('Fetching skills from ClawHub API...');
  console.log('Using Web3 keywords:', Object.keys(WEB3_KEYWORDS).length, 'categories');

  let allSkills = [];
  let cursor = null;
  let page = 1;

  do {
    const url = cursor
      ? `${CLAWHUB_API}?cursor=${encodeURIComponent(cursor)}`
      : CLAWHUB_API;

    console.log(`Fetching page ${page}...`);
    const data = await fetchWithRetry(url);

    if (data.items && data.items.length > 0) {
      allSkills = allSkills.concat(data.items);
      cursor = data.nextCursor;
      page++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    } else {
      cursor = null;
    }

  } while (cursor);

  console.log(`Total skills fetched: ${allSkills.length}`);
  return allSkills;
}

// ─── Main sync function ──────────────────────────────────────────────

async function sync() {
  try {
    // ══════ GATE: Validate API key BEFORE doing anything ══════
    const isValid = await validateApiKey();
    if (!isValid) {
      console.error('\n🚫 Sync aborted: No valid Anthropic API key.');
      console.error('   The sync pipeline requires AI enrichment to produce useful data.');
      console.error('   Without a valid key, we would only get raw English data without');
      console.error('   Chinese metadata, which is not suitable for the App Store frontend.');
      console.error('\n   To fix: set ANTHROPIC_API_KEY environment variable with a valid key.');
      process.exit(1);
    }

    // Fetch all skills
    const allSkills = await fetchAllSkills();

    // Process and filter Web3 skills
    console.log('\nAnalyzing skills for Web3 relevance...');
    const web3Skills = processSkills(allSkills);

    console.log(`Web3 skills found: ${web3Skills.length}`);

    // Print top skills by score
    console.log('\nTop Web3 skills by relevance score:');
    web3Skills.slice(0, 10).forEach((skill, i) => {
      console.log(`  ${i + 1}. ${skill.displayName} (score: ${skill.web3Score.toFixed(1)}, category: ${skill.category})`);
      console.log(`     Keywords: ${skill.web3Keywords.slice(0, 5).join(', ')}`);
    });

    // Prepare output
    const output = {
      lastSync: new Date().toISOString(),
      total: web3Skills.length,
      source: 'https://clawhub.ai',
      categories: {
        defi: web3Skills.filter(s => s.category === 'defi').length,
        wallet: web3Skills.filter(s => s.category === 'wallet').length,
        payments: web3Skills.filter(s => s.category === 'payments').length,
        nft: web3Skills.filter(s => s.category === 'nft').length,
        sdk: web3Skills.filter(s => s.category === 'sdk').length,
        bridge: web3Skills.filter(s => s.category === 'bridge').length,
        chains: web3Skills.filter(s => s.category === 'chains').length,
        tools: web3Skills.filter(s => s.category === 'tools').length
      },
      skills: web3Skills.map(skill => ({
        slug: skill.slug,
        displayName: skill.displayName,
        summary: skill.summary,
        tags: skill.tags,
        stats: skill.stats,
        category: skill.category,
        web3Score: skill.web3Score,
        web3Keywords: skill.web3Keywords,
        latestVersion: skill.latestVersion,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt
      }))
    };

    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n✅ Saved ${web3Skills.length} Web3 skills to ${OUTPUT_FILE}`);

    // Print summary by category
    console.log('\nSkills by category:');
    Object.entries(output.categories).forEach(([cat, count]) => {
      if (count > 0) {
        console.log(`  ${cat}: ${count}`);
      }
    });

    // Step 2: Enrich with AI (Chinese metadata)
    // API key is already validated above, so enrich will use Claude AI.
    // enrich.js handles incremental logic internally (skips already-enriched skills).
    console.log('\n🔬 Starting AI enrichment...');
    const enrichedOutput = await enrich(web3Skills);
    console.log(`✅ Enrichment complete: ${enrichedOutput.total} skills`);

    return output;

  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  sync();
}

module.exports = { sync, fetchAllSkills, processSkills, validateApiKey };
