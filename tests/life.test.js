'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');

// A small DOM double exercises actual state transitions without a browser or dependencies.
class Node {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.dataset = {}; this.style = {}; this.scrollTop = 0; this.id = ''; this.text = ''; }
    set textContent(value) { this.text = String(value); }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...nodes) { this.children = nodes; this.text = ''; }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    getAttribute(key) { return this.attrs[key] ?? null; }
    addEventListener(key, callback) { this.listeners[key] = callback; }
    focus() {}
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
        const matches = node => selector.startsWith('.') ? node.className?.split(' ').includes(selector.slice(1))
            : selector.startsWith('#') ? node.id === selector.slice(1)
                : selector.startsWith('[data-') ? Object.hasOwn(node.dataset, selector.slice(6, -1).replace(/-([a-z])/g, (_, c) => c.toUpperCase()))
                    : node.tagName === selector;
        return this.children.flatMap(node => [...(matches(node) ? [node] : []), ...node.querySelectorAll(selector)]);
    }
}

function environment(saved = null) {
    const clock = { now: Date.parse('2026-10-08T12:00:00Z') };
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [clock.now])); }
        static now() { return clock.now; }
    }
    const roots = new Map();
    const root = id => { if (!roots.has(id)) { const node = new Node(); node.id = id; roots.set(id, node); } return roots.get(id); };
    const timers = new Map();
    const values = new Map(saved ? [['navigation-life-v1', saved]] : []);
    const storage = { fail: false, getItem: key => values.get(key) || null, setItem(key, value) { if (this.fail) throw new Error('quota exceeded'); values.set(key, value); } };
    const ctx = vm.createContext({
        Date: Clock, URL, TextEncoder, console, location: { hostname: '127.0.0.1', protocol: 'http:', origin: 'http://127.0.0.1', hash: '' },
        document: { baseURI: 'http://127.0.0.1/', activeElement: {}, hidden: false, createElement: tag => new Node(tag), getElementById: root,
            addEventListener() {}, dispatchEvent() {}, querySelector: selector => [...roots.values()].flatMap(node => node.querySelectorAll(selector))[0] || null,
            querySelectorAll: selector => [...roots.values()].flatMap(node => node.querySelectorAll(selector)) },
        localStorage: storage, window: { addEventListener() {} }, CustomEvent: class { constructor(type) { this.type = type; } },
        setInterval: (callback, delay) => timers.set(delay, callback), setTimeout() {},
    });
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/script.js'), 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/life.js'), 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/apps.js'), 'utf8'), ctx);
    const config = vm.runInContext(`parseConfig(${JSON.stringify(fs.readFileSync(path.join(ROOT, 'config.md'), 'utf8'))})`, ctx);
    for (const file of fs.readdirSync(path.join(ROOT, 'configs')).filter(file => file.endsWith('.md') && file !== 'README.md')) {
        Object.assign(config, vm.runInContext(`parseConfig(${JSON.stringify(fs.readFileSync(path.join(ROOT, 'configs', file), 'utf8'))})`, ctx));
    }
    const api = vm.runInContext('Life', ctx);
    const snapshot = () => JSON.parse(JSON.stringify(api.snapshot()));
    return { ctx, api, config, root, clock, timers, values, storage, snapshot };
}

test('every module parses, identifiers are unique, and project steps reference real projects', () => {
    const e = environment();
    for (const key of ['tools', 'checkins', 'habits', 'projects', 'steps', 'wishlist', 'games']) {
        assert.ok(Array.isArray(e.config[key]) && e.config[key].length);
        assert.equal(new Set(e.config[key].map(item => item.标识)).size, e.config[key].length);
    }
    assert.ok(e.config.steps.every(step => e.config.projects.some(project => project.标识 === step.项目)));
    assert.ok(e.config.habits.every(habit => e.config.checkins.some(item => item.标识 === habit.标识)));
    for (const track of e.config.playlist) for (const key of ['音频', '封面']) assert.ok(fs.existsSync(path.join(ROOT, track[key])));
});

