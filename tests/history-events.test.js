'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../configs/history-events.json');
const catalog = require('../Tools-main/js/history-events.js');

test('catalog preserves all original events and gives every event a complete readable detail', () => {
    assert.equal(catalog.validate(data), data);
    assert.equal(data.events.length, 53);
    const original = ['qin-unification', 'chen-wu', 'chu-han', 'zhang-qian', 'cai-lun', 'red-cliffs', 'tang-founded', 'zhen-guan', 'an-shi', 'song-founded', 'yuan-founded', 'ming-founded', 'zheng-he', 'qing-entry', 'opium-war', 'xinhai', 'may-fourth', 'prc-founded', 'reform-opening', 'hong-kong', 'macao', 'wto', 'beijing-olympics'];
    original.forEach(id => assert.ok(data.events.some(event => event.id === id), id));
    data.eras.forEach(era => assert.ok(data.events.some(event => event.era === era), era));
    for (const event of data.events) for (const field of ['background', 'course', 'impact', 'note']) assert.ok(event[field].length >= (field === 'note' ? 15 : 40), `${event.id}: ${field}`);
});

test('search combines the selected era with names, places, years and multiple words', () => {
    assert.equal(catalog.filter(data.events, '汉', '张骞 前 138')[0].id, 'zhang-qian');
    assert.equal(catalog.filter(data.events, '唐', '玄奘 印度')[0].id, 'xuanzang');
    assert.equal(catalog.filter(data.events, '现代', 'wto')[0].id, 'wto');
    assert.equal(catalog.filter(data.events, '秦', '玄奘').length, 0);
    assert.equal(catalog.filter(data.events, '全部', '  ').length, 53);
    assert.equal(catalog.filter(data.events, '全部', '<img src=x onerror=alert(1)>').length, 0);
});

test('all detail addresses round-trip and preserve filtered list context', () => {
    for (const event of data.events) {
        const href = catalog.href(event.id, event.era, '人物 & 地点?');
        assert.deepEqual(catalog.route(href, data.eras), {id:event.id, era:event.era, query:'人物 & 地点?'});
    }
    assert.deepEqual(catalog.route(catalog.href(null, '唐', '玄奘'), data.eras), {id:null, era:'唐', query:'玄奘'});
    assert.equal(catalog.route('#event/missing?era=未知', data.eras).era, '全部');
    assert.equal(catalog.route('#event/missing', data.eras).id, 'missing');
    assert.equal(catalog.route('#list?q=' + 'x'.repeat(300), data.eras).query.length, 200);
});

test('invalid catalogs cannot publish duplicate, empty, unordered or unsafe content', () => {
    for (const mutate of [
        copy => copy.events.push(copy.events[0]),
        copy => copy.events[0].background = '',
        copy => copy.events[1].sortYear = -9999,
        copy => copy.events[0].sources = ['missing'],
        copy => copy.sources.ancient.url = 'javascript:alert(1)',
        copy => copy.eras.push(copy.eras[0]),
    ]) {
        const copy = structuredClone(data); mutate(copy); assert.throws(() => catalog.validate(copy));
    }
    assert.equal(catalog.validSourceURL('https://name:password@example.com/'), false);
    assert.equal(catalog.validSourceURL('http://example.com/'), false);
});
