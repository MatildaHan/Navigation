/* ============================================================
 *  页面运行逻辑（无锁屏 + 路径自动规范化版）
 * ============================================================
 *  关键特性：
 *  - 不需要锁屏，打开即进入主界面
 *  - 所有图片路径自动规范化：无论 config.md 里写不写 "/"，
 *    都会自动补全为从网站根目录出发的绝对路径
 *  - 兼容绝对路径（/xxx.jpg）、相对路径（assets/xxx.jpg）、
 *    网络图片（https://...）
 * ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // ---------- 1. 读取并解析 config.md ----------
    let rawConfig = '';
    try {
        const res = await fetch('/config.md');
        rawConfig = await res.text();
    } catch (e) {
        console.error('无法读取 config.md，请确认已使用本地服务器运行。', e);
        return;
    }

    const CFG = parseConfig(rawConfig);
    console.log('已加载配置：', CFG);
    window.CFG = CFG;   // 挂到 window，方便在 F12 Console 里调试

    // ---------- 2. 应用配置到 DOM ----------
    applyText(CFG);
    applyHref(CFG);
    applyImg(CFG);
    applyBg(CFG);
    applyTheme(CFG);

    // ---------- 3. 时钟 + 日历 ----------
    initClockAndCalendar(CFG);

    // ---------- 4. 音乐播放器 ----------
    initMusicPlayer(CFG);

    // ---------- 5. 搜索 ----------
    initSearch(CFG);

    // ---------- 6. 渲染纪念日 / 书架 / 观影 ----------
    renderAnniversary(CFG.anniversary);
    renderBooks(CFG.books);
    renderMovies(CFG.movies);
});

/* ============================================================
 *  🧰 通用工具函数
 * ============================================================ */

/**
 * 路径规范化：
 * - 空值 → null
 * - 已带 "/" 或 "http" 开头 → 原样返回
 * - 其他情况（相对路径）→ 前面自动加 "/"
 *
 * 目的：让 config.md 里写 "assets/xxx.jpg" 或 "/assets/xxx.jpg"
 *      都能正确解析为从网站根目录出发的绝对路径。
 */
function normalizePath(p) {
    if (!p) return null;
    const s = String(p).trim();
    if (!s) return null;
    if (s.startsWith('http') || s.startsWith('/')) return s;
    return '/' + s;
}

/* ============================================================
 *  配置解析器
 *  支持两种结构：
 *  1. 键值型（如 profile / quote / theme）→ 返回对象
 *  2. 列表型（如 links / anniversary / books / movies / playlist）→ 返回对象数组
 * ============================================================ */
function parseConfig(mdText) {
    const lines = mdText.split('\n');
    const result = {};
    let currentSection = null;
    let currentSectionName = null;
    let currentBlock = null;

    const listSections = ['links', 'anniversary', 'books', 'movies', 'playlist'];

    lines.forEach(line => {
        const trimmed = line.trim();

        // 空行：结束当前数据块
        if (!trimmed) {
            if (currentBlock && Array.isArray(currentSection)) {
                currentSection.push(currentBlock);
                currentBlock = null;
            }
            return;
        }

        // 注释行：跳过
        if (trimmed.startsWith('#')) return;

        // 检测 --- xxx --- 模块分隔
        const sectionMatch = trimmed.match(/^---\s*(.+?)\s*---$/);
        if (sectionMatch) {
            if (currentBlock && Array.isArray(currentSection)) {
                currentSection.push(currentBlock);
                currentBlock = null;
            }

            currentSectionName = sectionMatch[1];

            if (listSections.includes(currentSectionName)) {
                currentSection = [];
                result[currentSectionName] = currentSection;
            } else {
                currentSection = {};
                result[currentSectionName] = currentSection;
            }
            return;
        }

        if (!currentSection) return;

        // 解析 "键：值"
        const kvMatch = trimmed.match(/^([^：:]+)[：:]\s*(.+)$/);
        if (!kvMatch) return;
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();

        if (Array.isArray(currentSection)) {
            if (!currentBlock) currentBlock = {};
            currentBlock[key] = value;
        } else {
            currentSection[key] = value;
        }
    });

    // 收尾最后一个 block
    if (currentBlock && Array.isArray(currentSection)) {
        currentSection.push(currentBlock);
    }

    return result;
}

/* ============================================================
 *  应用文本 / 链接 / 图片 / 背景
 * ============================================================ */
function applyText(CFG) {
    const map = {
        'profile.name': CFG.profile?.昵称,
        'greetings.sub': CFG.greetings?.副标题,
        'quote.text': CFG.quote?.格言,
        'quote.author': CFG.quote?.作者,
    };
    document.querySelectorAll('[data-cfg-text]').forEach(el => {
        const v = map[el.dataset.cfgText];
        if (v != null) el.textContent = v;
    });
}

