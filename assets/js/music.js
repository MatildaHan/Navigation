'use strict';

function parseTimedLyrics(raw) {
    const text = String(raw).slice(0, 262144);
    const offset = Math.max(-600000, Math.min(600000, Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1]) || 0)) / 1000;
    const timed = [], plain = [];
    for (const line of text.split(/\r?\n/)) {
        const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g)].filter(match => Number(match[2]) < 60);
        const content = line.replace(/\[[^\]]*\]/g, '').trim();
        if (!content) continue;
        if (stamps.length) for (const stamp of stamps) timed.push({ time: Math.max(0, Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] || '0'}`) + offset), text: content });
        else if (!/^\s*\[[a-z]+:/i.test(line)) plain.push({ time: 0, text: line.trim() });
    }
    return timed.length ? { timed: true, lines: timed.sort((a, b) => a.time - b.time) } : { timed: false, lines: plain };
}

function renderMusicDetail(body, CFG, audio, card) {
    const tracks = (CFG.playlist || []).filter(track => safeUrl(track.音频, MEDIA_PROTOCOLS));
    const formatTime = value => `${Math.floor((Number.isFinite(value) ? value : 0) / 60)}:${String(Math.floor((Number.isFinite(value) ? value : 0) % 60)).padStart(2, '0')}`;
    const artistOf = track => track?.歌手 || track?.艺术家 || '个人歌单';
    const currentTrack = () => tracks.find(track => safeUrl(track.音频, MEDIA_PROTOCOLS) === audio.src);
    const playing = () => !audio.paused && !audio.ended && !audio.error;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = [];
    const listen = (node, type, callback) => { node.addEventListener(type, callback); listeners.push(() => node.removeEventListener(type, callback)); };
    function icon(name) {
        const paths = {
            play: 'M8 5L19 12L8 19Z', pause: 'M8 5V19M16 5V19',
            prev: 'M5 5V19M19 5L8 12L19 19Z', next: 'M19 5V19M5 5L16 12L5 19Z',
            repeat: 'M4 9V7A3 3 0 0 1 7 4H19L16 1M19 4L16 7M20 15V17A3 3 0 0 1 17 20H5L8 23M5 20L8 17',
            heart: 'M20.8 4.6A5.5 5.5 0 0 0 13 4.6L12 5.7L10.9 4.6A5.5 5.5 0 0 0 3.1 12.4L12 21L20.8 12.4A5.5 5.5 0 0 0 20.8 4.6Z',
            volume: 'M4 9H8L13 5V19L8 15H4ZM17 8A6 6 0 0 1 17 16M20 5A10 10 0 0 1 20 19', mute: 'M4 9H8L13 5V19L8 15H4ZM17 9L23 15M23 9L17 15',
        };
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name]); svg.appendChild(path);
        return svg;
    }
    const layout = el('div', 'music-layout'); layout.setAttribute('aria-label', '音乐播放器');
    const left = el('section', 'music-player-side');
    const divider = el('div', 'music-divider');
    const dividerTitle = el('div', 'music-divider-title'), dividerArtist = el('div', 'music-divider-artist');
    divider.append(dividerTitle, dividerArtist);
    const right = el('section', 'music-content-side');
    layout.append(left, divider, right); body.appendChild(layout); left.appendChild(card);

    const art = document.getElementById('player-art'), marker = document.createComment('album art position'); art.before(marker);
    const scene = el('div', 'record-scene'), disc = el('div', 'record-vinyl'), label = el('div', 'record-label');
    disc.append(label, el('span', 'record-hole')); scene.append(disc, art); marker.before(scene);
    const artist = el('p', 'music-artist'); document.getElementById('track-title').after(artist);
    const mode = el('p', 'music-mode'), status = el('p', 'music-live-status'); status.setAttribute('role', 'status');
    const playButton = document.getElementById('play-btn'), repeatButton = document.getElementById('btn-repeat'), heartButton = document.getElementById('btn-heart');
    const savedButtons = [...card.querySelectorAll('.player-controls button')].map(button => [button, [...button.childNodes]]);
    const iconNames = { 'btn-repeat': 'repeat', 'btn-prev': 'prev', 'play-btn': 'play', 'btn-next': 'next', 'btn-heart': 'heart' };
    savedButtons.forEach(([button]) => button.replaceChildren(icon(iconNames[button.id])));
    const timeline = el('div', 'music-timeline'), time = el('span'), duration = el('span');
    const seek = el('input'); seek.type = 'range'; seek.min = 0; seek.step = .1; seek.setAttribute('aria-label', '播放进度');
    timeline.append(time, seek, duration); card.querySelector('.player-controls').before(timeline);
    const volumeRow = el('div', 'music-volume-row'), mute = el('button', 'music-mute'); mute.type = 'button';
    const volume = el('input'); volume.type = 'range'; volume.min = 0; volume.max = 1; volume.step = .01; volume.setAttribute('aria-label', '音量');
    const volumeValue = el('span', 'music-volume-value'); volumeRow.append(mute, volume, volumeValue);
    card.append(mode, volumeRow, status);
    listen(seek, 'input', () => { if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Math.min(audio.duration, Number(seek.value)); });
    let audibleVolume = audio.volume || .6;
    listen(volume, 'input', () => { audio.volume = Number(volume.value); if (audio.volume > 0) audibleVolume = audio.volume; audio.muted = audio.volume === 0; });
    listen(mute, 'click', () => { audio.muted = !audio.muted; if (!audio.muted && audio.volume === 0) audio.volume = audibleVolume; });

    const tabs = el('div', 'music-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '音乐内容');
    const lyricsTab = el('button', 'music-tab', '歌词'), listTab = el('button', 'music-tab', `歌单 · ${tracks.length}`);
    const lyricsPanel = el('div', 'music-tab-panel music-lyrics-panel'), listPanel = el('div', 'music-tab-panel music-list-panel');
    [lyricsTab, listTab].forEach((tab, index) => {
        tab.type = 'button'; tab.id = `music-tab-${index}`; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `music-panel-${index}`);
    });
    [lyricsPanel, listPanel].forEach((panel, index) => { panel.id = `music-panel-${index}`; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `music-tab-${index}`); panel.tabIndex = 0; });
    tabs.append(lyricsTab, listTab); right.append(tabs, lyricsPanel, listPanel);
    let lastLine = -1, timedLyrics = false, lyricLines = [], lyricElements = [], lyricRequest, disposed = false;
    function activate(index) {
        [lyricsTab, listTab].forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
        lyricsPanel.hidden = index !== 0; listPanel.hidden = index !== 1;
        lastLine = -1; sync();
    }
    listen(lyricsTab, 'click', () => activate(0)); listen(listTab, 'click', () => activate(1));
    listen(tabs, 'keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const index = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : event.target === lyricsTab ? 1 : 0;
        activate(index); [lyricsTab, listTab][index].focus();
    });
    const list = el('ul', 'music-song-list'); listPanel.appendChild(list);
    const rows = tracks.map((track, index) => {
        const li = el('li'), button = el('button', 'music-song-row'); button.type = 'button'; button.dataset.trackUrl = safeUrl(track.音频, MEDIA_PROTOCOLS);
        const cover = el('span', 'music-song-cover'), coverUrl = safeUrl(track.封面, MEDIA_PROTOCOLS); if (coverUrl) cover.style.backgroundImage = cssUrl(coverUrl);
        const text = el('span', 'music-song-text'); text.append(el('span', 'music-song-title', track.歌曲名 || '未知曲目'), el('small', '', artistOf(track)));
        const action = el('span', 'music-song-action'); action.appendChild(icon('play')); button.append(cover, text, action); li.appendChild(button); list.appendChild(li);
        listen(button, 'click', () => { if (button.dataset.trackUrl === audio.src) playButton.click(); else audio.dispatchEvent(new CustomEvent('selecttrack', { detail: index })); });
        return { button, action, track };
    });
    if (!tracks.length) list.appendChild(el('li', 'music-placeholder', '暂无曲目'));
    function placeholder(title, text = '') {
        lyricsPanel.replaceChildren();
        const box = el('div', 'music-placeholder'); box.append(el('span', 'music-placeholder-mark', '♪'), el('h2', '', title));
        if (text) box.appendChild(el('p', '', text)); lyricsPanel.appendChild(box);
    }
    async function refreshTrack() {
        lyricRequest?.abort(); lyricRequest = new AbortController();
        const request = lyricRequest, track = currentTrack(), name = track?.歌曲名 || '暂无曲目';
        dividerTitle.textContent = name; dividerTitle.title = name; dividerArtist.textContent = artistOf(track); artist.textContent = artistOf(track);
        const cover = safeUrl(track?.封面, MEDIA_PROTOCOLS); label.style.backgroundImage = cover ? cssUrl(cover) : '';
        lyricLines = []; lyricElements = []; timedLyrics = false; lastLine = -1;
        placeholder('暂无歌词', track?.说明 || '切换到歌单，选择你想听的音乐。');
        const lyricUrl = safeUrl(track?.歌词, ['http:', 'https:']);
        if (lyricUrl) {
            try {
                const response = await fetch(lyricUrl, { signal: request.signal });
                if (!response.ok) throw new Error('lyrics unavailable');
                const raw = await response.text(); if (raw.length > 262144) throw new Error('lyrics too large');
                if (disposed || request.signal.aborted) return;
                const parsed = parseTimedLyrics(raw); timedLyrics = parsed.timed; lyricLines = parsed.lines;
                if (lyricLines.length) {
                    lyricsPanel.replaceChildren();
                    const inner = el('div', 'music-lyric-lines'); lyricsPanel.appendChild(inner);
                    lyricElements = lyricLines.map(line => {
                        const node = el(timedLyrics ? 'button' : 'p', 'music-lyric-line', line.text);
                        if (timedLyrics) { node.type = 'button'; node.setAttribute('aria-label', `跳转到 ${formatTime(line.time)}：${line.text}`); node.addEventListener('click', () => { if (Number.isFinite(audio.duration) && audio.seekable.length) audio.currentTime = Math.min(line.time, audio.duration); }); }
                        inner.appendChild(node); return node;
                    });
                }
            } catch (error) { if (!disposed && !request.signal.aborted) placeholder('歌词暂时无法加载', track?.说明 || '音乐仍可正常播放。'); }
        }
        sync();
    }
    function sync() {
        if (disposed) return;
        const active = playing(); scene.classList.toggle('is-playing', active);
        playButton.replaceChildren(icon(active ? 'pause' : 'play'));
        heartButton.replaceChildren(icon('heart')); heartButton.classList.toggle('is-liked', heartButton.getAttribute('aria-pressed') === 'true');
        mode.textContent = audio.loop ? '单曲循环' : '列表循环';
        const message = !tracks.length ? '暂无可播放曲目' : audio.error ? '当前音频暂时无法播放，请重试。' : active ? '正在播放' : audio.currentTime > 0 ? '已暂停' : '选择歌曲，开始播放';
        if (status.textContent !== message) status.textContent = message;
        time.textContent = formatTime(audio.currentTime); duration.textContent = formatTime(audio.duration);
        seek.max = Number.isFinite(audio.duration) ? audio.duration : 0; seek.value = audio.currentTime; seek.disabled = !Number.isFinite(audio.duration) || audio.duration <= 0 || audio.seekable.length === 0;
        seek.setAttribute('aria-valuetext', `${time.textContent} / ${duration.textContent}`);
        volume.value = audio.volume; volumeValue.textContent = `${Math.round((audio.muted ? 0 : audio.volume) * 100)}%`;
        mute.replaceChildren(icon(audio.muted ? 'mute' : 'volume')); mute.setAttribute('aria-label', audio.muted ? '取消静音' : '静音'); mute.setAttribute('aria-pressed', String(audio.muted));
        rows.forEach(({ button, action, track }) => {
            const current = button.dataset.trackUrl === audio.src; button.classList.toggle('is-current', current); button.classList.toggle('is-playing', current && active);
            if (current) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
            button.setAttribute('aria-label', `${current && active ? '暂停' : '播放'}${track.歌曲名 || '未知曲目'}`); action.replaceChildren(icon(current && active ? 'pause' : 'play'));
        });
        if (timedLyrics) {
            let index = -1; for (let i = 0; i < lyricLines.length && lyricLines[i].time <= audio.currentTime; i++) index = i;
            lyricElements.forEach((node, i) => { node.classList.toggle('is-active', i === index); node.disabled = seek.disabled; if (i === index) node.setAttribute('aria-current', 'true'); else node.removeAttribute('aria-current'); });
            if (index !== lastLine && index >= 0 && !lyricsPanel.hidden) {
                const node = lyricElements[index], inner = node.parentElement;
                inner.scrollTo({ top: Math.max(0, node.offsetTop - inner.clientHeight / 2 + node.offsetHeight / 2), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
                lastLine = index;
            }
        }
    }
    ['timeupdate', 'durationchange', 'loadedmetadata', 'canplay', 'progress', 'seeked', 'emptied', 'play', 'pause', 'ended', 'error', 'volumechange'].forEach(type => listen(audio, type, sync));
    listen(audio, 'trackchange', refreshTrack); listen(repeatButton, 'click', sync); listen(heartButton, 'click', sync);
    activate(0); refreshTrack();
    return () => {
        disposed = true; lyricRequest?.abort(); listeners.forEach(remove => remove());
        marker.after(art); scene.remove(); marker.remove(); artist.remove(); timeline.remove(); mode.remove(); volumeRow.remove(); status.remove();
        savedButtons.forEach(([button, children]) => button.replaceChildren(...children));
        heartButton.classList.remove('is-liked');
    };
}

if (typeof module !== 'undefined') module.exports = { parseTimedLyrics };
