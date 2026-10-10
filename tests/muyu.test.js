'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/muyu.js'), 'utf8');

function environment(saved = '0', playResult = () => Promise.resolve()) {
    const nodes = new Map();
    for (const id of ['muyu', 'count', 'merit', 'storageStatus', 'soundStatus', 'chantAudio', 'btnReset']) {
        nodes.set(id, { textContent: '', listeners: {}, classList: { add() {}, remove() {} }, addEventListener(type, fn) { this.listeners[type] = fn; } });
    }
    const audio = nodes.get('chantAudio');
    Object.assign(audio, { paused: true, currentTime: 0, plays: 0, pause() { this.paused = true; }, play() { this.plays++; this.paused = false; return playResult(); } });
    const values = new Map([['muyu.count', saved]]);
    const storage = { fail: false, getItem: key => values.get(key), setItem(key, value) { if (this.fail) throw new Error('quota'); values.set(key, value); } };
    let pauseHandler;
    const ctx = vm.createContext({
        document: { hidden: false, getElementById: id => nodes.get(id), addEventListener() {} },
        window: { addEventListener() {} }, navigator: {}, localStorage: storage,
        GameBridge: { notifyActive() {}, notifyReady() {}, onParentMessage(handler) { pauseHandler = handler; } },
        setTimeout() {}, clearTimeout() {},
    });
    vm.runInContext(source, ctx);
    return { nodes, audio, values, storage, hit: () => nodes.get('muyu').listeners.click(), reset: () => nodes.get('btnReset').listeners.click(), pause: () => pauseHandler({type: 'pause'}) };
}

test('saved count increments and reset persists zero while stopping recitation', async () => {
    const e = environment('7');
    e.hit();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(e.nodes.get('count').textContent, '8');
    assert.equal(e.values.get('muyu.count'), '8');
    assert.equal(e.audio.paused, false);
    e.reset();
    assert.equal(e.values.get('muyu.count'), '0');
    assert.equal(e.nodes.get('count').textContent, '0');
    assert.equal(e.audio.paused, true);
    assert.equal(e.audio.currentTime, 0);
});

test('invalid counts fall back to zero and storage failure leaves the stored count intact', () => {
    for (const saved of ['-1', '1.5', 'NaN', 'Infinity', '9007199254740992']) assert.equal(environment(saved).nodes.get('count').textContent, '0');
    const e = environment('9');
    e.storage.fail = true;
    e.hit();
    assert.equal(e.nodes.get('count').textContent, '10');
    assert.equal(e.values.get('muyu.count'), '9');
    assert.match(e.nodes.get('storageStatus').textContent, /未能保存/);
});

test('rapid taps do not layer recitations and navigation cancels a pending playback', async () => {
    let resolvePlay;
    const e = environment('0', () => new Promise(resolve => { resolvePlay = resolve; }));
    e.hit(); e.hit(); e.hit();
    assert.equal(e.audio.plays, 1);
    assert.equal(e.nodes.get('count').textContent, '3');
    e.pause();
    e.audio.paused = false; // A delayed media play completion must not restart the departed tool.
    resolvePlay();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(e.audio.paused, true);
});
