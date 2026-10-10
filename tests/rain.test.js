'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/rain.js'), 'utf8');

function environment({ saved = null, reduced = false, storageFails = false, noCanvas = false } = {}) {
    const frames = new Map();
    const nodes = [];
    const events = () => ({ listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
    let nextFrame = 0;
    let clears = 0;
    let strokes = 0;
    const context = { setTransform() {}, clearRect() { clears += 1; }, beginPath() {},
        moveTo() {}, lineTo() {}, stroke() { strokes += 1; }, arc() {}, fill() {} };
    const document = { ...events(), readyState: 'complete', hidden: false,
        body: { append(...children) { nodes.push(...children); } },
        querySelector: () => nodes.find(node => node.className === 'navigation-rain'),
        querySelectorAll: () => [],
        createElement: tag => ({ ...events(), tag, style: {}, attributes: {}, children: [],
            setAttribute(name, value) { this.attributes[name] = value; },
            append(...children) { this.children.push(...children); },
            getContext: () => noCanvas ? null : context }),
    };
    const motion = { ...events(), matches: reduced };
    const window = { ...events(), innerWidth: 1280, innerHeight: 800, devicePixelRatio: 2 };
    const storage = { getItem() { if (storageFails) throw new Error('blocked'); return saved; },
        setItem(key, value) { if (storageFails) throw new Error('blocked'); saved = value; } };
    vm.runInNewContext(source, { document, window, matchMedia: () => motion, localStorage: storage,
        requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
        cancelAnimationFrame(id) { frames.delete(id); } });
    const canvas = nodes.find(node => node.tag === 'canvas');
    const toggle = nodes.find(node => node.tag === 'button');
    return { document, window, motion, frames, canvas, toggle,
        saved: () => saved, clears: () => clears, strokes: () => strokes,
        tick(time) { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); } };
}

test('switch stops drawing immediately and keeps the choice after reload', () => {
    const e = environment();
    assert.equal(e.frames.size, 1);
    e.tick(16);
    assert.ok(e.strokes() > 0);
    e.toggle.listeners.click();
    assert.equal(e.frames.size, 0);
    assert.equal(e.canvas.hidden, true);
    assert.equal(e.toggle.attributes['aria-checked'], 'false');
    assert.equal(e.saved(), 'false');
    const reload = environment({ saved: e.saved() });
    assert.equal(reload.frames.size, 0);
    reload.toggle.listeners.click();
    assert.equal(reload.frames.size, 1);
    assert.equal(reload.saved(), 'true');
});

test('background and page-cache lifecycle pause and resume one animation loop', () => {
    const e = environment();
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
});

test('reduced motion defaults to off, allows explicit opt-in and reacts to system changes', () => {
    const e = environment({ reduced: true });
    assert.equal(e.frames.size, 0);
    e.toggle.listeners.click();
    assert.equal(e.frames.size, 1);
    e.motion.listeners.change();
    assert.equal(e.frames.size, 0);
    assert.equal(e.toggle.attributes['aria-checked'], 'false');
});

test('blocked storage and invalid preferences do not break switching; unsupported canvas adds no controls', () => {
    for (const options of [{ storageFails: true }, { saved: 'invalid' }]) {
        const e = environment(options);
        assert.equal(e.frames.size, 1);
        e.toggle.listeners.click();
        assert.equal(e.frames.size, 0);
    }
    const unsupported = environment({ noCanvas: true });
    assert.equal(unsupported.canvas, undefined);
    assert.equal(unsupported.toggle, undefined);
    assert.equal(unsupported.frames.size, 0);
});

test('other settings do not affect rain; another tab can update or reset the preference', () => {
    const e = environment();
    e.window.listeners.storage({ key: 'navigation-life-v1', newValue: 'false' });
    assert.equal(e.frames.size, 1);
    e.window.listeners.storage({ key: 'navigation-rain-enabled', newValue: 'false' });
    assert.equal(e.frames.size, 0);
    e.window.listeners.storage({ key: null, newValue: null });
    assert.equal(e.frames.size, 1);
});
