'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const data = fs.readFileSync(path.join(root, 'Tools-main/data/cet4-vocabulary.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'Tools-main/tools/english-study.html'), 'utf8');

test('CET-4 vocabulary has unique, ordered words and usable definitions', () => {
    const context = vm.createContext({});
    vm.runInContext(data, context);
    const words = vm.runInContext('CET4_VOCABULARY', context);
    assert.equal(words.length, 3847);
    assert.equal(new Set(words.map(entry => entry.word.toLowerCase())).size, words.length);
    for (const [index, entry] of words.entries()) {
        for (const key of ['word', 'meaning']) assert.ok(typeof entry[key] === 'string' && entry[key].trim(), `${entry.word}: ${key}`);
        for (const key of ['phonetic', 'pos']) assert.equal(typeof entry[key], 'string');
        assert.ok(!entry.meaning.includes('\\n'), entry.word);
        assert.equal(Boolean(entry.en), Boolean(entry.zh));
        if (index) assert.ok(words[index - 1].word.toLowerCase() < entry.word.toLowerCase());
    }
    for (const word of ['abandon', 'education', 'vocabulary']) assert.ok(words.some(entry => entry.word === word), word);
    assert.ok(!words.some(entry => ['reservior', 'uptodate'].includes(entry.word)));
});

test('word navigation wraps, optional fields clear, and speech reads the selected word', () => {
    const elements = new Map();
    const document = {
        body: { classList: { add() {} } },
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, { textContent: '', hidden: false, parentElement: { hidden: false } });
            return elements.get(id);
        },
    };
    let spoken;
    const speechSynthesis = { cancel() {}, speak(utterance) { spoken = utterance; } };
    const context = vm.createContext({ document, window: { speechSynthesis }, speechSynthesis,
        SpeechSynthesisUtterance: function (word) { this.text = word; },
        GameBridge: { notifyReady() {}, notifyActive() {} },
    });
    vm.runInContext(data, context);
    const words = vm.runInContext('CET4_VOCABULARY', context);
    const inline = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
    vm.runInContext(inline, context);
    assert.equal(elements.get('word').textContent, words[0].word);
    assert.equal(elements.get('total').textContent, words.length);
    elements.get('btnPrev').onclick();
    assert.equal(elements.get('word').textContent, words.at(-1).word);
    elements.get('btnNext').onclick();
    assert.equal(elements.get('word').textContent, words[0].word);
    for (let index = 0; index < words.length; index++) {
        const entry = words[index];
        assert.equal(elements.get('word').textContent, entry.word);
        assert.equal(elements.get('meaning').textContent, entry.meaning);
        assert.equal(elements.get('phonetic').hidden, !entry.phonetic);
        assert.equal(elements.get('pos').hidden, !entry.pos);
        assert.equal(elements.get('exampleEn').parentElement.hidden, !entry.en);
        assert.equal(elements.get('exampleEn').textContent, entry.en || '');
        assert.equal(elements.get('exampleZh').textContent, entry.zh || '');
        elements.get('btnNext').onclick();
    }
    elements.get('btnSpeak').onclick();
    assert.equal(spoken.text, words[0].word);
    assert.equal(spoken.lang, 'en-US');
});