test('one check-in persists across reload and updates the habit summary', () => {
    const e = environment(); e.api.init(e.config);
    e.root('checkin-preview').querySelector('button').listeners.click();
    assert.equal(e.snapshot().checkins['2026-10-08'].reading.done, true);
    assert.match(e.root('habits-preview').textContent, /阅读 · 1 \/ 5 天/);
    const reload = environment(e.values.get('navigation-life-v1')); reload.api.init(reload.config);
    assert.equal(reload.snapshot().checkins['2026-10-08'].reading.done, true);
    reload.root('checkin-preview').querySelector('button').listeners.click();
    assert.equal(reload.snapshot().checkins['2026-10-08'].reading.done, false);
});

test('storage failure leaves the old record intact', () => {
    const e = environment(); e.api.init(e.config); e.storage.fail = true;
    e.root('checkin-preview').querySelector('button').listeners.click();
    assert.deepEqual(e.snapshot().checkins, {});
    assert.match(e.root('notice').textContent, /未能保存记录/);
});

test('timer uses a deadline, survives pause and reload, and finishes once with its original duration', () => {
    const e = environment(); e.config.focus = { 专注分钟: '1', 休息分钟: '1' }; e.api.init(e.config);
    e.root('focus-preview').querySelector('button').listeners.click();
    e.clock.now += 15000;
    e.root('focus-preview').querySelector('button').listeners.click();
    assert.equal(e.snapshot().timer.remaining, 45);
    const reload = environment(e.values.get('navigation-life-v1')); reload.config.focus = { 专注分钟: '2', 休息分钟: '1' }; reload.api.init(reload.config);
    assert.equal(reload.snapshot().timer.total, 60);
    reload.root('focus-preview').querySelector('button').listeners.click();
    reload.clock.now += 46000; reload.timers.get(1000)();
    assert.equal(reload.snapshot().timer.mode, 'break');
    assert.equal(reload.snapshot().sessions.length, 1);
    assert.equal(reload.snapshot().sessions[0].minutes, 1);
    reload.timers.get(1000)(); assert.equal(reload.snapshot().sessions.length, 1);
});

test('invalid backups, impossible dates, duplicate notes and unsafe keys are rejected', () => {
    const e = environment(); e.api.init(e.config);
    const valid = e.snapshot(); assert.equal(e.api.validate(valid).version, 1);
    for (const mutate of [
        data => { data.version = 999; },
        data => { data.checkins = []; },
        data => { data.checkins['2026-02-30'] = {}; },
        data => { data.checkins['2026-10-08'] = JSON.parse('{"__proto__":{"done":true,"note":""}}'); },
        data => { data.notes = [{ id: 'same', text: 'a', tag: '', created: 1, deleted: false }, { id: 'same', text: 'b', tag: '', created: 2, deleted: false }]; },
        data => { data.timer.total = 0; },
        data => { data.timer.running = true; data.timer.deadline = 0; },
        data => { data.sessions = [{ id: 'x', date: '2026-10-08', minutes: 1 }, { id: 'x', date: '2026-10-08', minutes: 1 }]; },
    ]) { const data = JSON.parse(JSON.stringify(valid)); mutate(data); assert.throws(() => e.api.validate(data)); }
    assert.deepEqual(e.snapshot(), valid);
});

test('record size is bounded so exported snapshots can be imported again', () => {
    const e = environment(); e.api.init(e.config);
    const data = e.snapshot();
    data.notes = Array.from({ length: 150 }, (_, index) => ({ id: `n-${index}`, text: '字'.repeat(5000), tag: '', created: 1, deleted: false }));
    assert.throws(() => e.api.validate(data), /2 MB/);
});

test('corrupt storage is preserved as a recovery copy, and unsafe tool URLs are skipped', () => {
    const e = environment('{broken'); e.config.tools.push({ 标识: 'unsafe', 名称: 'unsafe tool', 网址: 'javascript:alert(1)' }); e.api.init(e.config);
    assert.equal(e.values.get('navigation-life-invalid-v1'), '{broken');
    assert.deepEqual(e.snapshot().checkins, {});
    assert.doesNotMatch(e.root('tools-preview').textContent, /unsafe tool/);
});
