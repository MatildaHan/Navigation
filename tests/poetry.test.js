'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const data = fs.readFileSync(path.join(root, 'Tools-main/data/poetry-library.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'Tools-main/tools/poetry-recite.html'), 'utf8');
const originalTitles = ['静夜思', '登鹳雀楼', '春晓', '相思', '江雪', '悯农·其二', '咏鹅', '望庐山瀑布', '绝句', '水调歌头·明月几时有', '如梦令·常记溪亭日暮', '天净沙·秋思', '春望', '山行', '饮湖上初晴后雨·其二', '题西林壁', '游山西村', '西江月·夜行黄沙道中'];

function library(context = vm.createContext({})) {
    vm.runInContext(data, context);
    return vm.runInContext('POETRY_LIBRARY', context);
}

test('100 distinct sourced poems retain old selections and add 82 new complete works', () => {
    const poems = library();
    assert.equal(poems.length, 100);
    assert.equal(new Set(poems.map(p => p.title)).size, poems.length);
    assert.equal(new Set(poems.map(p => p.source)).size, poems.length);
    for (const title of originalTitles) assert.ok(poems.some(p => p.title === title), title);
    assert.equal(poems.filter(p => !originalTitles.includes(p.title)).length, 82);
    assert.ok(new Set(poems.map(p => p.dynasty)).size >= 9);
    for (const poem of poems) {
        for (const key of ['title', 'dynasty', 'author']) assert.ok(typeof poem[key] === 'string' && poem[key].trim(), `${poem.title}: ${key}`);
        assert.match(poem.source, /^https:\/\/www\.guwendao\.net\/shiwenv_[a-f0-9]{12}\.aspx$/);
        assert.ok(poem.lines.length > 0, poem.title);
        for (const line of poem.lines) {
            assert.ok(typeof line === 'string' && line.trim(), poem.title);
            assert.doesNotMatch(line, /<[^>]*>|&(?:nbsp|amp|lt);|一作：|译文|赏析/, poem.title);
        }
    }
    for (const [title, start, end, minimum] of [
        ['将进酒', '君不见黄河之水天上来', '与尔同销万古愁。', 180],
        ['蜀道难', '噫吁嚱', '侧身西望长咨嗟！', 300],
        ['长恨歌', '汉皇重色思倾国', '此恨绵绵无绝期。', 900],
        ['琵琶行', '浔阳江头夜送客', '江州司马青衫湿。', 680],
        ['木兰诗', '唧唧复唧唧', '安能辨我是雄雌？', 380],
        ['己亥杂诗·其五', '浩荡离愁白日斜', '化作春泥更护花。', 30],
    ]) {
        const poem = poems.find(p => p.title === title), text = poem.lines.join('');
        assert.ok(text.startsWith(start) && text.endsWith(end) && text.length >= minimum, title);
    }
    assert.match(poems.find(p => p.title === '琵琶行').preface, /凡六百一十六言，命曰《琵琶行》。$/);
});

test('grouped selections and circular navigation reach every poem and clear old prefaces', () => {
    const elements = new Map();
    const element = () => ({textContent: '', value: '', scrollTop: 0, children: [], handlers: {},
        appendChild(child) { this.children.push(child); },
        addEventListener(name, handler) { this.handlers[name] = handler; },
    });
    const document = {
        body: {classList: {add() {}}},
        createElement: element,
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, element());
            return elements.get(id);
        },
    };
    const context = vm.createContext({document, GameBridge: {notifyReady() {}}});
    const poems = library(context);
    const inline = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
    vm.runInContext(inline, context);
    const get = id => elements.get(id);
    assert.equal(get('title').textContent, '将进酒');
    assert.equal(get('total').textContent, 100);
    const options = get('poemSelect').children.flatMap(group => group.children);
    assert.equal(options.length, 100);
    assert.equal(get('poemSelect').children.length, 9);
    for (const [index, option] of options.entries()) assert.equal(option.value, String(index));
    get('btnPrev').onclick();
    assert.equal(get('title').textContent, poems.at(-1).title);
    get('btnNext').onclick();
    assert.equal(get('title').textContent, poems[0].title);
    for (const poem of poems) {
        assert.equal(get('title').textContent, poem.title);
        assert.equal(get('content').textContent, poem.lines.join('\n'));
        get('poemCard').scrollTop = 200;
        get('btnNext').onclick();
        assert.equal(get('poemCard').scrollTop, 0);
    }
    get('poemSelect').value = String(poems.findIndex(p => p.title === '琵琶行'));
    get('poemSelect').handlers.change();
    assert.equal(get('prefaceBlock').hidden, false);
    assert.equal(get('prefaceBlock').open, false);
    get('prefaceBlock').open = true;
    get('poemSelect').value = '0';
    get('poemSelect').handlers.change();
    assert.equal(get('prefaceBlock').hidden, true);
    assert.equal(get('prefaceBlock').open, false);
    assert.equal(get('preface').textContent, '');
    for (const invalid of ['-1', '100', 'NaN', '1.5']) {
        get('poemSelect').value = invalid;
        get('poemSelect').handlers.change();
        assert.equal(get('title').textContent, '将进酒');
    }
});
