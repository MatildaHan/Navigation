'use strict';

/* Size puzzle grids from the actual card area left by their visible controls. */
const GameLayout = (() => {
    const number = value => parseFloat(value) || 0;
    function insets(node) {
        const style = getComputedStyle(node);
        return {
            insetX: number(style.paddingLeft) + number(style.paddingRight) + number(style.borderLeftWidth) + number(style.borderRightWidth),
            insetY: number(style.paddingTop) + number(style.paddingBottom) + number(style.borderTopWidth) + number(style.borderBottomWidth),
        };
    }
    function boardArea(board) {
        const inner = board.closest('.game-inner');
        const content = board.parentElement;
        const innerStyle = getComputedStyle(inner);
        const contentStyle = getComputedStyle(content);
        const siblings = [...content.children].filter(node => node !== board && getComputedStyle(node).display !== 'none');
        const controls = siblings.reduce((height, node) => {
            const style = getComputedStyle(node);
            return height + node.getBoundingClientRect().height + number(style.marginTop) + number(style.marginBottom);
        }, 0);
        return {
            width: Math.max(0, content.clientWidth - number(contentStyle.paddingLeft) - number(contentStyle.paddingRight)),
            height: Math.max(0, inner.clientHeight - number(innerStyle.paddingTop) - number(innerStyle.paddingBottom)
                - number(contentStyle.paddingTop) - number(contentStyle.paddingBottom)
                - controls - siblings.length * number(contentStyle.rowGap)),
        };
    }
    function fitCells({ width, height, rows, cols, gap = 0, insetX = 0, insetY = 0, minCell = 8 }) {
        const byWidth = (width - insetX - (cols - 1) * gap) / cols;
        const byHeight = (height - insetY - (rows - 1) * gap) / rows;
        // At very small sizes keep cells usable and allow the existing local scroll.
        return Math.max(minCell, Math.floor(Math.min(byWidth, byHeight)));
    }
    return { boardArea, insets, fitCells };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = GameLayout;
