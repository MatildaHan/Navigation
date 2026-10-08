/* ============================================================
 *  个人主页运行逻辑
 *  - 读取 config.md → 解析为对象
 *  - 各模块独立执行，单点错误不拖垮整页
 *  - 所有 URL 走白名单校验，防 XSS
 * ============================================================ */
'use strict';

const IS_DEV = ['localhost', '127.0.0.1'].includes(location.hostname);
const log = (...args) => { if (IS_DEV) console.log(...args); };

const DEFAULT_SEARCH = 'https://www.google.com/search?q={query}';
const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];
const MEDIA_PROTOCOLS = ['http:', 'https:', 'blob:'];
const PLACEHOLDER_RE = /yourid|yourusername|your-email|xxxxxx/i;

const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="#dddddd"/>
        <circle cx="50" cy="40" r="16" fill="#aaaaaa"/>
        <path d="M20 90 Q50 60 80 90" fill="#aaaaaa"/>
    </svg>`
);

document.addEventListener('DOMContentLoaded', init);

async function init() {
    let CFG = {};
    try {
        CFG = parseConfig(await loadConfig());
        if (IS_DEV) window.CFG = CFG;
        log('已加载配置：', CFG);
    } catch (e) {
        console.error('无法读取 config.md', e);
        showNotice('无法读取 config.md。请通过 Web 服务器访问本页（如 VS Code Live Server、npx serve，或部署到线上）；直接双击打开 index.html 会被浏览器拦截。');
    }

    const steps = [
        applyText, applyLinkHref, applyAvatar, applyWallpaper, applyTheme,
        applyDocumentMeta, renderLinks, initClockAndCalendar,
        initMusicPlayer, initSearch, renderBooks, renderMovies,
    ];
    steps.forEach(fn => {
        try { fn(CFG); } catch (e) { console.error(`[${fn.name}] 执行出错`, e); }
    });

    document.body.classList.remove('is-loading');
}

async function loadConfig() {
    const res = await fetch('config.md', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

/* ============================================================
 *  工具
 * ============================================================ */
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function showNotice(msg) {
    const box = document.getElementById('notice');
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
}

function safeUrl(raw, allowed = LINK_PROTOCOLS) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    try {
        const u = new URL(s, document.baseURI);
        return (allowed.includes(u.protocol) || u.protocol === location.protocol) ? u.href : null;
    } catch {
        return null;
    }
}

function cssUrl(href) {
    return `url("${href.replace(/["\\\n\r]/g, c => encodeURIComponent(c))}")`;
}

function isExternal(href) {
    try {
        const u = new URL(href);
        return /^https?:$/.test(u.protocol) && u.origin !== location.origin;
    } catch {
        return false;
    }
}

/* ============================================================
 *  配置解析器
 * ============================================================ */
const LIST_SECTIONS = new Set(['links', 'anniversary', 'books', 'movies', 'playlist']);

function parseConfig(mdText) {
    const result = {};
    let section = null;
    let block = null;

    const flush = () => {
        if (block && Array.isArray(section) && Object.keys(block).length) section.push(block);
        block = null;
    };

    String(mdText).split(/\r?\n/).forEach((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) { flush(); return; }
        if (trimmed.startsWith('#')) return;

        const sec = trimmed.match(/^---\s*(.+?)\s*---$/);
        if (sec) {
            flush();
            const name = sec[1].toLowerCase();
            section = LIST_SECTIONS.has(name) ? [] : {};
            result[name] = section;
            return;
        }
        if (!section) return;

        const kv = trimmed.match(/^([^：:]+)[：:]\s*(.+)$/);
        if (!kv) {
            log(`config.md 第 ${idx + 1} 行无法解析，已忽略：`, trimmed);
            return;
        }
        const key = kv[1].trim();
        const value = kv[2].trim();

        if (Array.isArray(section)) {
            if (block && Object.prototype.hasOwnProperty.call(block, key)) flush();
            if (!block) block = {};
            block[key] = value;
        } else {
            section[key] = value;
        }
    });

    flush();
    return result;
}

/* ============================================================
 *  应用文本 / 链接 / 头像 / 壁纸 / 主题
 * ============================================================ */
function applyText(CFG) {
    const map = {
        'profile.name': CFG.profile?.昵称,
        'greetings.sub': CFG.greetings?.副标题,
        'quote.text': CFG.quote?.格言,
        'quote.author': CFG.quote?.作者,
    };
    document.querySelectorAll('[data-cfg-text]').forEach(node => {
        const v = map[node.dataset.cfgText];
        if (v != null) node.textContent = v;
    });
}

function applyLinkHref(CFG) {
    const links = CFG.links || [];
    document.querySelectorAll('[data-cfg-link]').forEach(a => {
        const item = links.find(l => l['名称'] === a.dataset.cfgLink);
        const url = safeUrl(item?.['网址']);
        if (!url) return;
        a.href = url;
        if (isExternal(url)) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
    });
}

