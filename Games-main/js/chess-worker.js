'use strict';
importScripts('chess-engine.js');
self.onmessage = event => {
    const { board, side, depth } = event.data;
    const engine = createChessEngine(board);
    self.postMessage(engine.chooseMove(side, depth));
};
