/**
 * 父子页面通信协议
 *
 * 父 → 子：{ protocol: 'game-hub', type: 'pause' | 'resume' }
 * 子 → 父：{ protocol: 'game-hub', type: 'ready' | 'gameover', payload? }
 *
 * 安全：
 *   - postMessage 使用 location.origin 而非 '*'
 *   - 接收端校验 e.origin === location.origin 且 e.source 是期望的 window
 */
(function () {
    'use strict';

    const PROTOCOL = 'game-hub';
    const ORIGIN = window.location.origin;

    window.GameBridge = {
        // ---------- 父页面 API ----------
        // 通知 iframe 暂停
        notifyPause(iframe) {
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                    { protocol: PROTOCOL, type: 'pause' },
                    ORIGIN
                );
            }
        },
        // 通知 iframe 恢复
        notifyResume(iframe) {
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                    { protocol: PROTOCOL, type: 'resume' },
                    ORIGIN
                );
            }
        },

        // ---------- iframe 内部 API ----------
        // 监听来自父页面的消息（只接受同源 + 父窗口）
        onParentMessage(handler) {
            window.addEventListener('message', (e) => {
                if (e.origin !== ORIGIN) return;
                if (e.source !== window.parent) return;
                if (!e.data || e.data.protocol !== PROTOCOL) return;
                handler(e.data);
            });
        },

        // 通知父页面已就绪
        notifyReady() {
            if (window.parent !== window) {
                window.parent.postMessage(
                    { protocol: PROTOCOL, type: 'ready' },
                    ORIGIN
                );
            }
        },

        // 通知父页面游戏结束（可选）
        notifyGameOver(payload) {
            if (window.parent !== window) {
                window.parent.postMessage(
                    { protocol: PROTOCOL, type: 'gameover', payload },
                    ORIGIN
                );
            }
        }
    };

    // ---------- 通用：页面不可见时暂停（iframe 内部自动生效） ----------
    // 各游戏只需通过 GameBridge.onVisibilityChange 注册回调
    const visibilityHandlers = [];
    document.addEventListener('visibilitychange', () => {
        const hidden = document.hidden;
        visibilityHandlers.forEach(fn => {
            try { fn(hidden); } catch (err) { console.error(err); }
        });
    });
    window.GameBridge.onVisibilityChange = (fn) => {
        visibilityHandlers.push(fn);
    };
})();
