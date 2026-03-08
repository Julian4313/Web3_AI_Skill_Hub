// Web3 AI Skill Platform — App Store Style with i18n
(function () {
  'use strict';

  let ALL = [];
  let filtered = [];
  let filters = { tech: 'all', user: 'all', dapp: 'all' };
  let LANG = localStorage.getItem('lang') || 'zh';

  // ─── i18n strings ───────────────────────────────────────────────

  const I18N = {
    zh: {
      subtitle: '开源 AI Agent Skill，源码逐个分析',
      statSkills: '总 Skill', statTech: '技术赛道', statUser: '用户场景', statAuthor: '贡献者',
      searchPlaceholder: '🔍 搜索 Skill 名称、描述、DApp、作者...',
      filterTech: '技术赛道', filterUser: '用户场景', filterDapp: '交互平台', filterAll: '全部',
      countSuffix: ' 个 Skill',
      noMatch: '没有匹配的 Skill',
      loadFail: '加载失败，请刷新重试',
      dappSection: '交互平台',
      getSkill: '获取 Skill',
      getSkillArrow: '获取 Skill →',
      viewSource: '查看源码 →',
      github: 'GitHub →',
      exampleTitle: '💡 使用示例',
      provideTitle: '📋 你需要提供',
      dappTitle: '🔗 交互的 DApp / 平台',
      runModeTitle: '⚙️ 运行模式',
      tooltipText: '一次性执行：下达指令后执行一次即完成（如查询、swap）\n持续AI决策：AI持续自主运行、监控、自动做决策（如量化bot）\n混合：部分自动+部分需用户确认',
      langBtn: 'EN',
      dataFile: 'data/skills.json',
      other: '其他',
      footerText: '数据来源 <a href="https://clawhub.ai" target="_blank">ClawHub</a> · 源码分析自 <a href="https://github.com/openclaw/skills" target="_blank">OpenClaw</a> · 每6小时自动同步 · Claude AI 智能分析',
    },
    en: {
      subtitle: 'Open-source AI Agent Skills, analyzed one by one',
      statSkills: 'Skills', statTech: 'Categories', statUser: 'Use Cases', statAuthor: 'Contributors',
      searchPlaceholder: '🔍 Search skill name, description, DApp, author...',
      filterTech: 'Category', filterUser: 'Use Case', filterDapp: 'DApp', filterAll: 'All',
      countSuffix: ' Skills',
      noMatch: 'No matching skills found',
      loadFail: 'Failed to load, please refresh',
      dappSection: 'Platforms',
      getSkill: 'Get Skill',
      getSkillArrow: 'Get Skill →',
      viewSource: 'View Source →',
      github: 'GitHub →',
      exampleTitle: '💡 Example',
      provideTitle: '📋 You Provide',
      dappTitle: '🔗 DApps & Platforms',
      runModeTitle: '⚙️ Run Mode',
      tooltipText: 'One-shot: executes once per command (e.g. query, swap)\nContinuous AI: AI runs autonomously, monitors & decides (e.g. trading bot)\nHybrid: partially auto + partially manual confirmation',
      langBtn: '中文',
      dataFile: 'data/skills-en.json',
      other: 'Other',
      footerText: 'Data from <a href="https://clawhub.ai" target="_blank">ClawHub</a> · Analyzed from <a href="https://github.com/openclaw/skills" target="_blank">OpenClaw</a> · Auto-synced every 6 hours · Claude AI Analysis',
    }
  };

  function t(key) { return I18N[LANG][key] || I18N.zh[key] || key; }

  // ─── Load data ──────────────────────────────────────────────────

  async function init() {
    try {
      const res = await fetch(t('dataFile'));
      const json = await res.json();
      console.log(`Loaded ${LANG} data: ${json.total} skills`);

      ALL = (json.skills || []).map((s, i) => normalizeSkill(s, i));
      renderStats();
      renderCatBars();
      doFilter();
      bindEvents();
      updateUIText();
    } catch (e) {
      document.getElementById('grid').innerHTML = `<div style="text-align:center;color:#888;padding:60px;">${t('loadFail')}</div>`;
      console.error('Init failed:', e);
    }
  }

  function updateUIText() {
    const subtitle = document.querySelector('.page-subtitle');
    if (subtitle) subtitle.textContent = t('subtitle');
    const search = document.getElementById('search');
    if (search) search.placeholder = t('searchPlaceholder');
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.textContent = t('langBtn');
    const footer = document.querySelector('footer');
    if (footer) footer.innerHTML = t('footerText');
  }

  window.__toggleLang = function() {
    LANG = LANG === 'zh' ? 'en' : 'zh';
    localStorage.setItem('lang', LANG);
    filters = { tech: 'all', user: 'all', dapp: 'all' };
    init();
  };

  // Category → icon + gradient mapping
  const CAT_STYLE = {
    'DEX交易':   { icon: '🔄', bg: 'linear-gradient(135deg,#6c5ce7,#a29bfe)' },
    'DEX Trading': { icon: '🔄', bg: 'linear-gradient(135deg,#6c5ce7,#a29bfe)' },
    '永续合约':   { icon: '📈', bg: 'linear-gradient(135deg,#e17055,#fab1a0)' },
    'Perpetuals': { icon: '📈', bg: 'linear-gradient(135deg,#e17055,#fab1a0)' },
    '借贷协议':   { icon: '🏦', bg: 'linear-gradient(135deg,#00b894,#55efc4)' },
    'Lending':    { icon: '🏦', bg: 'linear-gradient(135deg,#00b894,#55efc4)' },
    'DeFi收益':   { icon: '🌾', bg: 'linear-gradient(135deg,#fdcb6e,#f39c12)' },
    'DeFi Yield': { icon: '🌾', bg: 'linear-gradient(135deg,#fdcb6e,#f39c12)' },
    '预测市场':   { icon: '🎯', bg: 'linear-gradient(135deg,#fd79a8,#e84393)' },
    'Prediction Markets': { icon: '🎯', bg: 'linear-gradient(135deg,#fd79a8,#e84393)' },
    '钱包管理':   { icon: '👛', bg: 'linear-gradient(135deg,#0984e3,#74b9ff)' },
    'Wallet Management': { icon: '👛', bg: 'linear-gradient(135deg,#0984e3,#74b9ff)' },
    'NFT':        { icon: '🎨', bg: 'linear-gradient(135deg,#e056fd,#be2edd)' },
    '跨链桥':     { icon: '🌉', bg: 'linear-gradient(135deg,#00cec9,#81ecec)' },
    'Cross-chain Bridge': { icon: '🌉', bg: 'linear-gradient(135deg,#00cec9,#81ecec)' },
    '数据查询':   { icon: '📊', bg: 'linear-gradient(135deg,#636e72,#b2bec3)' },
    'Data Query':  { icon: '📊', bg: 'linear-gradient(135deg,#636e72,#b2bec3)' },
    '代币分析':   { icon: '🔍', bg: 'linear-gradient(135deg,#ffeaa7,#dfe6e9)' },
    'Token Analysis': { icon: '🔍', bg: 'linear-gradient(135deg,#ffeaa7,#dfe6e9)' },
    '支付工具':   { icon: '💳', bg: 'linear-gradient(135deg,#55efc4,#00b894)' },
    'Payment Tools': { icon: '💳', bg: 'linear-gradient(135deg,#55efc4,#00b894)' },
    '智能合约':   { icon: '📜', bg: 'linear-gradient(135deg,#a29bfe,#6c5ce7)' },
    'Smart Contracts': { icon: '📜', bg: 'linear-gradient(135deg,#a29bfe,#6c5ce7)' },
    '安全审计':   { icon: '🛡️', bg: 'linear-gradient(135deg,#d63031,#ff7675)' },
    'Security Audit': { icon: '🛡️', bg: 'linear-gradient(135deg,#d63031,#ff7675)' },
    'DAO治理':    { icon: '🏛️', bg: 'linear-gradient(135deg,#0984e3,#74b9ff)' },
    'DAO Governance': { icon: '🏛️', bg: 'linear-gradient(135deg,#0984e3,#74b9ff)' },
    '基础设施':   { icon: '⚙️', bg: 'linear-gradient(135deg,#2d3436,#636e72)' },
    'Infrastructure': { icon: '⚙️', bg: 'linear-gradient(135deg,#2d3436,#636e72)' },
  };
  const DEFAULT_STYLE = { icon: '🔗', bg: 'linear-gradient(135deg,#636e72,#b2bec3)' };

  // Normalize skill object from either enriched or basic format
  function normalizeSkill(s, i) {
    const cat = s.category || s.category_tech || '其他';
    const style = CAT_STYLE[cat] || DEFAULT_STYLE;
    return {
      id: s.id || i + 1,
      name: s.name || s.displayName || s.slug || '',
      author: s.author || (s.slug || '').split('/')[0] || 'unknown',
      desc: s.desc || s.description || s.what_it_does || s.summary || '',
      category: cat,
      userCat: s.userCat || s.category_user || '其他',
      userCls: s.userCls || 'other',
      example: s.example || '',
      userProvides: s.userProvides || s.user_provides || '',
      dapps: s.dapps || '',
      runMode: s.runMode || s.run_mode || '一次性执行',
      github: s.github || s.github_url || (s.slug ? `https://github.com/${s.slug}` : ''),
      icon: s.icon || style.icon,
      iconBg: s.iconBg || style.bg,
      web3Score: s.web3Score || 0
    };
  }

  // ─── Stats bar ──────────────────────────────────────────────────

  function renderStats() {
    const techCount = new Set(ALL.map(s => s.category)).size;
    const userCount = new Set(ALL.flatMap(s => (s.userCat||'').split(/[,，]/).map(v=>v.trim()).filter(Boolean))).size;
    const authorCount = new Set(ALL.map(s => s.author)).size;
    document.getElementById('stats-row').innerHTML = [
      { v: ALL.length, l: t('statSkills'), c: 's1' },
      { v: techCount, l: t('statTech'), c: 's2' },
      { v: userCount, l: t('statUser'), c: 's3' },
      { v: authorCount, l: t('statAuthor'), c: 's4' }
    ].map(s => `<div class="stat-box ${s.c}"><span class="val">${s.v}</span><span class="lbl">${s.l}</span></div>`).join('');
  }

  // ─── Category filter pills ─────────────────────────────────────

  function renderCatBars() {
    renderPills('filter-tech', countSorted(ALL, 'category'), 'tech', t('filterTech'));
    renderPills('filter-user', countSorted(ALL, 'userCat'), 'user', t('filterUser'));
    renderDappPills();
  }

  function renderDappPills() {
    const el = document.getElementById('filter-dapp');
    if (!el) return;
    // Count dapps across all skills (split by comma)
    const m = {};
    ALL.forEach(s => {
      if (s.dapps && typeof s.dapps === 'string') {
        s.dapps.split(/[,，]/).map(d => d.trim()).filter(Boolean).forEach(d => {
          m[d] = (m[d] || 0) + 1;
        });
      }
    });
    // Sort by count, show top 20
    const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 20);
    let html = `<span class="filter-label">${t('filterDapp')}</span>`;
    html += `<span class="pill active" data-fk="dapp" data-fv="all">${t('filterAll')}</span>`;
    sorted.forEach(([k, n]) => {
      html += `<span class="pill" data-fk="dapp" data-fv="${esc(k)}">${esc(k)}<span class="cnt">${n}</span></span>`;
    });
    el.innerHTML = html;
  }

  function renderPills(containerId, items, filterKey, label) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = `<span class="filter-label">${label}</span>`;
    html += `<span class="pill active" data-fk="${filterKey}" data-fv="all">${t('filterAll')}</span>`;
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
      if (filters.user !== 'all') {
        const userList = s.userCat ? s.userCat.split(/[,，]/).map(u => u.trim()) : [];
        if (!userList.includes(filters.user)) return false;
      }
      if (filters.dapp !== 'all') {
        const dappList = s.dapps ? s.dapps.split(/[,，]/).map(d => d.trim()) : [];
        if (!dappList.includes(filters.dapp)) return false;
      }
      if (q) {
        const hay = [s.name, s.author, s.desc, s.dapps, s.category, s.userCat, s.example].join(' ').toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
    renderGrid();
    const countEl = document.getElementById('count');
    if (countEl) countEl.textContent = filtered.length + t('countSuffix');
  }

  // ─── Card grid ─────────────────────────────────────────────────

  function renderGrid() {
    const el = document.getElementById('grid');
    if (!el) return;
    if (!filtered.length) {
      el.innerHTML = `<div style="text-align:center;color:#888;padding:60px;grid-column:1/-1;">${t('noMatch')}</div>`;
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
        ${dapps ? `<div class="card-section"><div class="card-section-title">${t('dappSection')}</div><div class="ext-tags">${dapps}</div></div>` : ''}
        <div class="card-source"><span class="sname">${esc(s.name)}</span> · by ${esc(s.author)}</div>
        <div class="card-footer">
          ${s.github ? `<a href="${esc(s.github)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${t('github')}</a>` : '<span></span>'}
          <button class="install-btn" onclick="event.stopPropagation();window.open('https://clawhub.ai/skills/${encodeURIComponent(s.name)}','_blank')">${t('getSkill')}</button>
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

    const isContinuous = s.runMode === '持续AI决策' || s.runMode === 'Continuous AI';
    const isHybrid = s.runMode === '混合' || s.runMode === 'Hybrid';

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
        <div class="dm-section-title">${t('exampleTitle')}</div>
        <div style="font-size:13px;color:#aaa;line-height:1.7;padding:12px 16px;background:#1a1f38;border-radius:10px;">${esc(s.example)}</div>
      </div>` : ''}

      ${provList.length ? `<div class="dm-section">
        <div class="dm-section-title">${t('provideTitle')}</div>
        ${provList.map(p => `<div class="info-row"><span style="color:#6c5ce7">•</span><span class="info-value">${esc(p)}</span></div>`).join('')}
      </div>` : ''}

      ${dappList.length ? `<div class="dm-section">
        <div class="dm-section-title">${t('dappTitle')}</div>
        <div class="ext-tags" style="gap:10px">${dappList.map(d => `<span class="ext-tag" style="padding:8px 14px;font-size:13px">${esc(d)}</span>`).join('')}</div>
      </div>` : ''}

      <div class="dm-section">
        <div class="dm-section-title">
          ${t('runModeTitle')}
          <span class="tooltip-trigger" data-tip="${t('tooltipText')}">?</span>
        </div>
        <span style="display:inline-block;padding:6px 16px;border-radius:8px;font-size:13px;font-weight:600;${isContinuous ? 'background:rgba(239,68,68,0.15);color:#ef4444' : isHybrid ? 'background:rgba(245,158,11,0.15);color:#f59e0b' : 'background:rgba(34,197,94,0.15);color:#22c55e'}">${esc(s.runMode)}</span>
      </div>

      <div class="dm-footer">
        ${s.github ? `<a href="${esc(s.github)}" target="_blank" rel="noopener">${t('viewSource')}</a>` : ''}
        <a href="https://clawhub.ai/skills/${encodeURIComponent(s.name)}" target="_blank" rel="noopener" style="background:linear-gradient(135deg,#00b894,#00cec9)">${t('getSkillArrow')}</a>
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
    arr.forEach(s => {
      const val = s[key] || t('other');
      // Support comma-separated multi-values (e.g. userCat)
      val.split(/[,，]/).map(v => v.trim()).filter(Boolean).forEach(v => {
        m[v] = (m[v] || 0) + 1;
      });
    });
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

  // ─── JS Tooltip (avoids overflow clipping, mobile-friendly) ────
  (function setupTooltip() {
    let tip = null;
    function showTip(trigger) {
      if (tip) { tip.remove(); tip = null; }
      const text = trigger.getAttribute('data-tip');
      if (!text) return;
      tip = document.createElement('div');
      tip.className = 'js-tooltip';
      tip.textContent = text;
      document.body.appendChild(tip);
      const rect = trigger.getBoundingClientRect();
      const tipW = Math.min(280, window.innerWidth - 20);
      tip.style.width = tipW + 'px';
      let left = rect.right + 10;
      let top = rect.top - 10;
      if (left + tipW > window.innerWidth - 10) left = Math.max(10, rect.left - tipW - 10);
      if (left < 10) left = (window.innerWidth - tipW) / 2; // center on mobile
      if (top + 120 > window.innerHeight) top = window.innerHeight - 140;
      if (top < 10) top = 10;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }
    function hideTip() { if (tip) { tip.remove(); tip = null; } }
    // Desktop: hover
    document.addEventListener('mouseenter', e => {
      if (e.target && e.target.classList && e.target.classList.contains('tooltip-trigger')) showTip(e.target);
    }, true);
    document.addEventListener('mouseleave', e => {
      if (e.target && e.target.classList && e.target.classList.contains('tooltip-trigger')) hideTip();
    }, true);
    // Mobile: tap to toggle
    document.addEventListener('click', e => {
      if (e.target && e.target.classList && e.target.classList.contains('tooltip-trigger')) {
        e.preventDefault();
        e.stopPropagation();
        if (tip) hideTip(); else showTip(e.target);
      } else {
        hideTip();
      }
    });
  })();

  // Go
  init();
})();