function applyHref(CFG) {
    const links = CFG.links || [];
    const findUrl = (keyword) => {
        const item = links.find(l => l['名称'] && l['名称'].includes(keyword));
        return item ? item['网址'] : null;
    };
    const map = {
        'links.blog': findUrl('博客'),
        'links.bilibili': findUrl('B站'),
        'links.github': findUrl('GitHub'),
        'links.qqGroup': findUrl('QQ群'),
        'links.email': findUrl('邮箱'),
        'links.rss': findUrl('RSS'),
    };
    document.querySelectorAll('[data-cfg-href]').forEach(el => {
        const v = map[el.dataset.cfgHref];
        if (v) el.href = v;
    });
}

function applyImg(CFG) {
    // 头像和角色图也走路径规范化
    const rawMap = {
        'profile.avatar': CFG.profile?.头像网址,
        'assets.character': CFG.assets?.角色图,
    };
    const map = {};
    Object.keys(rawMap).forEach(k => {
        map[k] = normalizePath(rawMap[k]);
    });

    document.querySelectorAll('[data-cfg-img]').forEach(el => {
        const v = map[el.dataset.cfgImg];
        if (v) el.src = v;
    });
}

function applyBg(CFG) {
    // 头像背景
    const avatar = normalizePath(CFG.profile?.头像网址);
    document.querySelectorAll('[data-cfg-bg]').forEach(el => {
        const rawMap = { 'profile.avatar': avatar };
        const v = rawMap[el.dataset.cfgBg];
        if (v) el.style.backgroundImage = `url('${v}')`;
    });

    // 写入 CSS 变量（全部规范化）
    const root = document.documentElement;

    const wallpaper = normalizePath(CFG.assets?.壁纸);
    if (wallpaper) root.style.setProperty('--bg-wallpaper', `url('${wallpaper}')`);

    const g1 = normalizePath(CFG.assets?.画廊1);
    if (g1) root.style.setProperty('--bg-gallery1', `url('${g1}')`);

    const g2 = normalizePath(CFG.assets?.画廊2);
    if (g2) root.style.setProperty('--bg-gallery2', `url('${g2}')`);

    const g3 = normalizePath(CFG.assets?.画廊3);
    if (g3) root.style.setProperty('--bg-gallery3', `url('${g3}')`);
}

/* ============================================================
 *  应用主题
 * ============================================================ */
function applyTheme(CFG) {
    const t = CFG.theme;
    if (!t) return;
    const root = document.documentElement;
    if (t.强调色相) root.style.setProperty('--accent-hue', t.强调色相);
    if (t.玻璃背景) root.style.setProperty('--glass-bg', t.玻璃背景);
    if (t.玻璃边框) root.style.setProperty('--glass-border', t.玻璃边框);
    if (t.玻璃阴影) root.style.setProperty('--glass-shadow', t.玻璃阴影);
    if (t.主文本色) root.style.setProperty('--text-primary', t.主文本色);
    if (t.次文本色) root.style.setProperty('--text-secondary', t.次文本色);
}

/* ============================================================
 *  时钟 + 日历
 * ============================================================ */
function initClockAndCalendar(CFG) {
    function updateClock() {
        const now = new Date();
        const hh = now.getHours().toString().padStart(2, '0');
        const mm = now.getMinutes().toString().padStart(2, '0');
        const hour = now.getHours();

        const clockEl = document.getElementById('live-clock');
        const dateEl = document.getElementById('live-date');
        if (clockEl) clockEl.textContent = `${hh}:${mm}`;
        if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { weekday: 'long', month: '2-digit', day: '2-digit' });

        // 按时间动态问候
        const name = CFG.profile?.昵称 || '';
        let greeting = '';
        if (hour >= 5 && hour < 11) greeting = '早上好';
        else if (hour >= 11 && hour < 13) greeting = '中午好';
        else if (hour >= 13 && hour < 18) greeting = '下午好';
        else greeting = '晚上好';

        const greetEl = document.getElementById('dynamic-greeting');
        if (greetEl) greetEl.textContent = `${greeting}，这里是${name}！`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // 生成当月日历
    const now = new Date();
    const monthNames = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
    const monthEl = document.getElementById('calendar-month');
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    if (monthEl) monthEl.textContent = monthNames[now.getMonth()];

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('span'));
    for (let d = 1; d <= totalDays; d++) {
        const span = document.createElement('span');
        span.textContent = d;
        if (d === now.getDate()) span.classList.add('active');
        grid.appendChild(span);
    }
}

/* ============================================================
 *  音乐播放器
 * ============================================================ */
