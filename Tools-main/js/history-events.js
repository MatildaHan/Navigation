'use strict';

/* The catalog stays in configs/; all content is rendered as text. */
const HistoryCatalog = (() => {
    const textFields = ['id', 'year', 'title', 'era', 'people', 'place', 'summary', 'background', 'course', 'impact', 'note', 'reading'];
    function validSourceURL(value) {
        try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
        catch { return false; }
    }
    function validate(data) {
        if (!data || !Array.isArray(data.eras) || !data.eras.length || !data.eras.every(era => typeof era === 'string' && era.trim() && era !== '全部') || new Set(data.eras).size !== data.eras.length) throw new Error('历史时期配置无效');
        if (!data.sources || !Array.isArray(data.events) || !data.events.length) throw new Error('历史事件配置无效');
        const ids = new Set();
        let previousYear = -Infinity;
        for (const event of data.events) {
            if (!event || !textFields.every(key => typeof event[key] === 'string' && event[key].trim()) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.id) || ids.has(event.id) || !data.eras.includes(event.era) || !Number.isInteger(event.sortYear) || event.sortYear < previousYear) throw new Error('历史事件字段、标识或顺序无效');
            if (!Array.isArray(event.sources) || !event.sources.length || !event.sources.every(key => {
                const source = data.sources[key];
                return source && typeof source.title === 'string' && source.title.trim() && validSourceURL(source.url);
            })) throw new Error('历史事件阅读资料无效');
            ids.add(event.id); previousYear = event.sortYear;
        }
        return data;
    }
    function filter(events, era, query) {
        const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
        return events.filter(event => (era === '全部' || event.era === era) && words.every(word => textFields.map(key => event[key]).join(' ').toLocaleLowerCase().includes(word)));
    }
    function route(hash, eras) {
        const [path, query = ''] = hash.replace(/^#/, '').split('?');
        const params = new URLSearchParams(query);
        const era = eras.includes(params.get('era')) ? params.get('era') : '全部';
        return { id: path.startsWith('event/') ? path.slice(6) : null, era, query: (params.get('q') || '').slice(0, 200) };
    }
    function href(id, era, query) {
        const params = new URLSearchParams();
        if (era !== '全部') params.set('era', era);
        if (query) params.set('q', query);
        return `#${id ? `event/${encodeURIComponent(id)}` : 'list'}${params.size ? `?${params}` : ''}`;
    }
    return { validate, filter, route, href, validSourceURL };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = HistoryCatalog;
if (typeof document !== 'undefined') (() => {
    const catalog = document.getElementById('catalog');
    const detail = document.getElementById('detail');
    const list = document.getElementById('list');
    const filters = document.getElementById('filter');
    const count = document.getElementById('count');
    const loading = document.getElementById('loading');
    const retry = document.getElementById('retry');
    const scroller = document.querySelector('.game-inner');
    const positions = new Map();
    let data;
    let activeRoute;
    let lastRead;

    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }
    function link(text, href, className) {
        const element = node('a', className, text); element.href = href; return element;
    }
    function listHref(state) { return HistoryCatalog.href(null, state.era, state.query); }
    function eventHref(id, state) { return HistoryCatalog.href(id, state.era, state.query); }
    function section(title, text, className = '') {
        const element = node('section', `hist-section ${className}`);
        element.append(node('h2', '', title), node('p', '', text));
        return element;
    }
    function metadata(event) {
        const element = node('div', 'hist-item-meta');
        element.append(node('span', 'hist-year', event.year), node('span', 'hist-era', event.era));
        return element;
    }
    function setFilters(state) {
        filters.querySelectorAll('button').forEach(button => {
            const selected = button.dataset.era === state.era;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
    }
    function resetFilters() { updateList('全部', ''); filters.querySelector('button').focus(); }
    function renderList(state) {
        setFilters(state); list.replaceChildren();
        const events = HistoryCatalog.filter(data.events, state.era, state.query);
        count.textContent = `${state.era} · ${events.length} / ${data.events.length} 条事件 · 按时间顺序排列`;
        for (const event of events) {
            const card = link('', eventHref(event.id, state), 'hist-item');
            card.dataset.eventId = event.id;
            card.setAttribute('aria-label', `${event.title}，${event.year}，阅读详情`);
            card.append(metadata(event), node('h2', 'hist-event', event.title), node('p', 'hist-desc', event.summary), node('span', 'hist-read', '阅读详情 →'));
            list.append(card);
        }
        if (!events.length) {
            const empty = node('div', 'hist-empty');
            const reset = node('button', 'hist-button', '显示全部事件'); reset.type = 'button'; reset.addEventListener('click', resetFilters);
            empty.append(node('p', '', '没有找到匹配的事件，试试其他关键词或历史时期。'), reset); list.append(empty);
        }
    }
    function renderDetail(state) {
        detail.replaceChildren();
        detail.append(link('← 返回事件列表', listHref(state), 'hist-button'));
        const event = data.events.find(item => item.id === state.id);
        const title = node('h1', '', event ? event.title : '未找到这条历史事件');
        title.id = 'detail-title'; title.tabIndex = -1;
        if (!event) {
            detail.append(title, node('p', 'hist-lead', '这个地址没有对应的事件，请返回目录重新选择。'));
            document.title = '未找到事件 · 历史事件'; return title;
        }
        lastRead = event.id;
        document.title = `${event.title} · 历史事件`;
        const header = node('header', 'hist-detail-header');
        header.append(metadata(event), title, node('p', 'hist-lead', event.summary));
        const facts = node('dl', 'hist-facts');
        for (const [label, value] of [['时间', event.year], ['历史时期', event.era], ['相关人物', event.people], ['主要地点', event.place]]) {
            const row = node('div'); row.append(node('dt', '', label), node('dd', '', value)); facts.append(row);
        }
        detail.append(header, facts, section('历史背景', event.background), section('事件经过', event.course), section('结果与影响', event.impact), section('阅读提示', event.note, 'hist-note'));
        const sources = section('史料与延伸阅读', event.reading, 'hist-sources');
        const sourceList = node('ul');
        event.sources.forEach(key => {
            const source = data.sources[key];
            const row = node('li'); const anchor = link(source.title, source.url);
            anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; row.append(anchor); sourceList.append(row);
        });
        sources.append(sourceList, node('p', '', '史料推荐与时代背景资料供继续阅读；原始文献、后世记述和现代概括应结合起来理解。外部资料在新窗口打开。'));
        detail.append(sources);
        const events = HistoryCatalog.filter(data.events, state.era, state.query);
        const index = events.findIndex(item => item.id === event.id);
        if (index >= 0) {
            const navigation = node('nav', 'hist-reading-nav'); navigation.setAttribute('aria-label', '继续阅读当前筛选结果');
            for (const [label, neighbour] of [['上一篇', events[index - 1]], ['下一篇', events[index + 1]]]) {
                if (!neighbour) continue;
                const anchor = link('', eventHref(neighbour.id, state)); anchor.append(node('span', '', `${label} · ${neighbour.year}`), node('strong', '', neighbour.title)); navigation.append(anchor);
            }
            if (navigation.childElementCount) detail.append(navigation);
        }
        detail.append(link('← 返回事件列表', listHref(state), 'hist-button'));
        return title;
    }
    function render(focus = true) {
        if (!data) return;
        if (activeRoute && !activeRoute.id) positions.set(listHref(activeRoute), scroller.scrollTop);
        const state = HistoryCatalog.route(location.hash, data.eras);
        catalog.hidden = Boolean(state.id); detail.hidden = !state.id;
        if (state.id) {
            const title = renderDetail(state); scroller.scrollTop = 0;
            if (focus) title.focus({ preventScroll: true });
        } else {
            document.title = '历史事件'; renderList(state);
            if (focus && activeRoute?.id) {
                const card = [...list.querySelectorAll('a')].find(anchor => anchor.dataset.eventId === lastRead);
                (card || filters.querySelector('button.active')).focus({ preventScroll: true });
            }
            scroller.scrollTop = positions.get(listHref(state)) || 0;
        }
        activeRoute = state;
    }
    function updateList(era, query) {
        const state = { id: null, era, query };
        history.replaceState(null, '', listHref(state));
        positions.delete(listHref(state));
        activeRoute = state; renderList(state); scroller.scrollTop = 0;
    }
    async function load() {
        retry.hidden = true; loading.hidden = false; loading.textContent = '正在加载历史事件…';
        try {
            const response = await fetch('../../configs/history-events.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            data = HistoryCatalog.validate(await response.json());
            filters.replaceChildren();
            ['全部', ...data.eras].forEach(era => {
                const button = node('button', 'hist-button', era); button.type = 'button'; button.dataset.era = era;
                button.addEventListener('click', () => updateList(era, '')); filters.append(button);
            });
            loading.hidden = true; render(false); GameBridge.notifyReady();
        } catch (error) {
            loading.textContent = '历史事件加载失败，请通过 HTTP 访问页面并重试。'; retry.hidden = false;
            console.error('历史事件加载失败', error);
        }
    }
    retry.addEventListener('click', load);
    window.addEventListener('hashchange', () => render());
    load();
})();
