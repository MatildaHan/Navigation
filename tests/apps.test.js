'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createChessEngine } = require('../Games-main/js/chess-engine.js');
const root = path.join(__dirname, '..');
const html = name => fs.readFileSync(path.join(root, 'Games-main/games', name + '.html'), 'utf8');
const empty = () => Array.from({length: 10}, () => Array(9).fill(0));

test('all bundled inline and external scripts parse', () => {
    for (const directory of ['Games-main/games', 'Tools-main/tools']) {
        for (const file of fs.readdirSync(path.join(root, directory))) {
            const source = fs.readFileSync(path.join(root, directory, file), 'utf8');
            for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1], {filename: file});
            for (const match of source.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)) {
                if (!match[1].includes(':') && /\.(?:js|css)$/.test(match[1])) assert.ok(fs.existsSync(path.resolve(root, directory, match[1])), match[1]);
            }
        }
    }
    for (const directory of ['assets/js', 'Games-main/js', 'Tools-main/js']) for (const file of fs.readdirSync(path.join(root,directory))) new vm.Script(fs.readFileSync(path.join(root,directory,file), 'utf8'), {filename:file});
});

test('xiangqi checks the attacking horse leg, rejects self-check, and permits flying capture', () => {
    const board = empty();board[9][4] = 'K';board[0][3] = 'k';board[7][5] = 'n';
    const engine = createChessEngine(board);
    assert.equal(engine.isInCheck('red'), true);
    board[8][5] = 'P';assert.equal(engine.isInCheck('red'), false);
    board[8][5] = 0;board[6][5] = 'p';assert.equal(engine.isInCheck('red'), true);
    board[7][5]=0;board[6][5]=0;board[8][4]='R';board[5][4]='r';
    assert.ok(!engine.getLegalMoves(4,8).some(move => move.x === 3 && move.y === 8));
    const facing = empty();facing[9][4] = 'K';facing[0][4] = 'k';engine.setBoard(facing);
    assert.ok(engine.getLegalMoves(4,9).some(move => move.x === 4 && move.y === 0));
});

test('xiangqi AI chooses a winning capture for each side and restores searched board', () => {
    for (const side of ['red','black']) {
        const board = empty();board[9][4]='K';board[0][4]='k';board[5][4]='P';
        if(side === 'red')board[1][4]='R';else board[8][4]='r';
        const before = JSON.stringify(board), engine = createChessEngine(board);
        const move = engine.chooseMove(side,3,300);
        assert.equal(board[move.to.y][move.to.x], side === 'red' ? 'k' : 'K');
        assert.equal(JSON.stringify(board),before);
    }
});

test('sudoku puzzles have one solution and corrupted progress does not unlock levels', () => {
    const source = html('sudoku');
    const solutions = source.slice(source.indexOf('    const SOLUTIONS'),source.indexOf('    const DIFFS'));
    const functions = source.slice(source.indexOf('    function solutionCount'),source.indexOf('    function renderBoard'));
    const load = source.slice(source.indexOf('    function loadProgress'),source.indexOf('    function saveProgress'));
    const ctx = vm.createContext({localStorage:{getItem:()=>JSON.stringify(['10',-1,{},0,0])}});
    vm.runInContext(solutions + '\nconst DIFFS = Array(5); let solution;\n' + functions + load,ctx);
    const valid = source.slice(source.indexOf('    function isValidSolution'), source.indexOf('    (function selfTest'));
    vm.runInContext(valid, ctx);
    assert.equal(vm.runInContext('SOLUTIONS.every(isValidSolution)',ctx), true);
    for(const holes of [20,40,58])for(let i=0;i<3;i++)assert.equal(vm.runInContext(`solutionCount(generatePuzzle(${holes}))`,ctx),1);
    assert.deepEqual(Array.from(vm.runInContext('loadProgress()',ctx)),Array(5).fill(0));
});

test('zebra canonical answer satisfies all fifteen clues and adjacent houses are required', () => {
    const source=html('zebra');const block=source.slice(source.indexOf('    const PUZZLE'),source.indexOf('    // 状态'));
    const ctx=vm.createContext({});vm.runInContext(block,ctx);
    assert.equal(vm.runInContext('PUZZLE.clues.every(fn => fn(PUZZLE.answer))',ctx),true);
    assert.equal(vm.runInContext(`(() => { const a=PUZZLE.answer.map(h=>({...h})); [a[1].color,a[3].color]=[a[3].color,a[1].color]; return PUZZLE.clues[3](a); })()`,ctx),false);
});

test('gomoku evaluation preserves a placed stone and identifies an immediate five', () => {
    const source=html('gomoku');const block=source.slice(source.indexOf('    const SCORE'),source.indexOf('    function getCandidates'));
    const ctx=vm.createContext({});vm.runInContext('const SIZE=15, EMPTY=0; const board=Array.from({length:SIZE},()=>Array(SIZE).fill(0));\n'+block,ctx);
    vm.runInContext('for(let x=0;x<5;x++)board[7][x]=1;',ctx);
    assert.ok(vm.runInContext('evaluatePoint(4,7,1)',ctx)>=1000000);
    assert.equal(vm.runInContext('board[7][4]',ctx),1);
});
