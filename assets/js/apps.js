'use strict';

/* Only bundled, known pages can be embedded. Markdown supplies display content. */
const Apps = (() => {
    const games = ['tetris', 'sudoku', 'nonogram', 'chess', 'gomoku', 'klotski', 'minesweeper', 'lightsout', 'graphcoloring', 'zebra'];
    const tools = ['book', 'cyber-muyu', 'english-study', 'japanese-study', 'poetry-recite', 'history-events', 'music-player'];
    const entries = new Map();
    const toolRoute = item => tools.some(id => item.网址 === `#tool/${id}`) ? item.网址 : null;
    function tile(key, item, index) {
        const localTool = key.startsWith('tool/');
        const link = el('a', localTool ? 'bento-card app-tile card-life-app' : 'app-tile');
        if (localTool) { link.dataset.span = '1'; link.dataset.localTool = key; }
        link.href = `#${key}`;
        const top = el('span', 'app-tile-top');
        top.append(el('span', 'app-number', String(index + 1).padStart(2, '0')), el('span', 'app-category', item.分类 || '休闲'));
        link.append(top, el('strong', '', item.名称), el('span', 'app-description', item.说明), el('span', 'app-enter', '进入 →'));
        return link;
    }
    function init(CFG) {
        entries.clear();
        for (const [kind, ids, items, container, directory] of [
            ['game', games, CFG.games, 'games-grid', 'Games-main/games'],
            ['tool', tools, CFG.tools?.filter(toolRoute), 'life-grid', 'Tools-main/tools'],
        ]) {
            const node = document.getElementById(container);
            if (kind === 'game') node.replaceChildren();
            else node.querySelectorAll('[data-local-tool]').forEach(tile => tile.remove());
            let index = 0;
            (items || []).forEach(item => {
                const id = kind === 'tool' ? toolRoute(item)?.split('/')[1] : item.标识;
                const key = `${kind}/${id}`;
                if (!ids.includes(id) || !item.名称 || entries.has(key)) return;
                entries.set(key, { ...item, kind, path: `${directory}/${id}.html`, parent: kind === 'game' ? '#games' : '#life' });
                node.appendChild(tile(key, item, index++));
            });
        }
    }
    function render(body, key) {
        const item = entries.get(key);
        const toolbar = el('div', 'app-toolbar');
        const label = el('label', '', item.kind === 'game' ? '切换游戏' : '切换工具');
        const select = el('select', 'life-select');
        label.appendChild(select);
        for (const [route, entry] of entries) if (entry.kind === item.kind) {
            const option = el('option', '', entry.名称); option.value = route; select.appendChild(option);
        }
        select.value = key;
        select.addEventListener('change', () => { location.hash = select.value; });
        const focus = el('button', 'action-button', item.kind === 'game' ? '键盘操作' : '进入工具');
        focus.type = 'button';
        toolbar.append(label, focus);
        const stage = el('div', 'app-stage');
        const frame = el('iframe', 'app-frame');
        frame.title = item.名称;
        const status = el('p', 'app-status', '正在加载…'); status.setAttribute('role', 'status');
        const retry = el('button', 'action-button app-retry', '重新加载'); retry.type = 'button'; retry.hidden = true;
        stage.append(frame, status, retry);
        body.append(toolbar, stage, el('p', 'app-help', item.说明));
        let timeout;
        let disposed = false;
        const protocol = item.kind === 'game' ? 'game-hub' : 'tool-hub';
        function theme() {
            const root = getComputedStyle(document.documentElement);
            frame.contentWindow?.postMessage({ protocol, type: 'theme', payload: { accent: root.getPropertyValue('--accent').trim(), hue: root.getPropertyValue('--accent-hue').trim() } }, location.origin);
        }
        function ready() {
            clearTimeout(timeout); status.hidden = true; retry.hidden = true; theme();
        }
        function message(event) {
            if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.protocol !== protocol) return;
            if (event.data.type === 'ready') ready();
            if (event.data.type === 'active') document.getElementById('main-audio')?.pause();
        }
        function pause() { frame.contentWindow?.postMessage({ protocol, type: 'pause' }, location.origin); }
        function visibility() { if (document.hidden) pause(); }
        function load() {
            clearTimeout(timeout); status.hidden = false; retry.hidden = true; status.textContent = '正在加载…';
            frame.src = item.path;
            timeout = setTimeout(() => { status.textContent = '加载未完成，请重试。'; retry.hidden = false; }, 12000);
        }
        frame.addEventListener('load', () => {
            if (disposed) return;
            try {
                if (!frame.contentDocument?.querySelector('.game-inner')) return;
                ready();
            } catch { /* The stage retains an explicit retry on load failure. */ }
        });
        retry.addEventListener('click', load);
        focus.addEventListener('click', () => frame.contentWindow?.focus());
        window.addEventListener('message', message);
        document.addEventListener('visibilitychange', visibility);
        load();
        return () => {
            disposed = true; clearTimeout(timeout); pause();
            window.removeEventListener('message', message);
            document.removeEventListener('visibilitychange', visibility);
            frame.remove();
        };
    }
    return { init, get: key => entries.get(key), render, toolRoute };
})();
