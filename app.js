// Web3 AI Skill Platform — App Store Style
// Loads from data/skills-enriched.json (Claude AI analyzed) with fallback to data/skills.json
(function () {
  'use strict';

  let ALL = [];
  let filtered = [];
  let filters = { tech: 'all', user: 'all' };

  // ─── Load data ──────────────────────────────────────────────────

  async function init() {
    try {
      // Try enriched data first, fall back to basic skills.json
      let json;
      try {
        const res = await fetch('data/skills-enriched.json');
        if (res.ok) {
          json = await res.json();
          console.log(`Loaded enriched data: ${json.total} skills (AI: ${json.enrichedByAI}, fallback: ${json.enrichedByFallback})`);
        }
      } catch (e) { /* fallback below */ }

      if (!json) {
        const res = await fetch('data/skills.json');
        json = await res.json();
        console.log(`Loaded basic data: ${json.total} skills`);
      }

      ALL = (json.skills || []).map((s, i) => normalizeSkill(s, i));
      renderStats();
      renderCatBars();
      doFilter();
      bindEvents();
    } catch (e) {
      document.getElementById('grid').innerHTML = '<div style="text-align:center;color:#888;padding:60px;">加载失败，请刷新重试</div>';
      console.error('Init failed:', e);
    }
  }

  // Normalize skill object from either enriched or basic format
  function normalizeSkill(s, i) {
    return {
      id: s.id || i + 1,
      name: s.name || s.displayName || s.slug || '',
      author: s.author || (s.slug || '').split('/')[0] || 'unknown',
      desc: s.desc || s.what_it_does || s.summary || '',
      category: s.category || s.category_tech || '其他',
      userCat: s.userCat || s.category_user || '其他',
      userCls: s.userCls || 'other',
      example: s.example || '',
      userProvides: s.userProvides || s.user_provides || '',
      dapps: s.dapps || '',
      runMode: s.runMode || s.run_mode || '一次性执行',
      github: s.github || s.github_url || (s.slug ? `https://github.com/${s.slug}` : ''),
      icon: s.icon || '🔗',
      iconBg: s.iconBg || 'linear-gradient(135deg,#636e72,#b2bec3)',
      web3Score: s.web3Score || 0
    };
  }

  // ─── Stats bar ──────────────────────────────────────────────────

  function renderStats() {
    const techCount = new Set(ALL.map(s => s.category)).size;
    const userCount = new Set(ALL.map(s => s.userCat)).size;
    const authorCount = new Set(ALL.map(s => s.author)).size;
    document.getElementById('stats-row').innerHTML = [
      { v: ALL.length, l: '总 Skill', c: 's1' },
      { v: techCount, l: '技术赛道', c: 's2' },
      { v: userCount, l: '用户场景', c: 's3' },
      { v: authorCount, l: '贡献者', c: 's4' }
    ].map(s => `<div class="stat-box ${s.c}"><span class="val">${s.v}</span><span class="lbl">${s.l}</span></div>`).join('');
  }

  // ─── Category filter pills ─────────────────────────────────────

  function renderCatBars() {
    renderPills('filter-tech', countSorted(ALL, 'category'), 'tech', '技术赛道');
    renderPills('filter-user', countSorted(ALL, 'userCat'), 'user', '用户场景');
  }

  function renderPills(containerId, items, filterKey, label) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = `<span class="filter-label">${label}</span>`;
    html += `<span class="pill active" data-fk="${filterKey}" data-fv="all">全部</span>`;
    items.forEach(([k, n]) => {
      html += `<span class="pill" data-fk="${filterKey}" data-fv="${esc(k)}">${esc(k)}<span class="cnt">${n}</span></span>`;
    });
    el.innerHTML = html;
  }

  // ─── Filtering ─────────────────────────────────────────────────

  function doFilter() {
    const q = (document.getElementById('search')?.value || '').toLowerCase();
    filtered = ALL.filter(s => {
      if (filters.tech !== 'all' && s.category !== filters.tech) return false;
      if (filters.user !== 'all' && s.userCat !== filters.user) return false;
      if (q) {
        const hay = [s.name, s.author, s.desc, s.dapps, s.category, s.userCat, s.example].join(' ').toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
    renderGrid();
    const countEl = document.getElementById('count');
    if (countEl) countEl.textContent = filtered.length + ' 个 Skill';
  }

  // ─── Card grid ─────────────────────────────────────────────────

  function renderGrid() {
    const el = document.getElementById('grid');
    if (!el) return;
    if (!filtered.length) {
      el.innerHTML = '<div style="text-align:center;color:#888;padding:60px;grid-column:1/-1;">没有匹配的 Skill</div>';
      return;
    }
    el.innerHTML = filtered.map(s => {
      const dapps = s.dapps ? s.dapps.split(/[,，、/]/).map(d => d.trim()).filter(Boolean)
        .map(d => `<span class="ext-tag">${esc(d)}</span>`).join('') : '';

      return `<div class="card" onclick="window.__openDetail(${s.id})">
        <div class="card-top">
          <div class="card-icon" style="background:${s.iconBg}">${s.icon}</div>
          <div class="card-top-right">
            <div class="cap-tags">
              <span class="cap-tag defi">${esc(s.category)}</span>
              <span class="cap-tag ${s.userCls}">${esc(s.userCat)}</span>
            </div>
          </div>
        </div>
        <div class="card-desc">${esc(s.desc)}</div>
        ${dapps ? `<div class="card-section"><div class="card-section-title">交互平台</div><div class="ext-tags">${dapps}</div></div>` : ''}
        <div class="card-source"><span class="sname">${esc(s.name)}</span> · by ${esc(s.author)}</div>
        <div class="card-footer">
          ${s.github ? `<a href="${esc(s.github)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">GitHub →</a>` : '<span></span>'}
          <button class="install-btn" onclick="event.stopPropagation();window.open('https://clawhub.ai','_blank')">获取 Skill</button>
        </div>
      </div>`;
    }).join('');
  }

  // ─── Detail modal ──────────────────────────────────────────────

  function openDetail(id) {
    const s = ALL.find(x => x.id === id);
    if (!s) return;
    const dappList = s.dapps ? s.dapps.split(/[,，、/]/).map(d => d.trim()).filter(Boolean) : [];
    const provList = s.userProvides ? s.userProvides.split(/[,，、/]/).map(d => d.trim()).filter(Boolean) : [];

    document.getElementById('detail-content').innerHTML = `
      <div class="dm-header">
        <button class="dm-close" onclick="window.__closeDetail()">✕</button>
        <div class="dm-top">
          <div class="dm-icon" style="background:${s.iconBg}">${s.icon}</div>
          <div>
            <div class="dm-badges" style="margin-bottom:8px">
              <span class="cap-tag defi">${esc(s.category)}</span>
              <span class="cap-tag ${s.userCls}">${esc(s.userCat)}</span>
            </div>
            <div class="dm-author-line">${esc(s.name)} · by ${esc(s.author)}</div>
          </div>
        </div>
      </div>
      <div class="dm-desc">${esc(s.desc)}</div>

      ${s.example ? `<div class="dm-section">
        <div class="dm-section-title"><span class="icon">💡</span> 使用示例</div>
        <div style="font-size:13px;color:#aaa;line-height:1.7;padding:12px 16px;background:#1a1f38;border-radius:10px;">${esc(s.example)}</div>
      </div>` : ''}

      ${provList.length ? `<div class="dm-section">
        <div class="dm-section-title"><span class="icon">📋</span> 你需要提供</div>
        ${provList.map(p => `<div class="info-row"><span style="color:#6c5ce7">•</span><span class="info-value">${esc(p)}</span></div>`).join('')}
      </div>` : ''}

      ${dappList.length ? `<div class="dm-section">
        <div class="dm-section-title"><span class="icon">🔗</span> 交互的 DApp / 平台</div>
        <div class="ext-tags" style="gap:10px">${dappList.map(d => `<span class="ext-tag" style="padding:8px 14px;font-size:13px">${esc(d)}</span>`).join('')}</div>
      </div>` : ''}

      <div class="dm-section">
        <div class="dm-section-title">
          <span class="icon">⚙️</span> 运行模式
          <span class="tooltip-trigger" title="一次性执行：下达指令后执行一次即完成（如查询、swap）\n持续AI决策：AI持续自主运行、监控、自动做决策（如量化bot）\n混合：部分自动+部分需用户确认">?</span>
        </div>
        <span style="display:inline-block;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;${s.runMode === '持续AI决策' ? 'background:rgba(239,68,68,0.15);color:#ef4444' : s.runMode === '混合' ? 'background:rgba(245,158,11,0.15);color:#f59e0b' : 'background:rgba(34,197,94,0.15);color:#22c55e'}">${esc(s.runMode)}</span>
      </div>

      <div class="dm-footer">
        ${s.github ? `<a href="${esc(s.github)}" target="_blank" rel="noopener">查看源码 →</a>` : ''}
        <a href="https://clawhub.ai/skills/${encodeURIComponent(s.name)}" target="_blank" rel="noopener" style="background:linear-gradient(135deg,#00b894,#00cec9)">获取 Skill →</a>
      </div>
    `;
    document.getElementById('detail-modal').classList.remove('hidden');
  }

  function closeDetail() {
    document.getElementById('detail-modal').classList.add('hidden');
  }

  // Expose to global for onclick handlers
  window.__openDetail = openDetail;
  window.__closeDetail = closeDetail;

  // ─── Events ────────────────────────────────────────────────────

  function bindEvents() {
    const searchEl = document.getElementById('search');
    if (searchEl) searchEl.addEventListener('input', debounce(doFilter, 200));

    document.addEventListener('click', e => {
      if (e.target.classList.contains('pill')) {
        const fk = e.target.dataset.fk;
        const fv = e.target.dataset.fv;
        if (fk && fv !== undefined) {
          filters[fk] = fv;
          e.target.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
          e.target.classList.add('active');
          doFilter();
        }
      }
    });

    // Close modal on overlay click
    const modal = document.getElementById('detail-modal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeDetail();
      });
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  function countSorted(arr, key) {
    const m = {};
    arr.forEach(s => { const v = s[key] || '其他'; m[v] = (m[v] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function debounce(fn, ms) {
    let t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  // Go
  init();
})();

