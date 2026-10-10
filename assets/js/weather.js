/* 可选天气效果：仅依赖浏览器 API；移除 index.html 的两处引用即可卸载。 */
(() => {
    'use strict';
    const MODES = [
        { id: 'sun', name: '晴', icon: 'fa-sun' },
        { id: 'rain', name: '雨', icon: 'fa-cloud-rain' },
        { id: 'snow', name: '雪', icon: 'fa-snowflake' },
        { id: 'leaves', name: '落叶', icon: 'fa-leaf' },
        { id: 'off', name: '关闭', icon: 'fa-ban' },
    ];
    const STORAGE_KEY = 'navigation-weather-mode';
    const LEGACY_KEY = 'navigation-rain-enabled';
    const SLOPE = 0.35; // 粒子共用右上到左下的风向；阳光从右上方发散。
    const random = (min, max) => min + Math.random() * (max - min);
    const validMode = value => MODES.some(item => item.id === value);

    function mount() {
        if (document.querySelector('.navigation-weather')) return;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.className = 'navigation-weather';
        canvas.setAttribute('aria-hidden', 'true');

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'navigation-weather-toggle';
        const icon = document.createElement('i');
        const cycleIcon = document.createElement('i');
        cycleIcon.className = 'fa-solid fa-arrows-rotate';
        for (const node of [icon, cycleIcon]) node.setAttribute('aria-hidden', 'true');
        toggle.append(icon, cycleIcon);
        document.body.append(canvas, toggle);

        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
        function readPreference() {
            const fallback = reducedMotion.matches ? 'off' : 'rain';
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (validMode(saved)) return saved;
                if (saved === 'fog') return 'off';
                // 延续旧雨效的关闭选择；其余模式以后只读取新的独立偏好。
                if (saved === null && localStorage.getItem(LEGACY_KEY) === 'false') return 'off';
            } catch { /* 存储不可用时仍可切换 */ }
            return fallback;
        }

        let mode = readPreference();
        let width = 0;
        let height = 0;
        let particles = [];
        let splashes = [];
        let surfaces = [];
        let frame = 0;
        let lastTime = 0;
        let surfaceTime = 0;
        let sunlight = null;

        function position(initial) {
            if (initial) return { x: random(0, width), y: random(-40, height) };
            return Math.random() < 0.75
                ? { x: random(0, width + 80), y: random(-100, -40) }
                : { x: random(width + 20, width + 80), y: random(0, height * 0.8) };
        }

        function makeParticle(initial = false) {
            const base = { ...position(initial), phase: random(0, Math.PI * 2) };
            if (mode === 'rain') return { ...base, length: random(16, 42), speed: random(320, 650),
                thickness: random(0.6, 1.25), alpha: random(0.12, 0.35) };
            if (mode === 'snow') return { ...base, radius: random(1, 3.2), speed: random(24, 65),
                alpha: random(0.35, 0.75), sway: random(3, 10) };
            if (mode === 'leaves') return { ...base, radius: random(4, width <= 860 ? 8 : 11),
                speed: random(35, 75), spin: random(-0.7, 0.7), alpha: random(0.45, 0.8),
                color: ['#d9a24c', '#bd783f', '#c8bb67', '#a9b77a'][Math.floor(random(0, 4))] };
            return { ...base, radius: random(0.6, 1.6), speed: random(10, 22), alpha: random(0.15, 0.4) };
        }

        function seed() {
            const area = width * height;
            const counts = { rain: Math.max(18, Math.min(72, area / 18000)),
                snow: Math.max(26, Math.min(100, area / 13000)),
                leaves: Math.max(10, Math.min(26, area / 45000)), sun: 0, off: 0 };
            particles = Array.from({ length: Math.round(counts[mode]) }, () => makeParticle(true));
            splashes = [];
            sunlight = mode === 'sun' ? buildSunlight() : null;
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
            seed();
            readSurfaces();
        }

        function splash(x, y) {
            for (let i = 0; i < (width <= 860 ? 3 : 5); i += 1) {
                splashes.push({ x, y, vx: random(-100, 100), vy: random(-150, -65),
                    age: 0, life: random(0.2, 0.45), radius: random(0.6, 1.4) });
            }
        }

        function drawRain(dt) {
            context.lineCap = 'round';
            context.strokeStyle = '#fff';
            context.fillStyle = '#fff';
            for (const drop of particles) {
                const previousY = drop.y;
                drop.x -= drop.speed * dt * SLOPE;
                drop.y += drop.speed * dt;
                const hit = surfaces.find(surface => previousY <= surface.top && drop.y >= surface.top
                    && drop.x >= surface.left && drop.x <= surface.right);
                if (hit) {
                    splash(drop.x, hit.top);
                    Object.assign(drop, makeParticle());
                    continue;
                }
                if (drop.y - drop.length > height || drop.x < -drop.length) {
                    Object.assign(drop, makeParticle());
                    continue;
                }
                context.globalAlpha = drop.alpha;
                context.lineWidth = drop.thickness;
                context.beginPath();
                context.moveTo(drop.x, drop.y);
                context.lineTo(drop.x + drop.length * SLOPE, drop.y - drop.length);
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
        }

        function drift(particle, dt, margin = 40) {
            particle.x -= particle.speed * dt * SLOPE;
            particle.y += particle.speed * dt;
            particle.phase += dt;
            if (particle.y > height + margin || particle.x < -margin) Object.assign(particle, makeParticle());
        }

        function drawSnow(dt) {
            context.fillStyle = '#fff';
            for (const flake of particles) {
                drift(flake, dt);
                const x = flake.x + Math.sin(flake.phase) * flake.sway;
                context.globalAlpha = flake.alpha;
                context.beginPath();
                context.arc(x, flake.y, flake.radius, 0, Math.PI * 2);
                context.fill();
            }
        }

        function drawLeaves(dt) {
            for (const leaf of particles) {
                drift(leaf, dt);
                context.save();
                context.translate(leaf.x + Math.sin(leaf.phase) * 10, leaf.y);
                context.rotate(leaf.phase * leaf.spin);
                context.scale(0.65 + Math.sin(leaf.phase * 1.5) * 0.3, 1);
                context.globalAlpha = leaf.alpha;
                context.fillStyle = leaf.color;
                const r = leaf.radius;
                context.beginPath();
                context.moveTo(0, -r);
                context.bezierCurveTo(r * 1.25, -r * 0.3, r, r * 0.6, 0, r);
                context.bezierCurveTo(-r, r * 0.6, -r * 1.25, -r * 0.3, 0, -r);
                context.fill();
                context.strokeStyle = 'rgba(80, 50, 20, 0.4)';
                context.lineWidth = 0.7;
                context.beginPath();
                context.moveTo(0, -r * 0.7);
                context.lineTo(0, r * 1.2);
                context.stroke();
                context.restore();
            }
        }

        function buildSunlight() {
            // 缓存一束宽阔、柔化的扇形光，随距离逐渐变淡。
            const layer = document.createElement('canvas');
            layer.width = canvas.width;
            layer.height = canvas.height;
            const light = layer.getContext('2d');
            if (!light) return null;
            light.setTransform(layer.width / width, 0, 0, layer.height / height, 0, 0);
            const source = { x: width * 1.03, y: -height * 0.08 };
            const distance = Math.hypot(width, height) * 1.15;
            const beam = light.createRadialGradient(source.x, source.y, 0, source.x, source.y, distance);
            beam.addColorStop(0, 'rgba(255, 242, 207, 0.2)');
            beam.addColorStop(0.15, 'rgba(255, 242, 207, 0.18)');
            beam.addColorStop(0.45, 'rgba(255, 242, 207, 0.09)');
            beam.addColorStop(0.8, 'rgba(255, 242, 207, 0.025)');
            beam.addColorStop(1, 'rgba(255, 242, 207, 0)');
            light.fillStyle = beam;
            const center = 132 * Math.PI / 180;
            const spread = 0.84; // 发散范围扩大为原来的两倍。
            // 连续分片羽化一束光的两侧，不再分成多条光线。
            const slices = 80;
            for (let i = 0; i < slices; i += 1) {
                const offset = (i + 0.5) / slices * 2 - 1;
                light.globalAlpha = Math.exp(-4 * offset * offset);
                light.beginPath();
                light.moveTo(source.x, source.y);
                light.arc(source.x, source.y, distance,
                    center - spread + i / slices * spread * 2,
                    center - spread + (i + 1) / slices * spread * 2);
                light.closePath();
                light.fill();
            }
            // 少量随机散景光斑，保持低透明度，并与光束一起缓存。
            light.globalAlpha = 1;
            const spotCount = Math.round(Math.max(6, Math.min(12, width * height / 120000)));
            for (let i = 0; i < spotCount; i += 1) {
                const x = random(width * 0.08, width * 0.92);
                const y = random(height * 0.08, height * 0.92);
                const radius = random(18, 50) * (width <= 860 ? 0.6 : 1);
                const alpha = random(0.04, 0.08);
                const spot = light.createRadialGradient(x, y, 0, x, y, radius);
                spot.addColorStop(0, `rgba(255, 246, 220, ${alpha * 0.6})`);
                spot.addColorStop(0.65, `rgba(255, 246, 220, ${alpha * 0.4})`);
                spot.addColorStop(0.85, `rgba(255, 246, 220, ${alpha})`);
                spot.addColorStop(1, 'rgba(255, 246, 220, 0)');
                light.fillStyle = spot;
                light.beginPath();
                light.arc(x, y, radius, 0, Math.PI * 2);
                light.fill();
            }
            return layer;
        }

        function drawSun() {
            if (sunlight) context.drawImage(sunlight, 0, 0, width, height);
        }

        const renderers = { sun: drawSun, rain: drawRain, snow: drawSnow, leaves: drawLeaves };
        function draw(time) {
            const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.04) : 1 / 60;
            lastTime = time;
            if (mode === 'rain' && time - surfaceTime > 250) {
                readSurfaces();
                surfaceTime = time;
            }
            context.clearRect(0, 0, width, height);
            context.globalAlpha = 1;
            renderers[mode](dt);
            context.globalAlpha = 1;
            frame = requestAnimationFrame(draw);
        }

        function sync() {
            const index = MODES.findIndex(item => item.id === mode);
            const current = MODES[index];
            const next = MODES[(index + 1) % MODES.length];
            icon.className = `fa-solid ${current.icon}`;
            toggle.dataset.mode = mode;
            toggle.setAttribute('aria-label', `天气效果：${current.name}，切换为${next.name}`);
            toggle.title = `${current.name} → ${next.name}`;
            canvas.hidden = mode === 'off';
            cancelAnimationFrame(frame);
            frame = 0;
            lastTime = 0;
            context.clearRect(0, 0, width, height);
            if (mode !== 'off' && !document.hidden) frame = requestAnimationFrame(draw);
        }

        function select(value, remember = false) {
            mode = validMode(value) ? value : value === 'fog' || reducedMotion.matches ? 'off' : 'rain';
            if (remember) {
                try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* 本次切换仍然生效 */ }
            }
            seed();
            sync();
        }

        toggle.addEventListener('click', () => {
            const index = MODES.findIndex(item => item.id === mode);
            select(MODES[(index + 1) % MODES.length].id, true);
        });
        reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) select('off'); });
        window.addEventListener('storage', event => {
            if (event.key === STORAGE_KEY) select(event.newValue);
            else if (event.key === null) select(readPreference());
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
