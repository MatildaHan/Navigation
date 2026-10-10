(function () {
    'use strict';
    const data = window.JapaneseStudyData;
    const $ = id => document.getElementById(id);
    const wrap = document.querySelector('.jp-wrap');
    let stageIndex = 0;
    let groupId = 'vowels';
    let index = 0;
    let script = 'hiragana';
    let items = [];
    const stage = () => data[stageIndex];
    const current = () => items[index];
    const shownText = entry => stage().id === 'kana' && script === 'katakana' ? entry.kana : entry.text;
    const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60)).replace(/[\s・。？、!?.,'’-]/g, '');
    const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    let speaking = false;

    function stopSpeech() {
        if (canSpeak && speaking) window.speechSynthesis.cancel();
        speaking = false;
        $('speechStatus').textContent = '';
    }
    function setView(view) {
        wrap.dataset.view = view;
        document.querySelectorAll('.jp-views button').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.view === view)));
    }
    function renderStages() {
        $('stages').replaceChildren(...data.map((section, i) => {
            const node = document.createElement('button');
            node.type = 'button'; node.className = 'jp-btn'; node.textContent = section.label;
            node.setAttribute('aria-pressed', String(i === stageIndex));
            node.addEventListener('click', () => {
                stopSpeech(); stageIndex = i; groupId = stage().id === 'kana' ? 'vowels' : 'all'; index = 0;
                $('search').value = '';
                [...$('stages').children].forEach((button, j) => button.setAttribute('aria-pressed', String(j === i)));
                renderGroups(); filterItems();
            });
            return node;
        }));
    }
    function renderGroups() {
        const option = (value, label) => { const node = document.createElement('option'); node.value = value; node.textContent = label; return node; };
        const total = stage().groups.reduce((sum, section) => sum + section.items.length, 0);
        $('categories').replaceChildren(option('all', `全部分类 · ${total}${stage().unit}`), ...stage().groups.map(section => option(section.id, `${section.label} · ${section.items.length}${stage().unit}`)));
        $('categories').value = groupId;
    }
    function filterItems() {
        stopSpeech(); index = 0;
        const query = normalize($('search').value);
        items = stage().groups.filter(section => groupId === 'all' || section.id === groupId)
            .flatMap(section => section.items.map(entry => ({ ...entry, category: section.label })))
            .filter(entry => !query || [entry.text, entry.kana, entry.romaji, entry.meaning, entry.category].some(text => normalize(text).includes(query)));
        renderList(); render();
        $('list').scrollTop = 0;
    }
    function renderList() {
        $('list').replaceChildren(...items.map((entry, i) => {
            const node = document.createElement('button'); node.type = 'button';
            node.setAttribute('aria-label', `学习 ${shownText(entry)}：${entry.meaning}`);
            const text = document.createElement('span'); text.className = 'jp-list-text'; text.lang = 'ja'; text.textContent = shownText(entry);
            const reading = document.createElement('small'); reading.className = 'jp-list-reading'; reading.lang = 'ja';
            reading.textContent = stage().id === 'kana' ? entry.romaji : entry.kana;
            const meaning = document.createElement('small'); meaning.textContent = entry.meaning;
            node.append(text, reading, meaning);
            node.addEventListener('click', () => {
                stopSpeech(); index = i; setView('study'); render();
                $('entry').focus({ preventScroll: true });
                document.querySelector('.jp-reading').scrollTop = 0;
            });
            return node;
        }));
        $('emptyList').hidden = items.length > 0;
    }
    function render() {
        const entry = current();
        const isKana = stage().id === 'kana';
        wrap.dataset.stage = stage().id;
        $('scripts').hidden = !isKana;
        $('overviewTitle').textContent = `${groupId === 'all' ? '全部分类' : $('categories').selectedOptions[0].textContent.split(' · ')[0]} · ${items.length}${stage().unit}`;
        $('kanji').textContent = entry ? shownText(entry) : '没有匹配内容';
        $('kana').textContent = entry ? (isKana ? (script === 'hiragana' ? entry.kana : entry.text) : entry.kana) : '';
        $('kana').hidden = !entry || $('kana').textContent === shownText(entry);
        $('romaji').textContent = entry?.romaji || '';
        $('meaning').textContent = entry?.meaning || '请清除搜索或更换分类';
        $('note').textContent = entry?.note || '';
        $('note').hidden = !entry?.note;
        $('description').textContent = stage().groups.find(section => section.id === groupId)?.description || '全部分类包含本阶段所有条目；可按场景筛选，或搜索日文、读音、罗马字和中文。';
        $('progress').textContent = entry ? `${entry.category} · ${index + 1} / ${items.length} ${stage().unit}${$('search').value ? ' · 搜索结果' : ''}` : `0 / 0 ${stage().unit}`;
        $('btnPrev').disabled = !entry;
        $('btnNext').disabled = !entry;
        $('btnSpeak').disabled = !entry || !canSpeak;
        [...$('list').children].forEach((node, i) => {
            if (i === index) node.setAttribute('aria-current', 'true');
            else node.removeAttribute('aria-current');
        });
    }
    function move(delta) {
        if (!items.length) return;
        stopSpeech(); index = (index + delta + items.length) % items.length; setView('study'); render();
        document.querySelector('.jp-reading').scrollTop = 0;
    }
    $('categories').addEventListener('change', () => { groupId = $('categories').value; $('search').value = ''; filterItems(); });
    $('search').addEventListener('input', filterItems);
    document.querySelectorAll('.jp-views button').forEach(node => node.addEventListener('click', () => setView(node.dataset.view)));
    $('scripts').querySelectorAll('button').forEach(node => node.addEventListener('click', () => {
        stopSpeech(); script = node.dataset.script;
        $('scripts').querySelectorAll('button').forEach(choice => choice.setAttribute('aria-pressed', String(choice === node)));
        renderList(); render();
    }));
    $('btnPrev').addEventListener('click', () => move(-1));
    $('btnNext').addEventListener('click', () => move(1));
    $('btnSpeak').addEventListener('click', () => {
        if (!canSpeak || !current()) return;
        window.speechSynthesis.cancel();
        const voice = window.speechSynthesis.getVoices().find(candidate => /^ja(?:-|_)/i.test(candidate.lang));
        if (!voice) { $('speechStatus').textContent = '未检测到日语语音，请添加系统日语语音后重试。'; return; }
        const entry = current();
        const utterance = new SpeechSynthesisUtterance(entry.speech || shownText(entry));
        utterance.lang = 'ja-JP'; utterance.voice = voice; utterance.rate = 0.85;
        utterance.onerror = event => {
            if (event.error !== 'canceled' && event.error !== 'interrupted') $('speechStatus').textContent = '朗读暂时不可用，请稍后重试。';
        };
        $('speechStatus').textContent = ''; speaking = true;
        GameBridge.notifyActive(); window.speechSynthesis.speak(utterance);
    });
    if (!canSpeak) $('btnSpeak').textContent = '不支持朗读';
    renderStages(); renderGroups(); filterItems();
    GameBridge.notifyReady();
})();
