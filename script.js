/* ============================================================
 *  页面运行逻辑
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
    // ---------- 1. 读取并解析 config.md ----------
    let CFG = {};
    try {
        CFG = parseConfig(await loadConfig());
        if (IS_DEV) window.CFG = CFG;
        log('已加载配置：', CFG);
    } catch (e) {
        console.error('无法读取 config.md', e);
        showNotice('无法读取 config.md。请通过 Web 服务器访问本页（如 VS Code Live Server、npx serve，或部署到线上）；直接双击打开 index.html 会被浏览器拦截。');
    }

    // ---------- 2. 各模块相互隔离：某一块出错不会拖垮整页 ----------
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
    // no-cache：每次都向服务器校验，保证「改完 config.md 刷新即生效」
    const res = await fetch('config.md', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
}

/* ============================================================
 *  工具函数
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

/**
 * 把配置里的路径/网址解析成「绝对 URL」，并按协议白名单校验。
 * - 相对路径（assets/x.jpg）按页面所在目录解析，子目录部署也正常
 * - 以 / 开头的按站点根目录解析
 * - javascript:、data: 等协议一律拒绝（含 "java\tscript:" 这类变形写法）
 */
function safeUrl(raw, allowed = LINK_PROTOCOLS) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    try {
        const u = new URL(s, document.baseURI);
        // 页面本身在 file:// 下时，相对路径会解析为 file:，同样放行
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
    let section = null;   // 列表段落为数组，其余为对象
    let block = null;     // 列表段落中正在收集的条目

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
            // 漏写空行时：同一个键再次出现，说明已经是下一条了
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

/** 把 HTML 里 data-cfg-link="名称" 的 <a> 指向 config.md 中同名链接 */
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
    probe.onerror = () => set(FALLBACK_IMG);   // 路径错误/图片损坏时用占位头像
    probe.src = url;
}

function applyWallpaper(CFG) {
    const url = safeUrl(CFG.assets?.壁纸, MEDIA_PROTOCOLS);
    // 写入绝对 URL：自定义属性里的相对路径会按 style.css 所在目录解析，容易错位
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

    if (t.壁纸模糊) {
        const m = String(t.壁纸模糊).trim().match(/^(\d+(?:\.\d+)?)(px|rem|em)?$/);
        if (m) root.style.setProperty('--bg-blur', m[1] + (m[2] || 'px'));
    }
}

/** 标题 + 网站图标取自配置 */
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
 *  社交链接：由 config.md 的 links 同时渲染侧边栏与底部栏
 * ============================================================ */
function sanitizeIcon(icon) {
    // 只允许 Font Awesome 的 class 名，避免把任意字符串写进 class
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
        .filter(l => {
            if (!l.url) log(`链接「${l.name}」的网址无效，已跳过：`, l.raw);
            return l.url;
        });

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
    fill(document.getElementById('bottom-dock'), 'dock-icon');
}

/* ============================================================
 *  日期工具
 * ============================================================ */
/** 把 YYYY-MM-DD 解析为「本地时区」的零点；非法日期（如 2024-02-31）返回 null */
function parseLocalDate(str) {
    const m = String(str || '').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
}

/** to 比 from 晚几天（可为负）。用 UTC 计算，不受夏令时影响 */
function daysBetween(from, to) {
    const utc = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((utc(to) - utc(from)) / 86400000);
}

/* ============================================================
 *  时钟 + 日历（跨天自动刷新日历与纪念日）
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

    const greetingFor = hour => {
        if (hour >= 5 && hour < 11) return '早上好';
        if (hour >= 11 && hour < 13) return '中午好';
        if (hour >= 13 && hour < 18) return '下午好';
        if (hour >= 18 && hour < 23) return '晚上好';
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

    // 「喜欢」状态按音频地址保存在本地
    const LIKE_KEY = 'homepage-liked-tracks';
    const readLiked = () => {
        try { return JSON.parse(localStorage.getItem(LIKE_KEY)) || []; } catch { return []; }
    };
    const writeLiked = list => {
        try { localStorage.setItem(LIKE_KEY, JSON.stringify(list)); } catch { /* 隐私模式等：忽略 */ }
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
        // 没有封面时要清掉上一首的封面
        if (playerArt) playerArt.style.backgroundImage = t.art ? cssUrl(t.art) : '';
        syncHeart();
    }

    async function play() {
        try {
            await audio.play();
        } catch (e) {
            // AbortError：快速切歌时上一次 play() 被打断，属于正常情况
            if (e.name !== 'AbortError') console.warn('播放被浏览器阻止或失败：', e);
        }
    }

    function step(delta) {
        loadTrack((current + delta + playlist.length) % playlist.length);
        play();
    }

    // 图标与播放状态由媒体事件驱动，不再手动同步，避免状态错位
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
        // 单曲且未开启循环：播完即停；多曲：自动下一首
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
 *  搜索（浮层，替代原来的 prompt()）
 * ============================================================ */
function initSearch(CFG) {
    const btn = document.getElementById('btn-search');
    const overlay = document.getElementById('search-overlay');
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    if (!btn || !overlay || !form || !input) return;

    const tmpl = CFG.settings?.搜索引擎 || DEFAULT_SEARCH;
    let lastFocus = null;

    const open = () => {
        lastFocus = document.activeElement;
        input.value = '';
        overlay.hidden = false;
        input.focus();
    };
    const close = () => {
        overlay.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    function buildUrl(q) {
        const encoded = encodeURIComponent(q);
        // 模板里没写 {query} 时，视为「前缀」，直接把关键词接在后面
        const raw = tmpl.includes('{query}') ? tmpl.replaceAll('{query}', encoded) : tmpl + encoded;
        return safeUrl(raw, ['http:', 'https:']);
    }

    btn.addEventListener('click', open);

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
        if (e.key === 'Escape' && !overlay.hidden) {
            close();
            return;
        }
        // 按 "/" 快速唤起搜索（正在输入时不触发）
        const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]');
        if (e.key === '/' && overlay.hidden && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            open();
        }
    });
}

/* ============================================================
 *  纪念日 / 书架 / 观影（用 DOM API 构建，配置文本不会被当作 HTML 解析）
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

/**
 * 计算纪念日显示文案。
 *  - 已过日：日期在过去 → 「已经历 N 天」；日期在未来 → 「还有 N 天」
 *  - 倒数日：日期在未来 → 「还有 N 天」；过去 → 「已过 N 天」
 *  - 可选字段「重复：每年」：倒数日/生日这类每年重复的日子，自动滚动到下一次
 */
function describeAnniversary(item, today) {
    const date = parseLocalDate(item['日期']);
    if (!date) return null;

    const type = item['类型'] || '已过日';
    let diff = daysBetween(today, date);   // 正数 = 在未来，负数 = 已过去

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
        // 只有「在读」才有意义显示进度；已读 100% / 想读 0% 是冗余信息
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
