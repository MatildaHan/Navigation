'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ window: {} });
for (const file of ['japanese-life-data.js', 'japanese-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Tools-main/js', file), 'utf8'), context);
}
const sections = context.window.JapaneseStudyData;

test('Japanese learning data has unique topics, complete readings and no repeated entries', () => {
    for (const section of sections) {
        assert.equal(new Set(section.groups.map(group => group.id)).size, section.groups.length);
        const entries = section.groups.flatMap(group => group.items);
        assert.equal(new Set(entries.map(entry => entry.text)).size, entries.length, section.id);
        for (const entry of entries) {
            for (const field of ['text', 'kana', 'romaji', 'meaning']) {
                assert.equal(typeof entry[field], 'string', `${entry.text}: ${field}`);
                assert.ok(entry[field].trim().length, `${entry.text}: ${field}`);
                assert.equal(entry[field], entry[field].trim());
            }
            assert.match(entry.kana, /^[\u3040-\u30ff。、？！ー]+$/, entry.text);
            if (section.id === 'sentences') assert.ok(entry.note, entry.text);
        }
    }
});

test('basic kana cover all 46 characters and daily-life topics retain the original vocabulary', () => {
    const kana = sections.find(section => section.id === 'kana');
    const basic = kana.groups.filter(group => ['vowels', 'consonants', 'nasal'].includes(group.id)).flatMap(group => group.items);
    assert.equal(basic.length, 46);
    assert.equal(new Set(basic.map(entry => entry.kana)).size, 46);
    const words = sections.find(section => section.id === 'words');
    const texts = new Set(words.groups.flatMap(group => group.items.map(entry => entry.text)));
    for (const text of ['こんにちは', 'ありがとう', 'すみません', '学校', '友達', '先生', '食べる', '飲む', '行く', '見る', '大きい', '小さい', '新しい', '古い', '日本', '中国', '時間', '今日', '明日', '好き', '美味しい', '頑張る']) assert.ok(texts.has(text), text);
    for (const topic of ['food', 'home', 'shopping', 'health', 'weather', 'work', 'hobbies', 'services']) assert.ok(words.groups.some(group => group.id === topic), topic);
});
