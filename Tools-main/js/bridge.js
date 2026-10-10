(function () {
    'use strict';

    const PROTOCOL = 'tool-hub';
    const ORIGIN = window.location.origin;

    window.GameBridge = {
        notifyPause(iframe) {
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                    { protocol: PROTOCOL, type: 'pause' },
                    ORIGIN
                );
            }
        },
        onParentMessage(handler) {
            window.addEventListener('message', (e) => {
                if (e.origin !== ORIGIN) return;
                if (e.source !== window.parent) return;
                if (!e.data || e.data.protocol !== PROTOCOL) return;
                handler(e.data);
            });
        },
        notifyActive() {
            if (window.parent !== window) window.parent.postMessage({ protocol: PROTOCOL, type: 'active' }, ORIGIN);
        },
        notifyReady() {
            if (window.parent !== window) {
                window.parent.postMessage(
                    { protocol: PROTOCOL, type: 'ready' },
                    ORIGIN
                );
            }
        },
        onVisibilityChange(fn) {
            document.addEventListener('visibilitychange', () => {
                try { fn(document.hidden); } catch (e) { console.error(e); }
            });
        }
    };
})();