function applyAvatar(CFG) {
    const url = safeUrl(CFG.profile?.头像网址, MEDIA_PROTOCOLS);
    const targets = document.querySelectorAll('[data-cfg-bg="profile.avatar"]');
    const set = u => targets.forEach(t => { t.style.backgroundImage = cssUrl(u); });

    if (!url) { set(FALLBACK_IMG); return; }
    set(url);
    const probe = new Image();
    probe.onerror = () => set(FALLBACK_IMG);
    probe.src = url;
}

function applyWallpaper(CFG) {
    const url = safeUrl(CFG.assets?.壁纸, MEDIA_PROTOCOLS);
    if (url) document.documentElement.style.setProperty('--bg-wallpaper', cssUrl(url));
}

function applyTheme(CFG) {
    const t = CFG.theme;
    if (!t) return;
    const root = document.documentElement;

    const hue = parseFloat(t.强调色相);
    if (Number.isFinite(hue)) root.style.setProperty('--accent-hue', String(hue));

    if (t.玻璃背景) root.style.setProperty('--glass-bg', t.玻璃背景);
    if (t.玻璃边框) root.style.setProperty('--glass-border', t.玻璃边框);
    if (t.玻璃阴影) root.style.setProperty('--glass-shadow', t.玻璃阴影);
    if (t.主文本色) root.style.setProperty('--text-primary', t.主文本色);
    if (t.次文本色) root.style.setProperty('--text-secondary', t.次文本色);

    const px = v => {
        const m = String(v).trim().match(/^(\d+(?:\.\d+)?)(px|rem|em)?$/);
        return m ? m[1] + (m[2] || 'px') : null;
    };
    if (t.壁纸模糊) {
        const v = px(t.壁纸模糊);
        if (v) root.style.setProperty('--bg-blur', v);
    }
    if (t.玻璃模糊) {
        const v = px(t.玻璃模糊);
        if (v) root.style.setProperty('--glass-blur', v);
    }
}

function applyDocumentMeta(CFG) {
    const name = CFG.profile?.昵称;
    if (name) document.title = `${name} - 个人主页`;

    const icon = safeUrl(CFG.profile?.头像网址, MEDIA_PROTOCOLS);
    if (icon) {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = icon;
    }
}

/* ============================================================
 *  渲染链接
 * ============================================================ */
function sanitizeIcon(icon) {
    return /^[a-z0-9 -]+$/i.test(icon || '') ? icon : 'fa-solid fa-link';
}

function renderLinks(CFG) {
    const links = (CFG.links || [])
        .map(item => ({
            name: item['名称'] || '链接',
            url: safeUrl(item['网址']),
            icon: sanitizeIcon(item['图标']),
            raw: item['网址'] || '',
        }))
        .filter(l => l.url);

    links.forEach(l => {
        if (PLACEHOLDER_RE.test(l.raw)) log(`链接「${l.name}」仍是占位地址，记得改成真实地址：`, l.raw);
    });

    const fill = (box, className) => {
        if (!box) return;
        box.replaceChildren();
        links.forEach(l => {
            const a = el('a', className);
            a.href = l.url;
            a.title = l.name;
            a.setAttribute('aria-label', l.name);
            if (isExternal(l.url)) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            const i = el('i', l.icon);
            i.setAttribute('aria-hidden', 'true');
            a.appendChild(i);
            box.appendChild(a);
        });
    };
    fill(document.getElementById('sidebar-links'), 'sidebar-btn');
    fill(document.getElementById('bottom-dock-links'), 'dock-icon');
}

/* ============================================================
 *  日期工具
 * ============================================================ */
function parseLocalDate(str) {
    const m = String(str || '').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
}

function daysBetween(from, to) {
    const utc = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((utc(to) - utc(from)) / 86400000);
}

/* ============================================================
 *  时钟 + 日历
 * ============================================================ */
