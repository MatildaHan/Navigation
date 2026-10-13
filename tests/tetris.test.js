'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../Games-main/games/tetris.html'), 'utf8');

function button() {
    const listeners = [];
    return {
        addEventListener(type, listener) { if (type === 'click') listeners.push(listener); },
        click() { listeners.forEach(listener => listener()); this.onclick?.(); },
    };
}

test('continuing a paused Tetris game preserves the existing game instead of starting again', () => {
    const context = vm.createContext({
        btnStart: button(), btnPause: button(), btnRestart: button(), btnLeave: button(),
        canvas: { focus() {} }, modal: { classList: { remove() {} } }, touchButtons: [],
        requestAnimationFrame: () => 2, cancelAnimationFrame() {},
    });
    vm.runInContext(`
        let state = 'running', rafId = 1, lastTime = 15, dropCounter = 20, resets = 0, next;
        function reset() { resets++; state = 'idle'; }
        function nextFromBag() { return {}; }
        function spawn() {}
        function loop() {}
        function showModal() {}
        function leave() { reset(); }
    ` + source.slice(source.indexOf('    function start()'), source.indexOf('    function endGame()'))
        + source.slice(source.indexOf('    btnStart.onclick = start;'), source.indexOf("    touchControls.addEventListener('click'")), context);
    context.btnPause.click();
    assert.equal(vm.runInContext('state', context), 'paused');
    context.btnRestart.click();
    assert.equal(vm.runInContext('state', context), 'running');
    assert.equal(vm.runInContext('resets', context), 0);
    context.btnPause.click();
    context.btnLeave.click();
    assert.equal(vm.runInContext('resets', context), 1);
});

test('hard drop locks above an occupied cell and does nothing while paused', () => {
    const context = vm.createContext({});
    vm.runInContext(`
        const COLS = 15, ROWS = 20;
        let state = 'running', current = { shape: [[1]], x: 14, y: 0 }, dropCounter = 10;
        let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        board[19][14] = '#52e0bd';
        let locks = [];
        function merge() { locks.push(current.y); }
        function draw() {}
    ` + source.slice(source.indexOf('    function collide('), source.indexOf('    function merge()'))
        + source.slice(source.indexOf('    function hardDrop()'), source.indexOf('    function draw()')), context);
    vm.runInContext('hardDrop()', context);
    assert.deepEqual(Array.from(vm.runInContext('locks', context)), [18]);
    assert.equal(vm.runInContext('dropCounter', context), 0);
    vm.runInContext("state = 'paused'; hardDrop();", context);
    assert.equal(vm.runInContext('locks.length', context), 1);
});
