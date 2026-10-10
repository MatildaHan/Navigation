'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/weather.js'), 'utf8');
const KEY = 'navigation-weather-mode';
const ORDER = ['sun', 'rain', 'snow', 'leaves', 'off'];

function environment({ saved = null, legacy = null, reduced = false, storageFails = false, noCanvas = false,
    random = () => 0.5 } = {}) {
    const frames = new Map();
    const nodes = [];
    const commands = [];
    const events = () => ({ listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
    let nextFrame = 0;
    const context = {};
    for (const method of ['setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc',
        'fill', 'save', 'restore', 'translate', 'rotate', 'scale', 'bezierCurveTo', 'fillRect', 'closePath', 'drawImage']) {
        context[method] = (...args) => commands.push([method, ...args]);
    }
    for (const method of ['createLinearGradient', 'createRadialGradient']) {
        context[method] = (...args) => { commands.push([method, ...args]); return {
            addColorStop(offset, color) { commands.push(['colorStop', offset, color]); },
        }; };
    }
    const document = { ...events(), readyState: 'complete', hidden: false,
        body: { append(...children) { nodes.push(...children); } },
        querySelector: () => nodes.find(node => node.className === 'navigation-weather'),
        querySelectorAll: () => [],
        createElement: tag => ({ ...events(), tag, style: {}, dataset: {}, attributes: {}, children: [],
            setAttribute(name, value) { this.attributes[name] = value; },
            append(...children) { this.children.push(...children); },
            getContext: () => noCanvas ? null : context }),
    };
    const motion = { ...events(), matches: reduced };
    const window = { ...events(), innerWidth: 1280, innerHeight: 800, devicePixelRatio: 2 };
    const storage = { getItem(key) { if (storageFails) throw new Error('blocked'); return key === KEY ? saved : legacy; },
        setItem(key, value) { if (storageFails) throw new Error('blocked'); assert.equal(key, KEY); saved = value; } };
    const deterministicMath = Object.create(Math);
    deterministicMath.random = random;
    vm.runInNewContext(source, { document, window, Math: deterministicMath, matchMedia: () => motion, localStorage: storage,
        requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
        cancelAnimationFrame(id) { frames.delete(id); } });
    const canvas = nodes.find(node => node.tag === 'canvas');
    const toggle = nodes.find(node => node.tag === 'button');
    return { document, window, motion, frames, canvas, toggle, commands,
        saved: () => saved, mode: () => toggle.dataset.mode,
        tick(time) { commands.length = 0; const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); return [...commands]; } };
}

test('five modes cycle in order, survive reload, and off cancels the only animation loop', () => {
    const e = environment({ saved: 'sun' });
    for (let i = 0; i < ORDER.length * 2; i += 1) {
        const mode = ORDER[i % ORDER.length];
        assert.equal(e.mode(), mode);
        assert.equal(e.frames.size, mode === 'off' ? 0 : 1);
        assert.equal(e.canvas.hidden, mode === 'off');
        if (mode !== 'off') assert.ok(e.tick(i * 16 + 16).some(command => ['stroke', 'fill', 'fillRect', 'drawImage'].includes(command[0])));
        const reload = environment({ saved: mode });
        assert.equal(reload.mode(), mode);
        assert.equal(reload.toggle.attributes['aria-label'], e.toggle.attributes['aria-label']);
        e.toggle.listeners.click();
        assert.equal(e.saved(), ORDER[(i + 1) % ORDER.length]);
    }
});

test('rain, snow and leaves drift left and down', () => {
    for (const [mode, method] of [['rain', 'moveTo'], ['snow', 'arc'], ['leaves', 'translate']]) {
        const e = environment({ saved: mode });
        const first = e.tick(16).find(command => command[0] === method);
        const second = e.tick(32).find(command => command[0] === method);
        assert.ok(second[1] < first[1], `${mode} moves left`);
        assert.ok(second[2] > first[2], `${mode} moves down`);
    }
});

test('one broad sunlight beam is continuous, fades outward and is cached between frames', () => {
    const e = environment({ saved: 'sun' });
    const rays = e.commands.filter(command => command[0] === 'arc' && command[5] !== Math.PI * 2);
    assert.ok(rays.length > 0);
    const [, x, y] = rays[0];
    assert.ok(x > e.window.innerWidth && y < 0);
    assert.ok(rays.every(ray => ray[1] === x && ray[2] === y));
    const center = (rays.at(-1)[5] + rays[0][4]) / 2;
    assert.ok(center > Math.PI / 2 && center < Math.PI);
    assert.ok(Math.abs(rays.at(-1)[5] - rays[0][4] - 0.84 * 2) < 1e-10);
    assert.ok(rays.slice(1).every((ray, index) => Math.abs(ray[4] - rays[index][5]) < 1e-10));
    const stops = e.commands.filter(command => command[0] === 'colorStop');
    assert.ok(stops.some(stop => stop[1] === 1 && /, 0\)$/.test(stop[2])));
    assert.ok(stops.some(stop => stop[1] > 0 && stop[1] < 1 && /, 0\.\d+\)$/.test(stop[2])));
    for (const time of [16, 32]) {
        const commands = e.tick(time);
        assert.equal(commands.filter(command => command[0] === 'drawImage').length, 1);
        assert.equal(commands.filter(command => command[0].startsWith('create')).length, 0);
        assert.equal(commands.filter(command => command[0] === 'arc').length, 0);
    }
});