function initMusicPlayer(CFG) {
    const playlist = (CFG.playlist || []).map(item => ({
        title: item['歌曲名'],
        url: normalizePath(item['音频']),
        art: normalizePath(item['封面'])
    }));
    if (playlist.length === 0) return;

    const audio = document.getElementById('main-audio');
    const playBtn = document.getElementById('play-btn');
    const trackTitle = document.getElementById('track-title');
    const playerArt = document.getElementById('player-art');
    const btnRepeat = document.getElementById('btn-repeat');
    const btnHeart = document.getElementById('btn-heart');

    if (!audio || !playBtn) return;

    let current = 0;
    let isLooping = false;

    function loadTrack(i) {
        const t = playlist[i];
        if (!t) return;
        if (t.url) audio.src = t.url;
        if (trackTitle) trackTitle.textContent = t.title;
        if (t.art && playerArt) playerArt.style.backgroundImage = `url('${t.art}')`;
    }

    function togglePlay() {
        if (audio.paused) {
            audio.play().then(() => playBtn.classList.replace('fa-play', 'fa-pause')).catch(e => console.log(e));
        } else {
            audio.pause();
            playBtn.classList.replace('fa-pause', 'fa-play');
        }
    }

    playBtn.addEventListener('click', e => { e.stopPropagation(); togglePlay(); });

    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    if (btnNext) btnNext.addEventListener('click', e => {
        e.stopPropagation();
        current = (current + 1) % playlist.length;
        loadTrack(current); togglePlay();
    });
    if (btnPrev) btnPrev.addEventListener('click', e => {
        e.stopPropagation();
        current = (current - 1 + playlist.length) % playlist.length;
        loadTrack(current); togglePlay();
    });
    if (btnRepeat) btnRepeat.addEventListener('click', e => {
        e.stopPropagation();
        isLooping = !isLooping;
        audio.loop = isLooping;
        btnRepeat.classList.toggle('active-btn', isLooping);
    });
    if (btnHeart) btnHeart.addEventListener('click', e => {
        e.stopPropagation();
        btnHeart.classList.toggle('liked');
    });
    audio.addEventListener('ended', () => { if (!isLooping && btnNext) btnNext.click(); });

    loadTrack(current);
}

/* ============================================================
 *  搜索
 * ============================================================ */
function initSearch(CFG) {
    const btn = document.getElementById('btn-search');
    if (!btn) return;
    const tmpl = CFG.settings?.搜索引擎 || 'https://www.google.com/search?q={query}';
    btn.addEventListener('click', () => {
        const q = prompt('搜索内容：');
        if (!q) return;
        window.open(tmpl.replace('{query}', encodeURIComponent(q)), '_blank');
    });
}

/* ============================================================
 *  渲染纪念日 / 书架 / 观影
 * ============================================================ */
function renderAnniversary(list) {
    const ul = document.getElementById('anniversary-list');
    if (!ul || !list) return;
    const today = new Date(); today.setHours(0,0,0,0);

    ul.innerHTML = list.map(item => {
        const event = item['事件'] || '未命名';
        const dateStr = item['日期'];
        const type = item['类型'] || '已过日';
        const target = new Date(dateStr);
        const diffDays = Math.ceil(Math.abs(today - target) / (1000 * 60 * 60 * 24));
        const dayText = type === '倒数日' ? `还有 ${diffDays} 天` : `已经历 ${diffDays} 天`;
        const color = type === '倒数日' ? 'hsl(var(--accent-hue),70%,60%)' : 'rgba(255,255,255,0.6)';
        return `<li><span>${event}</span><strong style="color:${color}">${dayText}</strong></li>`;
    }).join('');
}

function renderBooks(list) {
    const ul = document.getElementById('book-list');
    if (!ul || !list) return;
    ul.innerHTML = list.map(item => {
        const title = item['书名'] || '未知书名';
        const author = item['作者'] || '佚名';
        const status = item['状态'] || '';
        const progress = item['进度'] || '';
        return `<li>
            <span>${title}<br><small style="opacity:0.6">${author}</small></span>
            <span style="color:hsl(var(--accent-hue),70%,60%)">${status} ${progress}</span>
        </li>`;
    }).join('');
}

function renderMovies(list) {
    const ul = document.getElementById('movie-list');
    if (!ul || !list) return;
    ul.innerHTML = list.map(item => {
        const title = item['片名'] || '未知片名';
        const type = item['类型'] || '';
        const rating = item['评分'] || 'N/A';
        const status = item['状态'] || '';
        return `<li>
            <span>${title}<br><small style="opacity:0.6">${type} · ${status}</small></span>
            <span style="color:hsl(var(--accent-hue),70%,60%)">★ ${rating}</span>
        </li>`;
    }).join('');
}
