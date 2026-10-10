'use strict';

/* 内容分页只移动网格，主页和播放器节点保持原样。 */
function initDeck() {
    const deck = document.getElementById('card-pages');
    const pages = [...deck.children];
    const links = [...document.querySelectorAll('[data-page]')];
    const hashes = ['', 'life', 'games'];
    let page = 0;
    let scrollTimer;
    let drag = null;
    let suppressClick = false;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    function setPage(index) {
        page = Math.max(0, Math.min(pages.length - 1, index));
        pages.forEach((node, i) => { node.inert = i !== page; });
        links.forEach((link, i) => {
            if (i === page) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        document.getElementById('page-status').textContent = `第 ${page + 1} 页，共 ${pages.length} 页`;
        deck.scrollTo({ left: page * deck.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    deck.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            if (document.getElementById('home-pages').hidden || !deck.clientWidth || drag) return;
            const index = Math.round(deck.scrollLeft / deck.clientWidth);
            if (index !== page) location.hash = hashes[index];
        }, 140);
    });
    deck.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, input, textarea, select')) return;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: deck.scrollLeft, moved: false };
    });
    deck.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x;
        if (!drag.moved && (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(event.clientY - drag.y))) return;
        drag.moved = true;
        deck.classList.add('is-dragging');
        suppressClick = true;
        deck.setPointerCapture(event.pointerId);
        deck.style.scrollSnapType = 'none';
        deck.scrollLeft = drag.start - dx;
        event.preventDefault();
    });
    function endDrag(event) {
        if (!drag || drag.id !== event.pointerId) return;
        const moved = drag.moved;
        const dx = event.clientX - drag.x;
        drag = null;
        deck.classList.remove('is-dragging');
        deck.style.scrollSnapType = '';
        if (moved) {
            const index = Math.max(0, Math.min(pages.length - 1, page + (Math.abs(dx) > 60 ? (dx < 0 ? 1 : -1) : 0)));
            if (index !== page) location.hash = hashes[index];
            else setPage(index);
            setTimeout(() => { suppressClick = false; }, 0);
        }
    }
    deck.addEventListener('pointerup', endDrag);
    deck.addEventListener('pointercancel', endDrag);
    deck.addEventListener('dragstart', event => { if (drag) event.preventDefault(); });
    deck.addEventListener('click', event => {
        if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    deck.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target.closest('input, textarea, select')) return;
        event.preventDefault();
        const index = Math.max(0, Math.min(pages.length - 1, page + (event.key === 'ArrowRight' ? 1 : -1)));
        location.hash = hashes[index];
        links[index].focus({ preventScroll: true });
    });
    new ResizeObserver(() => {
        if (deck.clientWidth) deck.scrollTo({ left: page * deck.clientWidth, behavior: 'instant' });
    }).observe(deck.parentElement);
    window.deckController = { setPage };
}

function initLifeModules(CFG) { Life.init(CFG); }

