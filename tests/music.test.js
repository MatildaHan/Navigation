'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTimedLyrics } = require('../assets/js/music.js');

test('lyrics preserve multiple timestamps, decimals and chronological order', () => {
    const result = parseTimedLyrics('[ar:示例]\n[00:04.250]第二句\n[00:01.5][00:06.00]第一句');
    assert.equal(result.timed, true);
    assert.deepEqual(result.lines, [{time:1.5,text:'第一句'},{time:4.25,text:'第二句'},{time:6,text:'第一句'}]);
});

test('lyric offsets are bounded and cannot produce negative times', () => {
    assert.deepEqual(parseTimedLyrics('[offset:-1500]\n[00:01.00]开头').lines, [{time:0,text:'开头'}]);
    assert.equal(parseTimedLyrics('[offset:99999999]\n[00:01.00]开头').lines[0].time, 601);
});

test('plain lyrics and markup remain text; empty metadata is not a lyric', () => {
    assert.deepEqual(parseTimedLyrics('[ti:歌名]\n一句文字\n<script>example</script>'), {timed:false,lines:[{time:0,text:'一句文字'},{time:0,text:'<script>example</script>'}]});
    assert.deepEqual(parseTimedLyrics('[ar:示例]\n\n'), {timed:false,lines:[]});
});
