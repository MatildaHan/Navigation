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
        CFG = await loadModules(parseConfig(await loadConfig()));
        if (IS_DEV) window.CFG = CFG;
        log('已加载配置：', CFG);
    } catch (e) {
        console.error('无法读取 config.md', e);
        showNotice('无法读取 config.md。请通过 Web 服务器访问本页（如 VS Code Live Server、npx serve，或部署到线上）；直接双击打开 index.html 会被浏览器拦截。');
    }

    const steps = [
        applyText, applyLinkHref, applyAvatar, applyWallpaper, applyTheme,
        applyDocumentMeta, renderLinks, initClockAndCalendar,
        initMusicPlayer, initSearch, renderBooks, renderMovies, initDeck, initLifeModules, Apps.init, initDetailViews,
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

const MODULE_FILES = {
    greeting: ['greetings'], calendar: ['calendar', 'todos'], quote: ['quote', 'quotes'],
    music: ['playlist'], anniversary: ['anniversary'], books: ['books'], movies: ['movies'],
    tools: ['tools'], checkin: ['checkins'], habits: ['habits'], focus: ['focus'],
    notes: ['notes'], projects: ['projects', 'steps'], wishlist: ['wishlist'], games: ['games'],
};

async function loadModules(base) {
    const missing = [];
    const modules = await Promise.all(Object.entries(MODULE_FILES).map(async ([name, sections]) => {
        try {
            const res = await fetch(`configs/${name}.md`, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const parsed = parseConfig(await res.text());
            return Object.fromEntries(sections.filter(key => Object.hasOwn(parsed, key)).map(key => [key, parsed[key]]));
        } catch (error) {
            console.warn(`无法读取 configs/${name}.md`, error);
            missing.push(name);
            return {};
        }
    }));
    if (missing.length) showNotice(`部分卡片配置未能读取：${missing.join('、')}。请检查 configs/ 中的文件；已保留可用内容。`);
    return Object.assign(base, ...modules);
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
const LIST_SECTIONS = new Set(['links', 'anniversary', 'books', 'movies', 'playlist', 'todos', 'quotes', 'tools', 'checkins', 'habits', 'notes', 'projects', 'steps', 'wishlist', 'games']);

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
        audio.dispatchEvent(new CustomEvent('trackchange', { detail: current }));
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
    audio.addEventListener('selecttrack', event => {
        const index = event.detail;
        if (!Number.isInteger(index) || index < 0 || index >= playlist.length) return;
        loadTrack(index);
        play();
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

/* ============================================================
 *  卡片详情：hash 路由共享页面外壳，保留原播放器节点
 * ============================================================ */
function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initDetailViews(CFG) {
    const titles = { calendar: CFG.calendar?.标题 || '日历与待办', quote: '格言', music: '音乐', anniversary: '纪念日', books: '书架', movies: '观影', ...Life.titles };
    const home = document.getElementById('home-pages');
    const view = document.getElementById('detail-view');
    const body = document.getElementById('detail-body');
    const heading = document.getElementById('detail-title');
    const music = document.querySelector('.card-music');
    const audio = document.getElementById('main-audio');
    const musicMarker = document.createComment('music home position');
    music.before(musicMarker);
    let active = '';
    let homeScroll = 0;
    let disposeDetail = () => {};
    const links = new Map();

    document.querySelectorAll('[data-detail]').forEach(card => {
        const key = card.dataset.detail;
        const link = el('a', 'card-open');
        link.href = `#${key}`;
        link.setAttribute('aria-label', `查看${titles[key]}详情`);
        card.appendChild(link);
        links.set(key, link);
        card.addEventListener('click', event => {
            if (!home.contains(card) || event.target.closest('a, button, input, select, textarea')) return;
            if (window.getSelection()?.toString()) return;
            link.click();
        });
    });

    function route() {
        const key = location.hash.slice(1);
        const previous = active;
        const app = Apps.get(key);
        const isDetail = !!app || Object.hasOwn(titles, key);
        if (isDetail && !active) homeScroll = window.scrollY;
        disposeDetail();
        disposeDetail = () => {};
        music.classList.remove('detail-player');
        musicMarker.after(music);
        body.replaceChildren();
        home.hidden = isDetail;
        view.hidden = !isDetail;
        document.getElementById('page-switcher').hidden = isDetail;
        active = isDetail ? key : '';
        document.querySelector('.main-board').classList.toggle('has-app', !!app);
        const name = CFG.profile?.昵称 || '个人主页';
        document.title = isDetail ? `${app?.名称 || titles[key]} - ${name}` : `${name} - 个人主页`;
        if (!isDetail) {
            window.deckController.setPage(key === 'games' ? 2 : key === 'life' ? 1 : 0);
            if (previous) {
                (links.get(previous) || [...home.querySelectorAll('a')].find(link => link.getAttribute('href') === `#${previous}`))?.focus({ preventScroll: true });
                window.scrollTo(0, homeScroll);
            }
            return;
        }
        heading.textContent = app?.名称 || titles[key];
        document.querySelector('.back-link').href = app?.parent || (Object.hasOwn(Life.titles, key) ? '#life' : '#');
        if (app) disposeDetail = Apps.render(body, key);
        else if (Object.hasOwn(Life.titles, key)) Life.render(body, key);
        else if (key === 'calendar') disposeDetail = renderCalendarDetail(body, CFG);
        else if (key === 'music') {
            music.classList.add('detail-player');
            body.appendChild(music);
            disposeDetail = renderMusicDetail(body, CFG, audio);
        } else renderContentDetail(body, CFG, key);
        body.scrollTop = 0;
        window.scrollTo(0, 0);
        heading.focus({ preventScroll: true });
    }

    audio.addEventListener('trackchange', () => {
        body.querySelectorAll('[data-track-url]').forEach(button => {
            const current = button.dataset.trackUrl === audio.src;
            button.classList.toggle('is-current', current);
            if (current) button.setAttribute('aria-current', 'true');
            else button.removeAttribute('aria-current');
        });
    });
    window.addEventListener('hashchange', route);
    route();
}

function detailEntry(title, metadata, note, cover) {
    const entry = el('article', 'detail-entry');
    const url = safeUrl(cover, MEDIA_PROTOCOLS);
    if (url) {
        const img = el('img', 'detail-cover');
        img.src = url;
        img.alt = `${title}封面`;
        img.loading = 'lazy';
        img.addEventListener('error', () => { img.hidden = true; });
        entry.appendChild(img);
    }
    const text = el('div', 'detail-entry-text');
    text.appendChild(el('h2', '', title));
    if (metadata) text.appendChild(el('p', 'detail-meta', metadata));
    if (note) text.appendChild(el('p', 'detail-note', note));
    entry.appendChild(text);
    return entry;
}

function renderContentDetail(body, CFG, key) {
    const items = key === 'quote'
        ? [CFG.quote, ...(CFG.quotes || [])].filter(item => item?.格言)
        : (CFG[key] || []);
    const toolbar = el('div', 'life-toolbar record-filter');
    const search = el('input', 'life-input');
    search.type = 'search'; search.placeholder = '搜索记录'; search.setAttribute('aria-label', '搜索记录');
    const filter = el('select', 'life-input'); filter.setAttribute('aria-label', '记录分类');
    const field = key === 'quote' ? '作者' : key === 'anniversary' ? '类型' : '状态';
    ['全部', ...new Set(items.map(item => item[field]).filter(Boolean))].forEach(value => {
        const option = el('option', '', value); option.value = value; filter.appendChild(option);
    });
    toolbar.append(search, filter); body.appendChild(toolbar);
    const summary = el('p', 'detail-summary'); body.appendChild(summary);
    const list = el('div', 'detail-entries');
    body.appendChild(list);
    function draw() {
        list.replaceChildren();
        const query = search.value.trim().toLowerCase();
        const matches = items.filter(item => Object.values(item).join(' ').toLowerCase().includes(query) && (filter.value === '全部' || item[field] === filter.value));
        summary.textContent = `显示 ${matches.length} / ${items.length} 条记录`;
        matches.forEach(item => {
            let entry;
            if (key === 'quote') {
                entry = detailEntry(item.格言, [item.作者, item.出处].filter(Boolean).join(' · '), item.说明);
                entry.classList.add('detail-quote');
            } else if (key === 'books') {
                entry = detailEntry(item.书名 || '未知书名', [item.作者, item.状态, item.进度].filter(Boolean).join(' · '), item.说明, item.封面);
                const value = parseFloat(item.进度);
                if (Number.isFinite(value)) {
                    const progress = el('progress', 'reading-progress');
                    progress.max = 100;
                    progress.value = Math.min(100, Math.max(0, value));
                    progress.setAttribute('aria-label', `${item.书名 || '书籍'}阅读进度`);
                    entry.querySelector('.detail-entry-text').appendChild(progress);
                }
            } else if (key === 'movies') {
                entry = detailEntry(item.片名 || '未知片名', [item.类型, item.状态, item.评分 ? `★ ${item.评分}` : ''].filter(Boolean).join(' · '), item.说明, item.封面);
            } else {
                const description = describeAnniversary(item, new Date());
                entry = detailEntry(item.事件 || '未命名', [item.日期, item.类型, item.重复].filter(Boolean).join(' · '), item.说明);
                if (description) entry.querySelector('.detail-entry-text').appendChild(el('p', description.accent ? 'detail-count is-accent' : 'detail-count', description.text));
            }
            list.appendChild(entry);
        });
        if (!matches.length) list.appendChild(el('p', 'detail-empty', '暂无匹配内容'));
    }
    search.addEventListener('input', draw); filter.addEventListener('change', draw); draw();
}

function renderMusicDetail(body, CFG, audio) {
    const formatTime = seconds => {
        const value = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
        return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
    };
    const timeline = el('div', 'music-timeline');
    const time = el('span');
    const seek = el('input'); seek.type = 'range'; seek.min = 0; seek.step = 1; seek.setAttribute('aria-label', '播放进度');
    const duration = el('span'); timeline.append(time, seek, duration); body.appendChild(timeline);
    const volumeRow = el('label', 'music-volume', '音量');
    const volume = el('input'); volume.type = 'range'; volume.min = 0; volume.max = 1; volume.step = 0.05; volume.value = audio.volume;
    volume.setAttribute('aria-label', '音量'); volume.addEventListener('input', () => { audio.volume = Number(volume.value); });
    volumeRow.appendChild(volume); body.appendChild(volumeRow);
    function sync() {
        time.textContent = formatTime(audio.currentTime); duration.textContent = formatTime(audio.duration);
        seek.max = Number.isFinite(audio.duration) ? audio.duration : 0;
        seek.value = audio.currentTime; seek.disabled = !Number.isFinite(audio.duration);
        seek.setAttribute('aria-valuetext', `${time.textContent} / ${duration.textContent}`);
    }
    seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value); });
    const events = ['timeupdate', 'durationchange', 'loadedmetadata', 'emptied'];
    events.forEach(event => audio.addEventListener(event, sync)); sync();
    const tracks = (CFG.playlist || []).filter(item => safeUrl(item.音频, MEDIA_PROTOCOLS));
    body.appendChild(el('p', 'detail-summary', `播放列表 · ${tracks.length} 首曲目`));
    const list = el('div', 'detail-entries');
    tracks.forEach((track, index) => {
        const button = el('button', 'track-row');
        button.type = 'button';
        button.dataset.trackUrl = safeUrl(track.音频, MEDIA_PROTOCOLS);
        button.setAttribute('aria-label', `播放${track.歌曲名 || '未知曲目'}`);
        button.appendChild(el('span', 'track-number', String(index + 1).padStart(2, '0')));
        const text = el('span', 'track-row-text');
        text.appendChild(el('span', '', track.歌曲名 || '未知曲目'));
        if (track.说明) text.appendChild(el('small', 'detail-meta', track.说明));
        button.appendChild(text);
        button.appendChild(el('span', 'track-action', '播放'));
        if (button.dataset.trackUrl === audio.src) {
            button.classList.add('is-current');
            button.setAttribute('aria-current', 'true');
        }
        button.addEventListener('click', () => audio.dispatchEvent(new CustomEvent('selecttrack', { detail: index })));
        list.appendChild(button);
    });
    if (!tracks.length) list.appendChild(el('p', 'detail-empty', '暂无曲目'));
    body.appendChild(list);
    return () => events.forEach(event => audio.removeEventListener(event, sync));
}

function renderCalendarDetail(body, CFG) {
    let selected = new Date();
    let month = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const today = dateKey(selected);
    const layout = el('div', 'calendar-detail-layout');
    const left = el('section', 'detail-calendar');
    left.setAttribute('aria-label', '选择日期');
    const right = el('section', 'detail-todos');
    right.setAttribute('aria-label', '当天待办');
    layout.append(left, right);
    body.appendChild(layout);

    function showTodos() {
        right.replaceChildren();
        const date = dateKey(selected);
        right.appendChild(el('p', 'detail-summary', selected.toLocaleDateString('zh-CN', { weekday: 'long' })));
        right.appendChild(el('h2', 'selected-date', date));
        const tasks = (CFG.todos || []).filter(task => task.日期 === date);
        right.appendChild(el('p', 'detail-meta', `${tasks.length} 项待办`));
        const list = el('ul', 'todo-list');
        tasks.forEach(task => {
            const done = task.状态 === '已完成';
            const row = el('li', done ? 'todo-item is-done' : 'todo-item');
            const mark = el('span', 'todo-mark', done ? '✓' : '○');
            mark.setAttribute('aria-label', done ? '已完成' : '待办');
            row.appendChild(mark);
            const text = el('div');
            text.appendChild(el('h3', '', task.内容 || '未命名待办'));
            if (task.时间) text.appendChild(el('p', 'detail-meta', task.时间));
            if (task.说明) text.appendChild(el('p', 'detail-note', task.说明));
            row.appendChild(text);
            list.appendChild(row);
        });
        if (!tasks.length) list.appendChild(el('li', 'detail-empty', '这一天暂无待办'));
        right.appendChild(list);
        const records = Life.calendarRecords(date);
        if (records.length) {
            right.appendChild(el('h3', 'detail-meta', '个人打卡'));
            records.forEach(record => {
                const row = el('div', 'todo-item is-done');
                row.appendChild(el('span', 'todo-mark', '✓'));
                const text = el('div'); text.appendChild(el('h3', '', record.name));
                if (record.note) text.appendChild(el('p', 'detail-note', record.note));
                row.appendChild(text); right.appendChild(row);
            });
        }
    }

    function draw(focusDate = false) {
        left.replaceChildren();
        const toolbar = el('div', 'calendar-toolbar');
        const label = el('h2', '', `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`);
        const controls = el('div', 'calendar-nav');
        [['上一月', '‹', -1], ['下一月', '›', 1]].forEach(([name, text, delta]) => {
            const button = el('button', '', text);
            button.type = 'button';
            button.setAttribute('aria-label', name);
            button.addEventListener('click', () => {
                month = new Date(month.getFullYear(), month.getMonth() + delta, 1);
                selected = new Date(month.getFullYear(), month.getMonth(), 1);
                draw(true);
            });
            controls.appendChild(button);
        });
        const reset = el('button', 'today-button', '今天');
        reset.type = 'button';
        reset.addEventListener('click', () => {
            selected = new Date();
            month = new Date(selected.getFullYear(), selected.getMonth(), 1);
            draw(true);
        });
        controls.appendChild(reset);
        toolbar.append(label, controls);
        left.appendChild(toolbar);
        const grid = el('div', 'detail-date-grid');
        ['日', '一', '二', '三', '四', '五', '六'].forEach(day => grid.appendChild(el('span', 'day-name', day)));
        const first = month.getDay();
        const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        for (let i = 0; i < first; i++) grid.appendChild(el('span'));
        for (let day = 1; day <= total; day++) {
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            const key = dateKey(date);
            const button = el('button', 'date-button', String(day));
            button.type = 'button';
            button.dataset.date = key;
            button.setAttribute('aria-label', key);
            button.setAttribute('aria-pressed', String(key === dateKey(selected)));
            if (key === today) button.setAttribute('aria-current', 'date');
            if ((CFG.todos || []).some(task => task.日期 === key) || Life.calendarRecords(key).length) {
                button.classList.add('has-todos');
                button.setAttribute('aria-label', `${key}，有待办`);
            }
            button.addEventListener('click', () => { selected = date; draw(true); });
            grid.appendChild(button);
        }
        left.appendChild(grid);
        showTodos();
        if (focusDate) grid.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
    }
    draw();
    const update = () => draw();
    document.addEventListener('lifechange', update);
    return () => document.removeEventListener('lifechange', update);
}
