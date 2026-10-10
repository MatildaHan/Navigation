'use strict';

(() => {
    const muyu = document.getElementById('muyu');
    const countEl = document.getElementById('count');
    const meritEl = document.getElementById('merit');
    const storageStatus = document.getElementById('storageStatus');
    const soundStatus = document.getElementById('soundStatus');
    const chant = document.getElementById('chantAudio');
    const merits = ['功德无量', '心诚则灵', '善哉善哉', '福慧双修', '一花一世界', '佛在心中', '禅意盎然', '阿弥陀佛'];
    let count = 0;
    try {
        const saved = Number(localStorage.getItem('muyu.count'));
        if (Number.isSafeInteger(saved) && saved >= 0) count = saved;
    } catch { /* Keep counting when browser storage is unavailable. */ }
    let audioCtx;
    let hitTimer;
    let chantPending = false;
    let soundEpoch = 0;
    chant.volume = 0.55;

    function save() {
        try { localStorage.setItem('muyu.count', String(count)); storageStatus.textContent = ''; }
        catch { storageStatus.textContent = '浏览器未能保存次数，刷新后可能丢失。'; }
    }
    function render() {
        countEl.textContent = String(count);
        if (count > 0 && count % 50 === 0) meritEl.textContent = merits[Math.floor(Math.random() * merits.length)];
    }
    function knock() {
        try {
            if (!audioCtx || audioCtx.state === 'closed') audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            const now = audioCtx.currentTime;
            [520, 830, 1320].forEach((frequency, index) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                const duration = 0.18 - index * 0.04;
                osc.frequency.setValueAtTime(frequency, now);
                gain.gain.setValueAtTime(0.13 / (index + 1), now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                osc.connect(gain).connect(audioCtx.destination);
                osc.onended = () => { osc.disconnect(); gain.disconnect(); };
                osc.start(now);
                osc.stop(now + duration);
            });
        } catch { /* The recorded recitation remains available without Web Audio. */ }
    }
    function recite() {
        // Fast taps keep one complete recitation playing, without overlapping voices.
        if (chantPending || !chant.paused) return;
        const epoch = soundEpoch;
        chant.currentTime = 0;
        chantPending = true;
        chant.play().then(() => {
            if (epoch !== soundEpoch) chant.pause();
            else soundStatus.textContent = '';
        }).catch(() => {
            if (epoch === soundEpoch) soundStatus.textContent = '诵念音频未能播放，请再次轻敲木鱼。';
        }).finally(() => { chantPending = false; });
    }
    function stopSound() {
        soundEpoch++;
        chant.pause();
        chant.currentTime = 0;
        audioCtx?.suspend().catch(() => {});
    }
    muyu.addEventListener('click', () => {
        if (count >= Number.MAX_SAFE_INTEGER) return;
        count++;
        render();
        save();
        clearTimeout(hitTimer);
        muyu.classList.remove('hit');
        void muyu.offsetWidth;
        muyu.classList.add('hit');
        hitTimer = setTimeout(() => muyu.classList.remove('hit'), 600);
        GameBridge.notifyActive();
        knock();
        recite();
        if (navigator.vibrate) navigator.vibrate(20);
    });
    document.getElementById('btnReset').addEventListener('click', () => {
        count = 0;
        save();
        render();
        meritEl.textContent = '功德无量';
        stopSound();
    });
    GameBridge.onParentMessage(message => { if (message.type === 'pause') stopSound(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopSound(); });
    window.addEventListener('pagehide', () => {
        stopSound();
        clearTimeout(hitTimer);
        audioCtx?.close().catch(() => {});
    });
    render();
    GameBridge.notifyReady();
})();