const Life = (() => {
    const KEY = 'navigation-life-v1';
    const BACKUP = 'navigation-life-backup-v1';
    const titles = { tools: '工具箱', checkin: '今日打卡', habits: '习惯养成', focus: '专注计时', notes: '随手记', projects: '目标与项目', wishlist: '愿望清单' };
    let CFG = {};
    let state;
    let noteEdit = '';
    let exportUrl = null;
    let updateNotesList = null;
    const noteDrafts = new Map();
    let selectedCheckin = dateKey(new Date());
    const filters = { tools: { query: '', category: '全部分类', saved: false }, projects: '全部目标', wishlist: { category: '全部分类', status: '全部愿望' }, notes: { query: '', deleted: false } };
    const clone = value => JSON.parse(JSON.stringify(value));
    const validId = value => typeof value === 'string' && /^[\w-]{1,64}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
    const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !!parseLocalDate(value);
    const minutes = mode => Math.floor(Math.min(180, Math.max(1, Number(CFG.focus?.[mode === 'focus' ? '专注分钟' : '休息分钟']) || (mode === 'focus' ? 25 : 5))));
    const blankTimer = (mode = 'focus') => ({ mode, remaining: minutes(mode) * 60, total: minutes(mode) * 60, deadline: 0, running: false });
    const blank = () => ({ version: 1, checkins: {}, notes: [], favorites: [], steps: {}, wishes: {}, sessions: [], timer: blankTimer() });

    function validate(raw) {
        if (!raw || raw.version !== 1 || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('记录格式或版本不正确');
        const result = blank();
        const object = value => value && typeof value === 'object' && !Array.isArray(value);
        if (!object(raw.checkins) || !Array.isArray(raw.notes) || !Array.isArray(raw.favorites) || !object(raw.steps) || !object(raw.wishes) || !Array.isArray(raw.sessions)) throw new Error('记录结构不完整');
        if (Object.keys(raw.checkins).length > 3660 || raw.notes.length > 500 || raw.sessions.length > 5000) throw new Error('记录数量超出限制');
        for (const [day, entries] of Object.entries(raw.checkins)) {
            if (!validDate(day) || !object(entries) || Object.keys(entries).length > 100) throw new Error('打卡日期或项目无效');
            result.checkins[day] = {};
            for (const [id, record] of Object.entries(entries)) {
                if (!validId(id) || !object(record) || typeof record.done !== 'boolean' || typeof record.note !== 'string' || record.note.length > 1000) throw new Error('打卡记录无效');
                result.checkins[day][id] = { done: record.done, note: record.note };
            }
        }
        result.notes = raw.notes.map(note => {
            if (!object(note) || !validId(note.id) || typeof note.text !== 'string' || note.text.length > 5000 || typeof note.tag !== 'string' || note.tag.length > 50 || !Number.isFinite(note.created) || !Number.isFinite(new Date(note.created).getTime()) || note.created < 0 || typeof note.deleted !== 'boolean') throw new Error('随手记无效');
            return { id: note.id, text: note.text, tag: note.tag, created: note.created, deleted: note.deleted };
        });
        if (new Set(result.notes.map(note => note.id)).size !== result.notes.length) throw new Error('随手记标识重复');
        result.favorites = [...new Set(raw.favorites.filter(validId))];
        for (const key of ['steps', 'wishes']) for (const [id, done] of Object.entries(raw[key])) {
            if (!/^[\w:-]{1,130}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id) || typeof done !== 'boolean') throw new Error('完成状态无效');
            result[key][id] = done;
        }
        result.sessions = raw.sessions.map(session => {
            if (!object(session) || !validId(session.id) || !validDate(session.date) || !Number.isFinite(session.minutes) || session.minutes < 1 || session.minutes > 180) throw new Error('专注记录无效');
            return { id: session.id, date: session.date, minutes: session.minutes };
        });
        if (new Set(result.sessions.map(session => session.id)).size !== result.sessions.length) throw new Error('专注记录标识重复');
        if (raw.timer) {
            const t = raw.timer;
            if (!['focus', 'break'].includes(t.mode) || typeof t.running !== 'boolean' || !Number.isFinite(t.remaining) || t.remaining < 0 || t.remaining > 10800 || !Number.isFinite(t.deadline) || t.deadline < 0 || t.deadline > Date.now() + 10800000 || t.running && t.deadline === 0) throw new Error('计时状态无效');
            const total = t.total ?? minutes(t.mode) * 60;
            if (!Number.isFinite(total) || total < 60 || total > 10800 || t.remaining > total) throw new Error('计时总时长无效');
            result.timer = { mode: t.mode, running: t.running, remaining: t.remaining, total, deadline: t.deadline };
        }
        if (new TextEncoder().encode(JSON.stringify(result)).length > 2 * 1024 * 1024) throw new Error('记录不能超过 2 MB，请先整理记录或导出备份');
        return result;
    }

    function commit(update) {
        const next = clone(state);
        try { update(next); localStorage.setItem(KEY, JSON.stringify(validate(next))); }
        catch (error) { showNotice(`未能保存记录：${error.message}。请检查浏览器存储，或先导出备份。`); return false; }
        state = next;
        refresh();
        document.dispatchEvent(new CustomEvent('lifechange'));
        return true;
    }

    function items(key) {
        const seen = new Set();
        return (CFG[key] || []).filter(item => {
            if (!validId(item.标识) || seen.has(item.标识)) return false;
            seen.add(item.标识);
            return true;
        });
    }
    function activities() {
        const list = items('checkins');
        items('habits').forEach(item => { if (!list.some(entry => entry.标识 === item.标识)) list.push(item); });
        return list;
    }
    const record = (day, id) => state.checkins[day]?.[id] || { done: false, note: '' };
    function setRecord(day, id, value) {
        if (!validDate(day) || day > dateKey(new Date()) || !validId(id)) return false;
        return commit(next => { (next.checkins[day] ||= {})[id] = value; });
    }
    function days(count, end = new Date()) {
        return Array.from({ length: count }, (_, i) => {
            const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - count + 1 + i);
            return dateKey(date);
        });
    }
    function weekCount(id) {
        const now = new Date();
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
        return Array.from({ length: 7 }, (_, i) => dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i))).filter(day => record(day, id).done).length;
    }
    function streak(id) {
        const recent = days(3660).reverse();
        if (!record(recent[0], id).done) recent.shift();
        const firstMissing = recent.findIndex(day => !record(day, id).done);
        return firstMissing === -1 ? recent.length : firstMissing;
    }
    const target = item => Math.floor(Math.min(7, Math.max(1, Number(item.每周目标) || 1)));
    const steps = project => items('steps').filter(step => step.项目 === project.标识);
    const stepDone = (project, step) => state.steps[`${project.标识}:${step.标识}`] ?? (step.状态 === '已完成');
    const wishDone = item => state.wishes[item.标识] ?? (item.状态 === '已完成');
    const remaining = () => state.timer.running ? Math.max(0, Math.ceil((state.timer.deadline - Date.now()) / 1000)) : state.timer.remaining;
    const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const todaySessions = () => state.sessions.filter(item => item.date === dateKey(new Date()));

    function timerAction(action) {
        if (state.timer.running && remaining() === 0) { tick(); return; }
        commit(next => {
            if (action === 'reset') next.timer = blankTimer(next.timer.mode);
            else if (action === 'mode') next.timer = blankTimer(next.timer.mode === 'focus' ? 'break' : 'focus');
            else if (next.timer.running) { next.timer.remaining = remaining(); next.timer.deadline = 0; next.timer.running = false; }
            else { next.timer.remaining ||= minutes(next.timer.mode) * 60; next.timer.deadline = Date.now() + next.timer.remaining * 1000; next.timer.running = true; }
        });
    }
    function tick() {
        if (state.timer.running && remaining() === 0) {
            commit(next => {
                const timer = next.timer;
                if (timer.mode === 'focus') next.sessions.push({ id: `s-${timer.deadline}`, date: dateKey(new Date(timer.deadline)), minutes: timer.total / 60 });
                next.timer = blankTimer(timer.mode === 'focus' ? 'break' : 'focus');
            });
            const status = document.querySelector('#focus-message');
            if (status) status.textContent = state.timer.mode === 'break' ? '本轮专注已完成，可以休息了。' : '休息结束，可以开始下一轮。';
        }
        document.querySelectorAll('[data-focus-clock]').forEach(node => { node.textContent = clock(remaining()); });
        document.querySelectorAll('[data-focus-toggle]').forEach(button => { button.textContent = state.timer.running ? '暂停' : '开始'; });
        document.querySelectorAll('[data-focus-mode]').forEach(node => { node.textContent = state.timer.mode === 'focus' ? '专注' : '休息'; });
    }

    function button(text, action, className = 'action-button') {
        const node = el('button', className, text);
        node.type = 'button';
        node.addEventListener('click', action);
        return node;
    }
    function toggle(text, checked, action) {
        const node = button(`${checked ? '✓' : '○'} ${text}`, action, 'toggle-row');
        node.setAttribute('aria-pressed', String(checked));
        return node;
    }
    function meter(value, max, label) {
        const progress = el('progress', 'reading-progress');
        progress.max = max || 1; progress.value = value;
        progress.setAttribute('aria-label', label);
        return progress;
    }
    function panel(title, meta, note) { return detailEntry(title, meta, note); }
    function controls(body) { const bar = el('div', 'life-toolbar'); body.appendChild(bar); return bar; }
    function select(label, values) {
        const node = el('select', 'life-input');
        node.setAttribute('aria-label', label);
        values.forEach(value => { const option = el('option', '', value); option.value = value; node.appendChild(option); });
        return node;
    }
    function searchField(label) {
        const input = el('input', 'life-input');
        input.type = 'search'; input.placeholder = label; input.setAttribute('aria-label', label);
        return input;
    }
    function preview(key, text, lines = []) {
        const node = document.getElementById(`${key}-preview`);
        node.replaceChildren();
        if (text) node.appendChild(el('p', 'preview-stat', text));
        lines.slice(0, 3).forEach(line => node.appendChild(el('p', 'preview-line', line)));
        return node;
    }
    function renderHome() {
        const tools = items('tools').filter(item => safeUrl(item.网址, ['https:', 'http:']));
        const toolsBox = preview('tools', `${tools.length} 个常用工具`);
        const toolLinks = el('div', 'preview-tools');
        tools.slice(0, 4).forEach(item => {
            const a = el('a', '', item.名称); a.href = Apps.toolRoute(item) || safeUrl(item.网址, ['https:', 'http:']); if (!Apps.toolRoute(item)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } toolLinks.appendChild(a);
        });
        toolsBox.appendChild(toolLinks);
        const today = dateKey(new Date());
        const activity = activities();
        const checkBox = preview('checkin', `${activity.filter(item => record(today, item.标识).done).length} / ${activity.length} 已完成`);
        const quick = el('div', 'quick-checkins');
        activity.slice(0, 3).forEach(item => quick.appendChild(toggle(item.名称, record(today, item.标识).done, () => setRecord(today, item.标识, { ...record(today, item.标识), done: !record(today, item.标识).done }))));
        checkBox.appendChild(quick);
        preview('habits', '本周进度', items('habits').map(item => `${item.名称} · ${weekCount(item.标识)} / ${target(item)} 天`));
        const focusBox = preview('focus', '');
        const display = el('p', 'focus-preview-time', clock(remaining())); display.dataset.focusClock = ''; focusBox.appendChild(display);
        const mode = el('span', 'preview-line', state.timer.mode === 'focus' ? '专注' : '休息'); mode.dataset.focusMode = ''; focusBox.appendChild(mode);
        const start = button(state.timer.running ? '暂停' : '开始', () => timerAction('toggle')); start.dataset.focusToggle = ''; focusBox.appendChild(start);
        preview('notes', `${state.notes.filter(note => !note.deleted).length + items('notes').length} 条记录`, [...state.notes.filter(note => !note.deleted).slice().reverse().map(note => note.text), ...items('notes').map(note => note.内容)]);
        preview('projects', `${items('projects').length} 个目标`, items('projects').map(project => `${project.名称} · ${steps(project).filter(step => stepDone(project, step)).length}/${steps(project).length}`));
        preview('wishlist', `${items('wishlist').filter(wishDone).length} / ${items('wishlist').length} 已实现`, items('wishlist').filter(item => !wishDone(item)).map(item => item.名称));
    }

    function refresh() {
        const focused = document.activeElement?.id;
        const body = document.getElementById('detail-body');
        const scroll = body.scrollTop;
        renderHome();
        const key = location.hash.slice(1);
        if (Object.hasOwn(titles, key) && key !== 'notes') render(body, key);
        body.scrollTop = scroll;
        if (focused) (document.getElementById(focused) || document.getElementById('detail-title'))?.focus({ preventScroll: true });
        tick();
    }

    function renderTools(body) {
        const bar = controls(body), input = searchField('搜索工具');
        const category = select('工具分类', ['全部分类', ...new Set(items('tools').map(item => item.分类).filter(Boolean))]);
        input.value = filters.tools.query; category.value = filters.tools.category;
        const favorites = button('只看收藏', () => { filters.tools.saved = !filters.tools.saved; favorites.setAttribute('aria-pressed', String(filters.tools.saved)); draw(); });
        favorites.setAttribute('aria-pressed', String(filters.tools.saved)); bar.append(input, category, favorites);
        const list = el('div'); body.appendChild(list);
        function draw() {
            list.replaceChildren();
            const query = input.value.trim().toLowerCase();
            filters.tools.query = input.value; filters.tools.category = category.value;
            const matches = items('tools').filter(item => safeUrl(item.网址, ['http:', 'https:']) && `${item.名称} ${item.说明 || ''}`.toLowerCase().includes(query) && (category.value === '全部分类' || category.value === item.分类) && (favorites.getAttribute('aria-pressed') !== 'true' || state.favorites.includes(item.标识)));
            matches.forEach(item => {
                const entry = panel(item.名称, item.分类, item.说明);
                const actions = el('div', 'entry-actions');
                const a = el('a', 'action-button', '打开工具'); a.href = Apps.toolRoute(item) || safeUrl(item.网址, ['http:', 'https:']); if (!Apps.toolRoute(item)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } actions.appendChild(a);
                const saved = state.favorites.includes(item.标识);
                const favorite = toggle('收藏', saved, () => { commit(next => { next.favorites = saved ? next.favorites.filter(id => id !== item.标识) : [...next.favorites, item.标识]; }); });
                favorite.id = `favorite-${item.标识}`;
                actions.appendChild(favorite); entry.querySelector('.detail-entry-text').appendChild(actions); list.appendChild(entry);
            });
            if (!matches.length) list.appendChild(el('p', 'detail-empty', '没有匹配的工具'));
        }
        input.addEventListener('input', draw); category.addEventListener('change', draw); draw();
    }

    function addDataControls(body) {
        const bar = controls(body);
        bar.appendChild(button('导出记录', () => {
            if (exportUrl) URL.revokeObjectURL(exportUrl);
            const json = JSON.stringify(state, null, 2);
            exportUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
            body.querySelector('.backup-panel')?.remove();
            const panel = el('section', 'backup-panel');
            const a = el('a', 'action-button', '下载备份（JSON）'); a.href = exportUrl; a.download = `navigation-${dateKey(new Date())}.json`;
            const details = el('details'); details.appendChild(el('summary', 'detail-meta', '查看备份内容'));
            const content = el('textarea', 'life-input'); content.readOnly = true; content.rows = 6; content.value = json; content.setAttribute('aria-label', '记录备份内容');
            details.appendChild(content); panel.append(a, details); body.appendChild(panel); panel.scrollIntoView({ block: 'nearest' });
        }));
        const input = el('input'); input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
        bar.append(button('导入记录', () => input.click()), input);
        input.addEventListener('change', async () => {
            const file = input.files[0]; if (!file) return;
            try {
                if (file.size > 2 * 1024 * 1024) throw new Error('文件不能超过 2 MB');
                const next = validate(JSON.parse(await file.text())); next.timer = blankTimer();
                localStorage.setItem(BACKUP, JSON.stringify(state));
                if (commit(draft => Object.assign(draft, next))) { noteEdit = ''; noteDrafts.clear(); render(body, 'checkin'); }
            } catch (error) { showNotice(`导入失败：${error.message}`); }
        });
        bar.appendChild(button('恢复导入前记录', () => {
            try {
                const saved = localStorage.getItem(BACKUP); if (!saved) { showNotice('暂无导入前的备份。'); return; }
                const backup = validate(JSON.parse(saved)); backup.timer = blankTimer();
                if (commit(next => Object.assign(next, backup))) { noteDrafts.clear(); render(body, 'checkin'); }
            } catch (error) { showNotice(`恢复失败：${error.message}`); }
        }));
    }

    function renderCheckin(body) {
        const bar = controls(body);
        const date = el('input', 'life-input'); date.type = 'date'; date.id = 'checkin-date'; date.max = dateKey(new Date()); date.value = selectedCheckin; date.setAttribute('aria-label', '打卡日期');
        date.addEventListener('change', () => { if (validDate(date.value) && date.value <= date.max) { selectedCheckin = date.value; render(body, 'checkin'); } });
        bar.appendChild(date);
        body.appendChild(el('p', 'detail-summary', `${selectedCheckin} · ${activities().filter(item => record(selectedCheckin, item.标识).done).length} 项已完成`));
        activities().forEach(item => {
            const data = record(selectedCheckin, item.标识);
            const entry = panel(item.名称, '', item.说明);
            const text = entry.querySelector('.detail-entry-text');
            const action = toggle(data.done ? '已打卡，点击撤销' : '打卡', data.done, () => setRecord(selectedCheckin, item.标识, { ...record(selectedCheckin, item.标识), done: !data.done }));
            action.id = `check-${item.标识}`; text.appendChild(action);
            const draftKey = `${selectedCheckin}:${item.标识}`;
            const note = el('input', 'life-input'); note.value = noteDrafts.get(draftKey) ?? data.note; note.maxLength = 1000; note.placeholder = '一句备注'; note.setAttribute('aria-label', `${item.名称}打卡备注`);
            note.addEventListener('input', () => noteDrafts.set(draftKey, note.value));
            const save = button('保存备注', () => {
                const draft = note.value; noteDrafts.delete(draftKey);
                if (!setRecord(selectedCheckin, item.标识, { ...record(selectedCheckin, item.标识), note: draft.trim() })) noteDrafts.set(draftKey, draft);
            });
            const form = el('div', 'entry-actions'); form.append(note, save); text.appendChild(form); body.appendChild(entry);
        });
        if (!activities().length) body.appendChild(el('p', 'detail-empty', '暂无打卡项目'));
        const history = panel('最近 7 天', '', '');
        days(7).reverse().forEach(day => history.querySelector('.detail-entry-text').appendChild(el('p', 'detail-meta', `${day} · ${activities().filter(item => record(day, item.标识).done).length} 项完成`)));
        body.appendChild(history);
        addDataControls(body);
    }

    function renderHabits(body) {
        body.appendChild(el('p', 'detail-summary', '本周目标 · 最近 28 天 · 连续完成天数'));
        items('habits').forEach(item => {
            const count = weekCount(item.标识);
            const entry = panel(item.名称, `本周 ${count} / ${target(item)} 天 · 连续 ${streak(item.标识)} 天`, item.说明);
            const text = entry.querySelector('.detail-entry-text'); text.appendChild(meter(count, target(item), `${item.名称}本周进度`));
            const today = dateKey(new Date());
            const action = toggle('今天完成', record(today, item.标识).done, () => setRecord(today, item.标识, { ...record(today, item.标识), done: !record(today, item.标识).done }));
            action.id = `habit-${item.标识}`; text.appendChild(action);
            const heatmap = el('div', 'habit-heatmap');
            days(28).forEach(day => {
                const cell = button('', () => { selectedCheckin = day; location.hash = 'checkin'; }, record(day, item.标识).done ? 'heatmap-day is-done' : 'heatmap-day');
                cell.setAttribute('aria-label', `${day} ${item.名称} ${record(day, item.标识).done ? '已完成' : '未完成'}`); cell.title = cell.getAttribute('aria-label'); heatmap.appendChild(cell);
            });
            text.appendChild(heatmap); body.appendChild(entry);
        });
        if (!items('habits').length) body.appendChild(el('p', 'detail-empty', '暂无习惯'));
    }

    function renderFocus(body) {
        const timer = el('div', 'focus-display');
        const mode = el('p', 'detail-summary'); mode.dataset.focusMode = ''; timer.appendChild(mode);
        const display = el('p', 'focus-time'); display.dataset.focusClock = ''; timer.appendChild(display);
        const bar = controls(timer);
        const start = button('', () => timerAction('toggle')); start.dataset.focusToggle = ''; start.id = 'focus-start';
        bar.append(start, button('重置', () => timerAction('reset')), button('切换专注 / 休息', () => timerAction('mode')));
        const status = el('p', 'detail-meta'); status.id = 'focus-message'; status.setAttribute('role', 'status'); timer.appendChild(status);
        body.appendChild(timer);
        const sessions = todaySessions();
        body.appendChild(panel('今日专注', `${sessions.length} 轮 · ${sessions.reduce((sum, entry) => sum + entry.minutes, 0)} 分钟`, `每轮专注 ${minutes('focus')} 分钟，休息 ${minutes('break')} 分钟。`));
        const history = panel('最近 7 天', '', '');
        days(7).reverse().forEach(day => history.querySelector('.detail-entry-text').appendChild(el('p', 'detail-meta', `${day} · ${state.sessions.filter(item => item.date === day).reduce((sum, entry) => sum + entry.minutes, 0)} 分钟`)));
        body.appendChild(history); tick();
    }

    function renderNotes(body) {
        const form = el('form', 'note-form');
        const editing = state.notes.find(note => note.id === noteEdit && !note.deleted);
        const content = el('textarea', 'life-input'); content.required = true; content.maxLength = 5000; content.rows = 4; content.placeholder = '写下一点灵感、摘录或今天的心情…'; content.setAttribute('aria-label', '随手记内容'); content.value = editing?.text || '';
        const tag = el('input', 'life-input'); tag.maxLength = 50; tag.placeholder = '标签（可选）'; tag.setAttribute('aria-label', '随手记标签'); tag.value = editing?.tag || '';
        const save = el('button', 'action-button', editing ? '保存修改' : '保存记录'); save.type = 'submit';
        form.append(content, tag, save);
        if (editing) form.appendChild(button('取消编辑', () => { noteEdit = ''; render(body, 'notes'); }));
        form.addEventListener('submit', event => {
            event.preventDefault(); const text = content.value.trim(); if (!text) return;
            if (commit(next => {
                if (editing) {
                    const existing = next.notes.find(note => note.id === editing.id);
                    if (!existing) throw new Error('这条随手记已被更新或移除，请重新打开');
                    Object.assign(existing, { text, tag: tag.value.trim() });
                }
                else next.notes.push({ id: crypto.randomUUID(), text, tag: tag.value.trim(), created: Date.now(), deleted: false });
            })) { noteEdit = ''; render(body, 'notes'); body.querySelector('textarea')?.focus(); }
        });
        body.appendChild(form);
        const bar = controls(body), input = searchField('搜索随手记');
        input.value = filters.notes.query;
        const recycle = button('查看回收站', () => { filters.notes.deleted = !filters.notes.deleted; recycle.setAttribute('aria-pressed', String(filters.notes.deleted)); draw(); }); recycle.setAttribute('aria-pressed', String(filters.notes.deleted)); bar.append(input, recycle);
        const list = el('div'); body.appendChild(list);
        function draw() {
            list.replaceChildren(); const deleted = recycle.getAttribute('aria-pressed') === 'true';
            const query = input.value.trim().toLowerCase();
            filters.notes.query = input.value;
            state.notes.slice().reverse().filter(note => note.deleted === deleted && `${note.text} ${note.tag}`.toLowerCase().includes(query)).forEach(note => {
                const entry = panel(note.tag || '随手记', new Date(note.created).toLocaleString('zh-CN'), note.text);
                const actions = el('div', 'entry-actions');
                if (!deleted) actions.appendChild(button('编辑', () => { noteEdit = note.id; render(body, 'notes'); }));
                actions.appendChild(button(deleted ? '恢复' : '移到回收站', () => { if (commit(next => { next.notes.find(item => item.id === note.id).deleted = !deleted; })) { if (noteEdit === note.id) noteEdit = ''; render(body, 'notes'); } }));
                entry.querySelector('.detail-entry-text').appendChild(actions); list.appendChild(entry);
            });
            if (!deleted) items('notes').filter(item => `${item.内容} ${item.标签 || ''}`.toLowerCase().includes(query)).forEach(item => list.appendChild(panel(item.标签 || '摘录', item.日期, item.内容)));
            if (!list.children.length) list.appendChild(el('p', 'detail-empty', deleted ? '回收站为空' : '暂无记录'));
        }
        updateNotesList = () => { if (list.isConnected) draw(); };
        input.addEventListener('input', draw); draw();
    }

    function renderProjects(body) {
        const bar = controls(body), filter = select('目标状态', ['全部目标', '进行中', '已完成']); bar.appendChild(filter);
        filter.value = filters.projects;
        const list = el('div'); body.appendChild(list);
        function draw() {
            filters.projects = filter.value;
            list.replaceChildren();
            items('projects').forEach(project => {
                const tasks = steps(project), done = tasks.filter(step => stepDone(project, step)).length;
                const finished = tasks.length > 0 && done === tasks.length;
                if (filter.value === '进行中' && finished || filter.value === '已完成' && !finished) return;
                const entry = panel(project.名称, `${done} / ${tasks.length} 步完成${project.日期 ? ` · ${project.日期}` : ''}`, project.说明);
                const text = entry.querySelector('.detail-entry-text'); text.appendChild(meter(done, tasks.length, `${project.名称}进度`));
                tasks.forEach(step => {
                    const checked = stepDone(project, step);
                    const action = toggle(step.内容, checked, () => commit(next => { next.steps[`${project.标识}:${step.标识}`] = !checked; }));
                    action.id = `step-${project.标识}-${step.标识}`; text.appendChild(action);
                });
                if (!tasks.length) text.appendChild(el('p', 'detail-meta', '暂无阶段任务'));
                list.appendChild(entry);
            });
            if (!list.children.length) list.appendChild(el('p', 'detail-empty', '暂无匹配的目标'));
        }
        filter.addEventListener('change', draw); draw();
    }

    function renderWishlist(body) {
        const bar = controls(body), category = select('愿望分类', ['全部分类', ...new Set(items('wishlist').map(item => item.分类).filter(Boolean))]);
        const status = select('愿望状态', ['全部愿望', '未完成', '已完成']); bar.append(category, status);
        category.value = filters.wishlist.category; status.value = filters.wishlist.status;
        const list = el('div'); body.appendChild(list);
        function draw() {
            filters.wishlist.category = category.value; filters.wishlist.status = status.value;
            list.replaceChildren();
            items('wishlist').forEach(item => {
                const done = wishDone(item);
                if (category.value !== '全部分类' && item.分类 !== category.value || status.value === '未完成' && done || status.value === '已完成' && !done) return;
                const entry = panel(item.名称, [item.分类, done ? '已实现' : '期待中', item.日期].filter(Boolean).join(' · '), item.说明);
                const action = toggle(done ? '已实现，点击撤销' : '标记已实现', done, () => commit(next => { next.wishes[item.标识] = !done; }));
                action.id = `wish-${item.标识}`; entry.querySelector('.detail-entry-text').appendChild(action); list.appendChild(entry);
            });
            if (!list.children.length) list.appendChild(el('p', 'detail-empty', '暂无匹配的愿望'));
        }
        category.addEventListener('change', draw); status.addEventListener('change', draw); draw();
    }

    function render(body, key) {
        body.replaceChildren();
        ({ tools: renderTools, checkin: renderCheckin, habits: renderHabits, focus: renderFocus, notes: renderNotes, projects: renderProjects, wishlist: renderWishlist })[key](body);
    }
    function calendarRecords(day) { return activities().filter(item => record(day, item.标识).done).map(item => ({ name: item.名称, note: record(day, item.标识).note })); }
    function init(config) {
        CFG = config;
        try { const saved = localStorage.getItem(KEY); state = saved ? validate(JSON.parse(saved)) : blank(); }
        catch {
            try { localStorage.setItem('navigation-life-invalid-v1', localStorage.getItem(KEY) || ''); } catch {}
            state = blank(); showNotice('浏览器记录格式无效，已使用空记录；可用时已将原数据保存在损坏记录备份中。');
        }
        renderHome(); tick(); setInterval(tick, 1000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
        window.addEventListener('storage', event => {
            if (event.key !== KEY) return;
            try { state = event.newValue ? validate(JSON.parse(event.newValue)) : blank(); refresh(); updateNotesList?.(); document.dispatchEvent(new CustomEvent('lifechange')); }
            catch { showNotice('另一窗口的记录格式无效，已保留当前记录。'); }
        });
        let day = dateKey(new Date());
        setInterval(() => { const now = dateKey(new Date()); if (now !== day) { day = now; selectedCheckin = now; refresh(); } }, 30000);
    }
    return { titles, init, render, calendarRecords, validate, snapshot: () => clone(state) };
})();
