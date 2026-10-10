/* Xiangqi rules shared by the page, worker and regression tests. */
'use strict';
function createChessEngine(initialBoard) {
    let board = initialBoard;
    const isRed = p => !!p && p === p.toUpperCase();
    const isBlack = p => !!p && p === p.toLowerCase();
    const sameSide = (a, b) => isRed(a) === isRed(b);
    const VALUES = { k: 10000, r: 900, n: 400, c: 450, a: 200, b: 200, p: 100 };
    function getPseudoMoves(x, y) {
        const p = board[y][x];
        if (!p) return [];
        const moves = [];
        const red = isRed(p);
        const kind = p.toLowerCase();

        function tryAdd(nx, ny) {
            if (nx < 0 || nx > 8 || ny < 0 || ny > 9) return false;
            const t = board[ny][nx];
            if (t && sameSide(p, t)) return false;
            moves.push({ x: nx, y: ny });
            return !t;
        }

        if (kind === 'r') {
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                let nx = x + dx, ny = y + dy;
                while (tryAdd(nx, ny)) { nx += dx; ny += dy; }
            }
        } else if (kind === 'c') {
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                let nx = x + dx, ny = y + dy, jumped = false;
                while (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
                    const t = board[ny][nx];
                    if (!jumped) {
                        if (!t) moves.push({ x: nx, y: ny });
                        else jumped = true;
                    } else if (t) {
                        if (!sameSide(p, t)) moves.push({ x: nx, y: ny });
                        break;
                    }
                    nx += dx; ny += dy;
                }
            }
        } else if (kind === 'n') {
            const legs = [[1,2,0,1],[-1,2,0,1],[1,-2,0,-1],[-1,-2,0,-1],[2,1,1,0],[2,-1,1,0],[-2,1,-1,0],[-2,-1,-1,0]];
            for (const [dx, dy, lx, ly] of legs) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx > 8 || ny < 0 || ny > 9) continue;
                if (board[y + ly][x + lx]) continue;
                const t = board[ny][nx];
                if (!t || !sameSide(p, t)) moves.push({ x: nx, y: ny });
            }
        } else if (kind === 'b') {
            for (const [dx, dy] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx > 8 || ny < 0 || ny > 9) continue;
                if (red && ny < 5) continue;
                if (!red && ny > 4) continue;
                if (board[y + dy / 2][x + dx / 2]) continue;
                const t = board[ny][nx];
                if (!t || !sameSide(p, t)) moves.push({ x: nx, y: ny });
            }
        } else if (kind === 'a') {
            for (const [dx, dy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 3 || nx > 5) continue;
                if (red && (ny < 7 || ny > 9)) continue;
                if (!red && (ny < 0 || ny > 2)) continue;
                const t = board[ny][nx];
                if (!t || !sameSide(p, t)) moves.push({ x: nx, y: ny });
            }
        } else if (kind === 'k') {
            const enemy = findKing(red ? 'black' : 'red');
            if (enemy && enemy.x === x && kingsFacing()) moves.push(enemy);

            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 3 || nx > 5) continue;
                if (red && (ny < 7 || ny > 9)) continue;
                if (!red && (ny < 0 || ny > 2)) continue;
                const t = board[ny][nx];
                if (!t || !sameSide(p, t)) moves.push({ x: nx, y: ny });
            }
        } else if (kind === 'p') {
            const forward = red ? -1 : 1;
            const ny = y + forward;
            if (ny >= 0 && ny <= 9) {
                const t = board[ny][x];
                if (!t || !sameSide(p, t)) moves.push({ x, y: ny });
            }
            if ((red && y <= 4) || (!red && y >= 5)) {
                for (const dx of [-1, 1]) {
                    const nx = x + dx;
                    if (nx < 0 || nx > 8) continue;
                    const t = board[y][nx];
                    if (!t || !sameSide(p, t)) moves.push({ x: nx, y });
                }
            }
        }
        return moves;
    }

    function findKing(side) {
        const target = side === 'red' ? 'K' : 'k';
        for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
            if (board[y][x] === target) return { x, y };
        }
        return null;
    }

    function kingsFacing() {
        const kr = findKing('red'), kb = findKing('black');
        if (!kr || !kb) return false;
        if (kr.x !== kb.x) return false;
        for (let y = Math.min(kr.y, kb.y) + 1; y < Math.max(kr.y, kb.y); y++) {
            if (board[y][kr.x]) return false;
        }
        return true;
    }

    function isInCheck(side) {
        const king = findKing(side);
        if (!king) return true;
        const kx = king.x, ky = king.y;
        const isEnemy = (p) => {
            if (!p) return false;
            return side === 'red' ? isBlack(p) : isRed(p);
        };

        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        for (const [dx, dy] of dirs) {
            let nx = kx + dx, ny = ky + dy;
            let jumped = false;
            while (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
                const p = board[ny][nx];
                if (p) {
                    if (!jumped) {
                        if (isEnemy(p)) {
                            const k = p.toLowerCase();
                            if (k === 'r') return true;
                            if (k === 'k') {
                                const d = Math.abs(nx - kx) + Math.abs(ny - ky);
                                if (d === 1) return true;
                            }
                        }
                        jumped = true;
                    } else {
                        if (isEnemy(p) && p.toLowerCase() === 'c') return true;
                        break;
                    }
                }
                nx += dx; ny += dy;
            }
        }
        if (kingsFacing()) return true;

        const knightOffsets = [
            [1, 2, 0, 1],[-1, 2, 0, 1],[1,-2,0,-1],[-1,-2,0,-1],
            [2, 1, 1, 0],[2,-1, 1, 0],[-2, 1,-1, 0],[-2,-1,-1, 0]
        ];
        for (const [dx, dy, lx, ly] of knightOffsets) {
            const nx = kx + dx, ny = ky + dy;
            if (nx < 0 || nx > 8 || ny < 0 || ny > 9) continue;
            const p = board[ny][nx];
            if (!p || !isEnemy(p)) continue;
            if (p.toLowerCase() !== 'n') continue;
            const legX = nx - (Math.abs(dx) === 2 ? Math.sign(dx) : 0);
            const legY = ny - (Math.abs(dy) === 2 ? Math.sign(dy) : 0);
            if (board[legY] && board[legY][legX]) continue;
            return true;
        }

        if (side === 'red') {
            if (ky - 1 >= 0 && board[ky - 1][kx] === 'p') return true;
            if (kx - 1 >= 0 && board[ky][kx - 1] === 'p') return true;
            if (kx + 1 <= 8 && board[ky][kx + 1] === 'p') return true;
        } else {
            if (ky + 1 <= 9 && board[ky + 1][kx] === 'P') return true;
            if (kx - 1 >= 0 && board[ky][kx - 1] === 'P') return true;
            if (kx + 1 <= 8 && board[ky][kx + 1] === 'P') return true;
        }
        return false;
    }

    function getLegalMoves(x, y) {
        const p = board[y][x];
        if (!p) return [];
        const moves = getPseudoMoves(x, y);
        const side = isRed(p) ? 'red' : 'black';
        const legal = [];
        for (const m of moves) {
            const cap = board[m.y][m.x];
            board[m.y][m.x] = p;
            board[y][x] = 0;
            const bad = isInCheck(side);
            board[y][x] = p;
            board[m.y][m.x] = cap;
            if (!bad) legal.push(m);
        }
        return legal;
    }

    function evaluate() {
        let s = 0;
        for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
            const p = board[y][x];
            if (!p) continue;
            const v = VALUES[p.toLowerCase()];
            s += isRed(p) ? v : -v;
        }
        return s;
    }

    function getAllLegalMoves(side) {
        const result = [];
        for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
            const p = board[y][x];
            if (!p) continue;
            if (side === 'red' && !isRed(p)) continue;
            if (side === 'black' && !isBlack(p)) continue;
            getLegalMoves(x, y).forEach(m => result.push({ from: { x, y }, to: m }));
        }
        result.sort((a, b) => {
            const pa = board[a.to.y][a.to.x];
            const pb = board[b.to.y][b.to.x];
            const va = pa ? VALUES[pa.toLowerCase()] : 0;
            const vb = pb ? VALUES[pb.toLowerCase()] : 0;
            return vb - va;
        });
        return result;
    }


    function chooseMove(side, depth = 2, budget = 650) {
        const end = Date.now() + budget;
        const moves = getAllLegalMoves(side);
        if (!moves.length) return null;
        const maximizing = side === 'red';
        let selected = moves[0], nodes = 0;
        const expired = {};
        function search(remaining, alpha, beta, redTurn) {
            if ((++nodes & 63) === 0 && Date.now() > end) throw expired;
            if (!findKing('red')) return -999999;
            if (!findKing('black')) return 999999;
            const options = getAllLegalMoves(redTurn ? 'red' : 'black');
            if (!options.length) return redTurn ? -999999 : 999999;
            if (!remaining) return evaluate();
            let best = redTurn ? -Infinity : Infinity;
            for (const move of options) {
                const piece = board[move.from.y][move.from.x], cap = board[move.to.y][move.to.x];
                board[move.to.y][move.to.x] = piece; board[move.from.y][move.from.x] = 0;
                let score;
                try { score = search(remaining - 1, alpha, beta, !redTurn); }
                finally { board[move.from.y][move.from.x] = piece; board[move.to.y][move.to.x] = cap; }
                best = redTurn ? Math.max(best, score) : Math.min(best, score);
                if (redTurn) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
                if (beta <= alpha) break;
            }
            return best;
        }
        for (let d = 1; d <= Math.min(3, Math.max(1, depth)); d++) {
            let best = maximizing ? -Infinity : Infinity, bestMove = selected;
            try {
                for (const move of moves) {
                    if (Date.now() > end) throw expired;
                    const piece = board[move.from.y][move.from.x], cap = board[move.to.y][move.to.x];
                    board[move.to.y][move.to.x] = piece; board[move.from.y][move.from.x] = 0;
                    let score;
                    try { score = search(d - 1, -Infinity, Infinity, !maximizing); }
                    finally { board[move.from.y][move.from.x] = piece; board[move.to.y][move.to.x] = cap; }
                    if (maximizing ? score > best : score < best) { best = score; bestMove = move; }
                }
                selected = bestMove;
            } catch (error) { if (error !== expired) throw error; break; }
        }
        return selected;
    }
    return { getLegalMoves, getPseudoMoves, findKing, isInCheck, chooseMove, setBoard: next => { board = next; } };
}
if (typeof module !== 'undefined') module.exports = { createChessEngine };
