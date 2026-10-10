'use strict';

/* Shared by embedded and direct app pages; no game state lives in the parent. */
document.addEventListener('DOMContentLoaded', () => {
    const games = location.pathname.includes('/Games-main/');
    const id = location.pathname.split('/').pop().replace(/\.html$/, '');
    if (window.parent === window) {
        const back = document.createElement('a');
        back.className = 'standalone-back'; back.href = `../../index.html#${games ? 'game' : 'tool'}/${id}`;
        back.textContent = '← 返回个人主页';
        document.body.prepend(back);
        document.body.classList.add('standalone-app');
    }
    GameBridge.onParentMessage(message => {
        if (message.type === 'theme') {
            const hue = Number(message.payload?.hue);
            if (Number.isFinite(hue) && hue >= 0 && hue <= 360) document.documentElement.style.setProperty('--accent-hue', hue);
        }
        if (message.type === 'pause' && 'speechSynthesis' in window) speechSynthesis.cancel();
    });
    if ('speechSynthesis' in window) {
        document.addEventListener('visibilitychange', () => { if (document.hidden) speechSynthesis.cancel(); });
        window.addEventListener('pagehide', () => speechSynthesis.cancel());
    }
    // Let existing delegated board click handlers also handle Enter and Space.
    const cells = '.mine-cell, .nono-cell, .lo-cell, .block:not(.hint), .chess-cell, .gomoku-point';
    function accessibleCells() {
        document.querySelectorAll(cells).forEach(cell => {
            cell.tabIndex = 0;
            cell.setAttribute('role', 'button');
            if (!cell.hasAttribute('aria-label')) cell.setAttribute('aria-label', cell.textContent.trim() || `棋盘格 ${[...cell.parentElement.children].indexOf(cell) + 1}`);
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', modal.querySelector('h2')?.textContent || '游戏提示');
        });
    }
    accessibleCells();
    new MutationObserver(accessibleCells).observe(document.querySelector('.game-inner'), { childList: true, subtree: true });
    document.addEventListener('keydown', event => {
        const cell = event.target.closest(cells);
        if (cell && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); cell.click(); }
    });
    GameBridge.notifyReady();
});
