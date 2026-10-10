'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fitCells } = require('../Games-main/js/layout.js');

function extent(cell, count, gap, inset) { return cell * count + (count - 1) * gap + inset; }

test('different square difficulties fill the same available area and reduce cell size', () => {
    const sizes = [3, 5, 7, 9, 16];
    let previous = Infinity;
    for (const size of sizes) {
        const cell = fitCells({ width: 600, height: 400, rows: size, cols: size, gap: 6, insetX: 24, insetY: 24 });
        const height = extent(cell, size, 6, 24);
        assert.ok(cell < previous);
        assert.ok(height <= 400);
        assert.ok(400 - height < size);
        previous = cell;
    }
});

test('rectangular minesweeper and nonogram clues remain inside their budgets', () => {
    for (const spec of [
        { width: 828, height: 460, rows: 16, cols: 30, gap: 2, insetX: 12, insetY: 12 },
        { width: 310, height: 460, rows: 16, cols: 30, gap: 2, insetX: 12, insetY: 12 },
        { width: 310, height: 460, rows: 15, cols: 15, insetX: 94, insetY: 76, minCell: 12 },
    ]) {
        const cell = fitCells(spec);
        assert.ok(extent(cell, spec.cols, spec.gap || 0, spec.insetX) <= spec.width);
        assert.ok(extent(cell, spec.rows, spec.gap || 0, spec.insetY) <= spec.height);
    }
});

test('unusable tiny spaces preserve the minimum cell size for local scrolling', () => {
    assert.equal(fitCells({ width: 100, height: 20, rows: 7, cols: 7, gap: 4, insetX: 16, insetY: 16, minCell: 16 }), 16);
});