test('sunlight adds a small set of random soft spots within the viewport and caches them', () => {
    let seed = 123;
    const e = environment({ saved: 'sun', random: () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    } });
    const spots = e.commands.filter(command => command[0] === 'createRadialGradient' && command[6] <= 50);
    assert.ok(spots.length >= 6 && spots.length <= 12);
    assert.ok(spots.every(spot => spot[1] > 0 && spot[1] < e.window.innerWidth
        && spot[2] > 0 && spot[2] < e.window.innerHeight && spot[6] >= 18));
    assert.equal(new Set(spots.map(spot => `${spot[1]},${spot[2]}`)).size, spots.length);
    const spotAlphas = e.commands.filter(command => command[0] === 'colorStop' && command[1] === 0.85)
        .map(command => Number(command[2].match(/, ([\d.]+)\)$/)[1]));
    assert.equal(spotAlphas.length, spots.length);
    assert.ok(spotAlphas.every(alpha => alpha >= 0.04 && alpha <= 0.08));
    for (const time of [16, 32]) assert.ok(!e.tick(time).some(command => command[0] === 'createRadialGradient'));
});

test('removed fog preferences recover to off and the next click selects sun', () => {
    const e = environment({ saved: 'fog' });
    assert.equal(e.mode(), 'off');
    assert.equal(e.frames.size, 0);
    e.toggle.listeners.click();
    assert.equal(e.mode(), 'sun');
    e.window.listeners.storage({ key: KEY, newValue: 'fog' });
    assert.equal(e.mode(), 'off');
    assert.equal(e.frames.size, 0);
});

test('background and page-cache lifecycle pause and resume one loop for every active mode', () => {
    for (const mode of ORDER.filter(value => value !== 'off')) {
        const e = environment({ saved: mode });
        e.document.hidden = true;
        e.document.listeners.visibilitychange();
        assert.equal(e.frames.size, 0);
        e.document.hidden = false;
        e.document.listeners.visibilitychange();
        e.window.listeners.pageshow();
        assert.equal(e.frames.size, 1);
        e.window.listeners.pagehide();
        assert.equal(e.frames.size, 0);
        e.window.listeners.pageshow();
        assert.equal(e.frames.size, 1);
    }
});

test('legacy off choice is kept, reduced motion defaults to off, and explicit selection is allowed', () => {
    assert.equal(environment({ legacy: 'false' }).mode(), 'off');
    assert.equal(environment({ legacy: 'true' }).mode(), 'rain');
    assert.equal(environment({ saved: 'snow', legacy: 'false' }).mode(), 'snow');
    const e = environment({ reduced: true });
    assert.equal(e.frames.size, 0);
    e.toggle.listeners.click();
    assert.equal(e.mode(), 'sun');
    assert.equal(e.frames.size, 1);
    e.motion.listeners.change();
    assert.equal(e.mode(), 'off');
    assert.equal(e.frames.size, 0);
});

test('blocked storage and invalid preferences remain usable; unsupported canvas adds no controls', () => {
    for (const options of [{ storageFails: true }, { saved: 'invalid' }]) {
        const e = environment(options);
        assert.equal(e.mode(), 'rain');
        e.toggle.listeners.click();
        assert.equal(e.mode(), 'snow');
        assert.equal(e.frames.size, 1);
    }
    assert.equal(environment({ saved: 'invalid', reduced: true }).mode(), 'off');
    const unsupported = environment({ noCanvas: true });
    assert.equal(unsupported.canvas, undefined);
    assert.equal(unsupported.toggle, undefined);
    assert.equal(unsupported.frames.size, 0);
});

test('another tab can change the mode; invalid modes and unrelated records cannot break the module', () => {
    const e = environment();
    e.window.listeners.storage({ key: 'navigation-life-v1', newValue: 'off' });
    assert.equal(e.mode(), 'rain');
    e.window.listeners.storage({ key: KEY, newValue: 'snow' });
    assert.equal(e.mode(), 'snow');
    e.tick(16);
    e.window.listeners.storage({ key: KEY, newValue: 'off' });
    assert.equal(e.frames.size, 0);
    e.window.listeners.storage({ key: KEY, newValue: '__proto__' });
    assert.equal(e.mode(), 'rain');
    e.window.listeners.storage({ key: null, newValue: null });
    assert.equal(e.frames.size, 1);
});
