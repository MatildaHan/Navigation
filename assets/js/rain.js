/* 可选雨效：仅依赖浏览器 API；移除 index.html 的两处引用即可卸载。 */
(() => {
    'use strict';

    function mount() {
        if (document.querySelector('.navigation-rain')) return;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.className = 'navigation-rain';
        canvas.setAttribute('aria-hidden', 'true');

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'navigation-rain-toggle';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-label', '雨效');
        const label = document.createElement('span');
        label.textContent = '雨效';
        const indicator = document.createElement('span');
        indicator.className = 'navigation-rain-switch';
        indicator.setAttribute('aria-hidden', 'true');
        toggle.append(label, indicator);
        document.body.append(canvas, toggle);

        const storageKey = 'navigation-rain-enabled';
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
        let enabled = !reducedMotion.matches;
        // 存储受限时仍可使用开关，不影响网站初始化。
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved === 'true' || saved === 'false') enabled = saved === 'true';
        } catch { /* 使用默认值 */ }

        let width = 0;
        let height = 0;
        let drops = [];
        let splashes = [];
        let surfaces = [];
        let frame = 0;
        let lastTime = 0;
        let surfaceTime = 0;
        const random = (min, max) => min + Math.random() * (max - min);

        function makeDrop(initial = false) {
            return {
                x: random(0, width + 80),
                y: initial ? random(-height, height) : random(-100, -40),
                length: random(16, 42),
                speed: random(320, 650),
                thickness: random(0.6, 1.25),
                alpha: random(0.12, 0.35),
            };
        }

        function readSurfaces() {
            surfaces = [...document.querySelectorAll('.main-board, .sidebar, .bottom-dock')]
                .map(node => node.getBoundingClientRect())
                .filter(rect => rect.width > 0 && rect.height > 0 && rect.top > 0 && rect.top < height)
                .map(rect => ({ left: rect.left, right: rect.right, top: rect.top }));
            surfaces.push({ left: -100, right: width + 100, top: height - 1 });
            surfaces.sort((a, b) => a.top - b.top);
        }

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            const scale = Math.min(window.devicePixelRatio || 1, width <= 860 ? 1 : 1.5);
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(scale, 0, 0, scale, 0, 0);
            const count = Math.round(Math.max(18, Math.min(72, width * height / 18000)));
            drops = Array.from({ length: count }, () => makeDrop(true));
            splashes = [];
            readSurfaces();
        }

        function splash(x, y) {
            const count = width <= 860 ? 3 : 5;
            for (let i = 0; i < count; i += 1) {
                splashes.push({ x, y, vx: random(-100, 100), vy: random(-150, -65),
                    age: 0, life: random(0.2, 0.45), radius: random(0.6, 1.4) });
            }
        }

        function draw(time) {
            const dt = Math.min((time - lastTime) / 1000 || 1 / 60, 0.04);
            lastTime = time;
            if (time - surfaceTime > 250) {
                readSurfaces();
                surfaceTime = time;
            }
            context.clearRect(0, 0, width, height);
            context.lineCap = 'round';
            context.strokeStyle = '#ffffff';
            context.fillStyle = '#ffffff';
            for (const drop of drops) {
                const previousY = drop.y;
                drop.x -= drop.speed * dt * 0.13;
                drop.y += drop.speed * dt;
                const hit = surfaces.find(surface => previousY <= surface.top && drop.y >= surface.top
                    && drop.x >= surface.left && drop.x <= surface.right);
                if (hit) {
                    splash(drop.x, hit.top);
                    Object.assign(drop, makeDrop());
                    continue;
                }
                if (drop.y - drop.length > height || drop.x < -drop.length) {
                    Object.assign(drop, makeDrop());
                    continue;
                }
                context.globalAlpha = drop.alpha;
                context.lineWidth = drop.thickness;
                context.beginPath();
                context.moveTo(drop.x, drop.y);
                context.lineTo(drop.x + drop.length * 0.13, drop.y - drop.length);
                context.stroke();
            }
            splashes = splashes.filter(particle => {
                particle.age += dt;
                if (particle.age >= particle.life) return false;
                particle.vy += 650 * dt;
                particle.x += particle.vx * dt;
                particle.y += particle.vy * dt;
                context.globalAlpha = 0.3 * (1 - particle.age / particle.life);
                context.beginPath();
                context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                context.fill();
                return true;
            });
            context.globalAlpha = 1;
            frame = requestAnimationFrame(draw);
        }

        function sync() {
            toggle.setAttribute('aria-checked', String(enabled));
            toggle.title = enabled ? '关闭雨效' : '开启雨效';
            canvas.hidden = !enabled;
            cancelAnimationFrame(frame);
            frame = 0;
            lastTime = 0;
            if (enabled && !document.hidden) frame = requestAnimationFrame(draw);
            else context.clearRect(0, 0, width, height);
        }

        toggle.addEventListener('click', () => {
            enabled = !enabled;
            try { localStorage.setItem(storageKey, String(enabled)); } catch { /* 本次切换仍然生效 */ }
            sync();
        });
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches) { enabled = false; sync(); }
        });
        window.addEventListener('storage', event => {
            if (event.key !== storageKey && event.key !== null) return;
            enabled = event.newValue === 'true' || event.newValue === null && !reducedMotion.matches;
            sync();
        });
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
        window.addEventListener('pageshow', sync);
        window.addEventListener('resize', resize);
        resize();
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
})();
