'use strict';

/* Only bundled, known pages can be embedded. Markdown supplies display content. */
const Apps = (() => {
    const games = ['tetris', 'sudoku', 'nonogram', 'chess', 'gomoku', 'klotski', 'minesweeper', 'lightsout', 'graphcoloring', 'zebra'];
    const tools = ['book', 'cyber-muyu', 'english-study', 'japanese-study', 'poetry-recite', 'history-events', 'music-player'];
    const entries = new Map();
    const toolRoute = item => tools.some(id => item.网址 === `#tool/${id}`) ? item.网址 : null;
    const icons = {
        book: 'fa-book-open', 'cyber-muyu': 'fa-drum', 'english-study': 'fa-language', 'japanese-study': 'fa-language',
        'poetry-recite': 'fa-feather-pointed', 'history-events': 'fa-landmark', 'music-player': 'fa-headphones',
        tetris: 'fa-shapes', sudoku: 'fa-table-cells', nonogram: 'fa-border-all', chess: 'fa-chess', gomoku: 'fa-chess-board',
        klotski: 'fa-puzzle-piece', minesweeper: 'fa-bomb', lightsout: 'fa-lightbulb', graphcoloring: 'fa-palette', zebra: 'fa-magnifying-glass',
    };
    function tile(key, item) {
        const localTool = key.startsWith('tool/');
        const card = el('article', 'bento-card card-list card-life app-tile');
        card.dataset.span = '1';
        if (localTool) card.dataset.localTool = key;
        const header = el('header', 'card-header');
        const icon = el('i', `fa-solid ${icons[key.split('/')[1]] || 'fa-gamepad'}`);
        icon.setAttribute('aria-hidden', 'true');
        header.append(icon, el('span', '', item.名称));
        const preview = el('div', 'life-preview');
        preview.append(el('p', 'preview-stat', item.分类 || '休闲'), el('p', 'preview-line', item.说明));
        const link = el('a', 'card-open');
        link.href = `#${key}`;
        link.setAttribute('aria-label', `打开${item.名称}`);
        card.append(header, preview, link);
        card.addEventListener('click', event => {
            if (event.target.closest('a, button, input, select, textarea') || window.getSelection()?.toString()) return;
            link.click();
        });
        return card;
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
            (items || []).forEach(item => {
                const id = kind === 'tool' ? toolRoute(item)?.split('/')[1] : item.标识;
                const key = `${kind}/${id}`;
                if (!ids.includes(id) || !item.名称 || entries.has(key)) return;
                entries.set(key, { ...item, kind, path: `${directory}/${id}.html`, parent: kind === 'game' ? '#games' : '#life' });
                node.appendChild(tile(key, item));
            });
        }
    }
    function render(body, key) {
        const item = entries.get(key);
        const stage = el('div', 'app-stage');
        const frame = el('iframe', 'app-frame');
        frame.title = item.名称;
        const status = el('p', 'app-status', '正在加载…'); status.setAttribute('role', 'status');
        const retry = el('button', 'action-button app-retry', '重新加载'); retry.type = 'button'; retry.hidden = true;
        stage.append(frame, status, retry);
        body.append(stage, el('p', 'app-help', item.说明));
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