function initClockAndCalendar(CFG) {
    const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const clockEl = document.getElementById('live-clock');
    const dateEl = document.getElementById('live-date');
    const greetEl = document.getElementById('dynamic-greeting');
    const name = CFG.profile?.昵称 || '';

    let lastHour = -1;
    let lastDayKey = '';

    const greetingFor = h => {
        if (h >= 5 && h < 11) return '早上好';
        if (h >= 11 && h < 13) return '中午好';
        if (h >= 13 && h < 18) return '下午好';
        if (h >= 18 && h < 23) return '晚上好';
        return '夜深了';
    };

    function tick() {
        const now = new Date();
        const hour = now.getHours();
        const pad = n => String(n).padStart(2, '0');

        if (clockEl) clockEl.textContent = `${pad(hour)}:${pad(now.getMinutes())}`;
        if (dateEl) dateEl.textContent = `${WEEKDAYS[now.getDay()]} ${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;

        if (hour !== lastHour) {
            lastHour = hour;
            if (greetEl) greetEl.textContent = `${greetingFor(hour)}${name ? `，这里是${name}` : ''}！`;
        }

        const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        if (dayKey !== lastDayKey) {
            lastDayKey = dayKey;
            renderCalendar(now);
            renderAnniversary(CFG.anniversary);
        }
    }

    function renderCalendar(now) {
        const grid = document.getElementById('calendar-grid');
        const monthEl = document.getElementById('calendar-month');
        if (!grid) return;
        if (monthEl) monthEl.textContent = `${now.getFullYear()} 年 ${MONTHS[now.getMonth()]}`;

        grid.querySelectorAll('span:not(.day-name)').forEach(n => n.remove());

        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        grid.style.setProperty('--calendar-rows', String(1 + Math.ceil((firstDay + totalDays) / 7)));

        for (let i = 0; i < firstDay; i++) {
            const blank = el('span');
            blank.setAttribute('aria-hidden', 'true');
            grid.appendChild(blank);
        }
        for (let d = 1; d <= totalDays; d++) {
            const span = el('span', d === now.getDate() ? 'active' : '', String(d));
            if (d === now.getDate()) span.setAttribute('aria-current', 'date');
            grid.appendChild(span);
        }
    }

    tick();
    setInterval(tick, 1000);
}

/* ============================================================
 *  音乐播放器
 * ============================================================ */
function initMusicPlayer(CFG) {
    const audio = document.getElementById('main-audio');
    const playBtn = document.getElementById('play-btn');
    const trackTitle = document.getElementById('track-title');
    const playerArt = document.getElementById('player-art');
    const btnRepeat = document.getElementById('btn-repeat');
    const btnHeart = document.getElementById('btn-heart');
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    if (!audio || !playBtn) return;

    const playlist = (CFG.playlist || [])
        .map(item => ({
            title: item['歌曲名'] || '未知曲目',
            url: safeUrl(item['音频'], MEDIA_PROTOCOLS),
            art: safeUrl(item['封面'], MEDIA_PROTOCOLS),
        }))
        .filter(t => t.url);

    if (playlist.length === 0) {
        if (trackTitle) trackTitle.textContent = '暂无曲目';
        document.querySelectorAll('.player-controls button').forEach(b => { b.disabled = true; });
        return;
    }
    if (playlist.length === 1) {
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
    }

    const LIKE_KEY = 'homepage-liked-tracks';
    const readLiked = () => {
        try {
            const liked = JSON.parse(localStorage.getItem(LIKE_KEY));
            return Array.isArray(liked) ? liked.filter(url => typeof url === 'string') : [];
        } catch { return []; }
    };
    const writeLiked = list => {
        try { localStorage.setItem(LIKE_KEY, JSON.stringify(list)); } catch {}
    };

    let current = 0;

    function syncHeart() {
        if (!btnHeart) return;
        const liked = readLiked().includes(playlist[current].url);
        btnHeart.setAttribute('aria-pressed', String(liked));
        btnHeart.setAttribute('aria-label', liked ? '取消喜欢' : '喜欢');
    }

    function loadTrack(i) {
        current = i;
        const t = playlist[i];
        audio.src = t.url;
        if (trackTitle) {
            trackTitle.textContent = t.title;
            trackTitle.title = t.title;
        }
        if (playerArt) playerArt.style.backgroundImage = t.art ? cssUrl(t.art) : '';
        syncHeart();
    }

    async function play() {
        try {
            await audio.play();
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('播放被浏览器阻止或失败：', e);
        }
    }

    function step(delta) {
        loadTrack((current + delta + playlist.length) % playlist.length);
        play();
    }

    const icon = playBtn.querySelector('i');
    const setPlayingUi = playing => {
        if (icon) icon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        playBtn.setAttribute('aria-label', playing ? '暂停' : '播放');
    };
    audio.addEventListener('play', () => setPlayingUi(true));
    audio.addEventListener('pause', () => setPlayingUi(false));
    audio.addEventListener('error', () => {
        setPlayingUi(false);
        if (trackTitle) trackTitle.textContent = '⚠️ 音频加载失败';
    });
    audio.addEventListener('ended', () => {
        if (playlist.length > 1) step(1);
    });

    playBtn.addEventListener('click', () => { audio.paused ? play() : audio.pause(); });
    if (btnNext) btnNext.addEventListener('click', () => step(1));
    if (btnPrev) btnPrev.addEventListener('click', () => step(-1));
    if (btnRepeat) btnRepeat.addEventListener('click', () => {
        audio.loop = !audio.loop;
        btnRepeat.setAttribute('aria-pressed', String(audio.loop));
    });
    if (btnHeart) btnHeart.addEventListener('click', () => {
        const url = playlist[current].url;
        const list = readLiked();
        writeLiked(list.includes(url) ? list.filter(u => u !== url) : [...list, url]);
        syncHeart();
    });

    loadTrack(0);
}

/* ============================================================
 *  搜索
 * ============================================================ */
function initSearch(CFG) {
    const buttons = document.querySelectorAll('#btn-search, #btn-search-mobile');
    const overlay = document.getElementById('search-overlay');
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    if (!buttons.length || !overlay || !form || !input) return;

    const tmpl = CFG.settings?.搜索引擎 || DEFAULT_SEARCH;
    let lastFocus = null;
    let backgroundState = [];

    const open = () => {
        if (!overlay.hidden) return;
        lastFocus = document.activeElement;
        input.value = '';
        overlay.hidden = false;
        input.focus();
        backgroundState = Array.from(document.querySelectorAll('.desktop-container, #bottom-dock'), node => ({ node, inert: node.inert }));
        backgroundState.forEach(({ node }) => { node.inert = true; });
    };
    const close = () => {
        if (overlay.hidden) return;
        overlay.hidden = true;
        backgroundState.forEach(({ node, inert }) => { node.inert = inert; });
        backgroundState = [];
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    function buildUrl(q) {
        const encoded = encodeURIComponent(q);
        const raw = tmpl.includes('{query}') ? tmpl.replaceAll('{query}', encoded) : tmpl + encoded;
        return safeUrl(raw, ['http:', 'https:']);
    }

    buttons.forEach(btn => btn.addEventListener('click', open));

    form.addEventListener('submit', e => {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        const url = buildUrl(q);
        if (!url) {
            showNotice('config.md 中的「搜索引擎」地址无效，请检查格式。');
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
        close();
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    document.addEventListener('keydown', e => {
        if (e.key === 'Tab' && !overlay.hidden) {
            e.preventDefault();
            input.focus();
            return;
        }
        if (e.key === 'Escape' && !overlay.hidden) {
            e.preventDefault();
            close();
            return;
        }
        const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]');
        if (e.key === '/' && overlay.hidden && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            open();
        }
    });
}

/* ============================================================
 *  列表渲染
 * ============================================================ */
function renderList(ul, items, build, emptyText) {
    if (!ul) return;
    ul.replaceChildren();
    const nodes = (items || []).map(build).filter(Boolean);
    if (nodes.length === 0) {
        ul.appendChild(el('li', 'empty', emptyText));
        return;
    }
    nodes.forEach(n => ul.appendChild(n));
}

function buildItem(main, sub, side, accent) {
    const li = el('li');
    const left = el('span', 'item-main', main);
    if (sub) left.appendChild(el('small', '', sub));
    li.appendChild(left);
    if (side) li.appendChild(el('span', accent ? 'item-side is-accent' : 'item-side', side));
    return li;
}

function describeAnniversary(item, today) {
    const date = parseLocalDate(item['日期']);
    if (!date) return null;

    const type = item['类型'] || '已过日';
    let diff = daysBetween(today, date);

    if (type === '倒数日') {
        if (item['重复'] === '每年' && diff < 0) {
            let next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
            if (daysBetween(today, next) < 0) {
                next = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
            }
            diff = daysBetween(today, next);
        }
        if (diff > 0) return { text: `还有 ${diff} 天`, accent: true };
        if (diff === 0) return { text: '就是今天', accent: true };
        return { text: `已过 ${-diff} 天`, accent: false };
    }

    if (diff < 0) return { text: `已经历 ${-diff} 天`, accent: false };
    if (diff === 0) return { text: '就是今天', accent: false };
    return { text: `还有 ${diff} 天`, accent: false };
}

function renderAnniversary(list) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    renderList(document.getElementById('anniversary-list'), list, item => {
        const result = describeAnniversary(item, today);
        if (!result) {
            log('纪念日日期格式无效（应为 YYYY-MM-DD），已跳过：', item);
            return null;
        }
        return buildItem(item['事件'] || '未命名', '', result.text, result.accent);
    }, '暂无纪念日');
}

function renderBooks(CFG) {
    renderList(document.getElementById('book-list'), CFG.books, item => {
        const status = item['状态'] || '';
        const progress = item['进度'] || '';
        const side = status === '在读' && progress ? `${status} ${progress}` : status;
        return buildItem(item['书名'] || '未知书名', item['作者'] || '佚名', side, true);
    }, '书架是空的');
}

function renderMovies(CFG) {
    renderList(document.getElementById('movie-list'), CFG.movies, item => {
        const sub = [item['类型'], item['状态']].filter(Boolean).join(' · ');
        const rating = item['评分'];
        return buildItem(item['片名'] || '未知片名', sub, rating ? `★ ${rating}` : '', true);
    }, '还没有观影记录');
}
