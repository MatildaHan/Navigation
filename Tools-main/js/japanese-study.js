(function () {
    'use strict';
    const data = window.JapaneseStudyData;
    const $ = id => document.getElementById(id);
    const wrap = document.querySelector('.jp-wrap');
    let stageIndex = 0;
    let groupIndex = 0;
    let index = 0;
    let script = 'hiragana';
    const stage = () => data[stageIndex];
    const group = () => stage().groups[groupIndex];
    const current = () => group().items[index];
    const shownText = entry => stage().id === 'kana' && script === 'katakana' ? entry.kana : entry.text;
    const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    let speaking = false;

    function stopSpeech() {
        if (canSpeak && speaking) window.speechSynthesis.cancel();
        speaking = false;
        $('speechStatus').textContent = '';
    }
    function button(text, selected, action) {
        const node = document.createElement('button');
        node.type = 'button'; node.className = 'jp-btn'; node.textContent = text;
        node.setAttribute('aria-pressed', String(selected));
        node.addEventListener('click', action);
        return node;
    }
    function renderStages() {
        $('stages').replaceChildren(...data.map((section, i) => button(section.label, i === stageIndex, () => {
            stopSpeech(); stageIndex = i; groupIndex = 0; index = 0;
            // Keep the activated button focused while updating its state.
            [...$('stages').children].forEach((node, j) => node.setAttribute('aria-pressed', String(j === i)));
            renderGroups(); renderList(); render();
        })));
    }
    function renderGroups() {
        $('categories').replaceChildren(...stage().groups.map((section, i) => button(section.label, i === groupIndex, () => {
            stopSpeech(); groupIndex = i; index = 0;
            [...$('categories').children].forEach((node, j) => node.setAttribute('aria-pressed', String(j === i)));
            renderList(); render();
        })));
    }
    function renderList() {
        $('list').replaceChildren(...group().items.map((entry, i) => {
            const node = document.createElement('button'); node.type = 'button';
            node.setAttribute('aria-label', `学习 ${shownText(entry)}：${entry.meaning}`);
            const text = document.createElement('span'); text.className = 'jp-list-text'; text.lang = 'ja'; text.textContent = shownText(entry);
            const reading = document.createElement('small'); reading.textContent = stage().id === 'kana' ? entry.romaji : entry.meaning;
            node.append(text, reading);
            node.addEventListener('click', () => { stopSpeech(); index = i; render(); });
            return node;
        }));
    }
    function render() {
        const entry = current();
        const isKana = stage().id === 'kana';
        wrap.dataset.stage = stage().id;
        $('scripts').hidden = !isKana;
        $('description').textContent = group().description;
        $('kanji').textContent = shownText(entry);
        $('kana').textContent = isKana ? (script === 'hiragana' ? entry.kana : entry.text) : entry.kana;
        $('kana').hidden = $('kana').textContent === shownText(entry);
        $('romaji').textContent = entry.romaji;
        $('meaning').textContent = entry.meaning;
        $('note').textContent = entry.note;
        $('note').hidden = !entry.note;
        $('progress').textContent = `${stage().label} · ${group().label} · 第 ${index + 1} / ${group().items.length} ${stage().unit}`;
        [...$('list').children].forEach((node, i) => {
            if (i === index) node.setAttribute('aria-current', 'true');
            else node.removeAttribute('aria-current');
        });
    }
    function move(delta) {
        stopSpeech(); index = (index + delta + group().items.length) % group().items.length; render();
    }
    $('scripts').querySelectorAll('button').forEach(node => node.addEventListener('click', () => {
        stopSpeech(); script = node.dataset.script;
        $('scripts').querySelectorAll('button').forEach(choice => choice.setAttribute('aria-pressed', String(choice === node)));
        renderList(); render();
    }));
    $('btnPrev').addEventListener('click', () => move(-1));
    $('btnNext').addEventListener('click', () => move(1));
    $('btnSpeak').addEventListener('click', () => {
        if (!canSpeak) return;
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(candidate => /^ja(?:-|_)/i.test(candidate.lang));
        if (!voice) {
            $('speechStatus').textContent = '未检测到日语语音，可在系统中添加日语语音后重试。';
            return;
        }
        const entry = current();
        const utterance = new SpeechSynthesisUtterance(entry.speech || shownText(entry));
        utterance.lang = 'ja-JP'; utterance.voice = voice; utterance.rate = 0.85;
        utterance.onerror = event => {
            if (event.error !== 'canceled' && event.error !== 'interrupted') $('speechStatus').textContent = '朗读暂时不可用，请稍后重试。';
        };
        $('speechStatus').textContent = '';
        speaking = true;
        GameBridge.notifyActive();
        window.speechSynthesis.speak(utterance);
    });
    if (!canSpeak) { $('btnSpeak').disabled = true; $('btnSpeak').textContent = '不支持朗读'; }
    renderStages(); renderGroups(); renderList(); render();
    GameBridge.notifyReady();
})();
