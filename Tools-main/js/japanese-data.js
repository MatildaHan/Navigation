'use strict';

// Original practice examples; kana inventory checked against the Japan Foundation's Irodori chart.
window.JapaneseStudyData = (() => {
    const item = (text, kana, romaji, meaning, note = '') => ({ text, kana, romaji, meaning, note });
    const katakana = text => [...text].map(char => {
        const code = char.charCodeAt(0);
        return code >= 0x3041 && code <= 0x3096 ? String.fromCharCode(code + 0x60) : char;
    }).join('');
    const kanaItems = (letters, readings, row, note = '') => letters.split(' ').map((text, index) => ({
        ...item(text, katakana(text), readings.split(' ')[index], row, note), speech: text,
    }));
    const group = (id, label, description, items) => ({ id, label, description, items });
    const consonants = [
        ['か き く け こ', 'ka ki ku ke ko', 'か行 · k'],
        ['さ し す せ そ', 'sa shi su se so', 'さ行 · s', 'し读 shi，不读 si。'],
        ['た ち つ て と', 'ta chi tsu te to', 'た行 · t', 'ち读 chi；つ读 tsu。'],
        ['な に ぬ ね の', 'na ni nu ne no', 'な行 · n'],
        ['は ひ ふ へ ほ', 'ha hi fu he ho', 'は行 · h', 'ふ读 fu。は作主题助词时读 wa；へ作方向助词时读 e。'],
        ['ま み む め も', 'ma mi mu me mo', 'ま行 · m'],
        ['や ゆ よ', 'ya yu yo', 'や行 · y', '现代五十音中没有独立的 yi、ye 假名。'],
        ['ら り る れ ろ', 'ra ri ru re ro', 'ら行 · r', '舌尖轻触上齿龈，不要卷舌。'],
        ['わ を', 'wa o', 'わ行 · w', 'を通常作宾语助词，读 o；键盘输入为 wo。'],
    ].flatMap(args => kanaItems(...args));
    const voiced = [
        ['が ぎ ぐ げ ご', 'ga gi gu ge go', 'が行 · g'],
        ['ざ じ ず ぜ ぞ', 'za ji zu ze zo', 'ざ行 · z'],
        ['だ ぢ づ で ど', 'da ji zu de do', 'だ行 · d', '现代标准语中，ぢ与じ、づ与ず通常同音；键盘输入用 di、du。'],
        ['ば び ぶ べ ぼ', 'ba bi bu be bo', 'ば行 · b'],
    ].flatMap(args => kanaItems(...args));
    const contracted = [
        ['きゃ きゅ きょ', 'kya kyu kyo', 'き + 小ゃゅょ'],
        ['しゃ しゅ しょ', 'sha shu sho', 'し + 小ゃゅょ'],
        ['ちゃ ちゅ ちょ', 'cha chu cho', 'ち + 小ゃゅょ'],
        ['にゃ にゅ にょ', 'nya nyu nyo', 'に + 小ゃゅょ'],
        ['ひゃ ひゅ ひょ', 'hya hyu hyo', 'ひ + 小ゃゅょ'],
        ['みゃ みゅ みょ', 'mya myu myo', 'み + 小ゃゅょ'],
        ['りゃ りゅ りょ', 'rya ryu ryo', 'り + 小ゃゅょ'],
        ['ぎゃ ぎゅ ぎょ', 'gya gyu gyo', 'ぎ + 小ゃゅょ'],
        ['じゃ じゅ じょ', 'ja ju jo', 'じ + 小ゃゅょ'],
        ['ぢゃ ぢゅ ぢょ', 'ja ju jo', 'ぢ + 小ゃゅょ', '罕见写法，通常先掌握じゃ・じゅ・じょ；输入 dya、dyu、dyo。'],
        ['びゃ びゅ びょ', 'bya byu byo', 'び + 小ゃゅょ'],
        ['ぴゃ ぴゅ ぴょ', 'pya pyu pyo', 'ぴ + 小ゃゅょ'],
    ].flatMap(args => kanaItems(...args));
    const kanaGroups = [
        group('vowels', '元音', 'あ行的五个元音是基础。每个假名占一拍；先熟悉 a、i、u、e、o。', kanaItems('あ い う え お', 'a i u e o', 'あ行 · 元音')),
        group('consonants', '辅音行 / 清音', '辅音与元音结合组成音节。下方列出か至わ行；や行、わ行的空位无需补读。', consonants),
        group('voiced', '浊音', '在清音右上角加゛：か→が、さ→ざ、た→だ、は→ば，共 20 个。', voiced),
        group('semi', '半浊音', '在は行右上角加゜，组成ぱ行的五个音。', kanaItems('ぱ ぴ ぷ ぺ ぽ', 'pa pi pu pe po', 'ぱ行 · p')),
        group('contracted', '拗音', 'い段假名加小写ゃ・ゅ・ょ，合起来占一拍。きゃ与きや的长度不同；也列出罕见的ぢゃ行供辨认。', contracted),
        group('nasal', '拨音', 'ん / ン独占一拍，发音随后面的音变化；不要在后面加 u。', [item('ん', 'ン', 'n', '鼻音 · 一拍', '例：ほん（hon，本）、しんぶん（shinbun，报纸）。')]),
        group('geminate', '促音', '小写っ / ッ表示一拍的阻塞或停顿，不单独读作 tsu；罗马字常双写后面的辅音。', [{ ...item('っ', 'ッ', '双写后续辅音', '促音 · 一拍停顿', '例：きって（kitte，邮票）与きて（kite，来）不同。朗读按钮播放例词。'), speech: 'きって' }]),
        group('long', '长音', '长音占两拍。平假名常加元音假名；片假名常用ー。这里直接用例词练习。', [
            item('おばあさん', 'オバアサン', 'obaasan', '奶奶 / 老太太 · aa', 'あ段加あ；おばさん（阿姨）少一拍，意思不同。'),
            item('おじいさん', 'オジイサン', 'ojiisan', '爷爷 / 老爷爷 · ii', 'い段加い；おじさん（叔叔）少一拍。'),
            item('すうじ', 'スウジ', 'suuji', '数字 · uu', 'う段加う。'),
            item('せんせい', 'センセイ', 'sensei', '老师 · 长 e', 'え段后常写い，也可写え（如おねえさん）；せい通常读成长 e。'),
            item('こうこう', 'コウコウ', 'koukou', '高中 · 长 o', 'お段后常写う，也可写お（如こおり）。片假名例：コーヒー（koohii，咖啡）。'),
        ]),
        group('foreign', '外来语扩展音', '片假名用小元音等组合表示外来语发音。以下是生活中常见的扩展组合。', [
            ['ファ', 'fa', 'ファイル · 文件'], ['フィ', 'fi', 'フィルム · 胶片'], ['フェ', 'fe', 'カフェ · 咖啡馆'], ['フォ', 'fo', 'フォーク · 叉子'],
            ['ティ', 'ti', 'ティー · 茶'], ['ディ', 'di', 'ディスク · 光盘'], ['シェ', 'she', 'シェフ · 厨师'], ['チェ', 'che', 'チェック · 检查'],
            ['ジェ', 'je', 'ジェット · 喷气式'], ['ウィ', 'wi', 'ウィンドウ · 窗口'], ['ウェ', 'we', 'ウェブ · 网络'], ['ウォ', 'wo', 'ウォーター · 水'],
            ['ヴ', 'vu', 'ヴァイオリン · 小提琴'],
        ].map(([text, romaji, meaning]) => item(text, text, romaji, meaning, '此组以片假名显示；外来语写法也可能有变体。'))),
    ];
    const entries = rows => rows.map(row => item(...row));
    const wordGroups = [
        group('greetings', '问候与回应', '先记常用问候、感谢与回应，再用句子练习礼貌程度。', entries([
            ['こんにちは', 'こんにちは', 'konnichiwa', '你好 · 白天问候', '这里的は读 wa。'],
            ['おはよう', 'おはよう', 'ohayou', '早上好 · 熟人间', '礼貌说法：おはようございます。'],
            ['こんばんは', 'こんばんは', 'konbanwa', '晚上好', '这里的は读 wa。'],
            ['ありがとう', 'ありがとう', 'arigatou', '谢谢 · 熟人间', '礼貌说法：ありがとうございます。'],
            ['すみません', 'すみません', 'sumimasen', '不好意思 / 打扰一下'],
            ['はい', 'はい', 'hai', '是 / 好的'], ['いいえ', 'いいえ', 'iie', '不是 / 不'],
            ['大丈夫', 'だいじょうぶ', 'daijoubu', '没关系 / 没问题', '也可能表示婉拒，要结合语境。'],
            ['お願いします', 'おねがいします', 'onegaishimasu', '拜托了 / 麻烦您'],
            ['また', 'また', 'mata', '再 / 又', 'また明日：明天见。'],
        ])),
        group('people', '人物与生活', '常见汉字配假名读音，练习看到词形就能理解。', entries([
            ['私', 'わたし', 'watashi', '我'], ['友達', 'ともだち', 'tomodachi', '朋友'], ['家族', 'かぞく', 'kazoku', '家人'],
            ['先生', 'せんせい', 'sensei', '老师；对医生等的称呼'], ['学校', 'がっこう', 'gakkou', '学校'],
            ['仕事', 'しごと', 'shigoto', '工作'], ['家', 'いえ', 'ie', '家 / 房子'],
            ['日本', 'にほん', 'nihon', '日本'], ['中国', 'ちゅうごく', 'chuugoku', '中国'],
            ['名前', 'なまえ', 'namae', '名字'], ['日本語', 'にほんご', 'nihongo', '日语'], ['アニメ', 'アニメ', 'anime', '动画'],
        ])),
        group('travel', '出行与购物', '问路、点餐和购物时常见的名词与疑问词。', entries([
            ['駅', 'えき', 'eki', '车站'], ['電車', 'でんしゃ', 'densha', '电车'], ['店', 'みせ', 'mise', '商店'],
            ['水', 'みず', 'mizu', '水'], ['ご飯', 'ごはん', 'gohan', '米饭 / 饭餐'], ['お金', 'おかね', 'okane', '钱'],
            ['いくら', 'いくら', 'ikura', '多少钱'], ['どこ', 'どこ', 'doko', '哪里'], ['これ', 'これ', 'kore', '这个'], ['トイレ', 'トイレ', 'toire', '洗手间'],
        ])),
        group('time', '时间与数量', '掌握时间词和基本数字；数量词的读法会随量词改变。', entries([
            ['今日', 'きょう', 'kyou', '今天'], ['明日', 'あした', 'ashita', '明天'], ['昨日', 'きのう', 'kinou', '昨天'],
            ['今', 'いま', 'ima', '现在'], ['時間', 'じかん', 'jikan', '时间 / 小时'],
            ['一', 'いち', 'ichi', '一'], ['二', 'に', 'ni', '二'], ['三', 'さん', 'san', '三'],
            ['四', 'よん', 'yon', '四', '也有し的读法，如四月（しがつ）。'], ['五', 'ご', 'go', '五'],
            ['六', 'ろく', 'roku', '六'], ['七', 'なな', 'nana', '七', '也有しち的读法。'], ['八', 'はち', 'hachi', '八'],
            ['九', 'きゅう', 'kyuu', '九', '也有く的读法，如九月（くがつ）。'], ['十', 'じゅう', 'juu', '十'],
        ])),
        group('actions', '动作与感受', '先认识动词原形；句子中再练习ます形、否定、过去和て形。', entries([
            ['行く', 'いく', 'iku', '去'], ['来る', 'くる', 'kuru', '来'], ['帰る', 'かえる', 'kaeru', '回去'],
            ['見る', 'みる', 'miru', '看'], ['聞く', 'きく', 'kiku', '听 / 问'], ['言う', 'いう', 'iu', '说'],
            ['食べる', 'たべる', 'taberu', '吃'], ['飲む', 'のむ', 'nomu', '喝'], ['分かる', 'わかる', 'wakaru', '明白'],
            ['待つ', 'まつ', 'matsu', '等'], ['好き', 'すき', 'suki', '喜欢', '常用：～が好きです。'],
            ['美味しい', 'おいしい', 'oishii', '好吃'], ['楽しい', 'たのしい', 'tanoshii', '开心 / 有趣'],
            ['大きい', 'おおきい', 'ookii', '大'], ['小さい', 'ちいさい', 'chiisai', '小'],
            ['新しい', 'あたらしい', 'atarashii', '新'], ['古い', 'ふるい', 'furui', '旧'],
            ['頑張る', 'がんばる', 'ganbaru', '努力 / 加油'],
            ['難しい', 'むずかしい', 'muzukashii', '难'], ['忙しい', 'いそがしい', 'isogashii', '忙'],
        ])),
        group('subtitles', '字幕常见词', '这些词在普通对白中也常见；字幕需要结合上下文理解省略的主语。', entries([
            ['本当', 'ほんとう', 'hontou', '真的 / 事实'], ['絶対', 'ぜったい', 'zettai', '绝对 / 一定'],
            ['約束', 'やくそく', 'yakusoku', '约定'], ['仲間', 'なかま', 'nakama', '伙伴 / 同伴'],
            ['気持ち', 'きもち', 'kimochi', '心情 / 感受'], ['自分', 'じぶん', 'jibun', '自己'],
            ['どうして', 'どうして', 'doushite', '为什么'], ['もう', 'もう', 'mou', '已经 / 再', 'もう一度：再一次。'],
            ['まだ', 'まだ', 'mada', '还 / 仍然'], ['きっと', 'きっと', 'kitto', '一定 / 想必'],
        ])),
    ];
    const sentenceGroups = [
        group('introductions', '问候与介绍', '先用です・ます进行礼貌交流；日文下方提供读音与中文。', entries([
            ['はじめまして。', 'はじめまして。', 'hajimemashite', '初次见面。', '第一次见面时使用。'],
            ['私は中国から来ました。', 'わたしはちゅうごくからきました。', 'watashi wa chuugoku kara kimashita', '我来自中国。', 'は标记主题，读 wa；から表示来源；来ました是过去礼貌形。'],
            ['お名前は何ですか。', 'おなまえはなんですか。', 'onamae wa nan desu ka', '您叫什么名字？', 'か放在句尾表示疑问。'],
            ['よろしくお願いします。', 'よろしくおねがいします。', 'yoroshiku onegaishimasu', '请多关照。', '自我介绍或请求合作时常用。'],
            ['日本語を勉強しています。', 'にほんごをべんきょうしています。', 'nihongo o benkyou shite imasu', '我在学习日语。', 'を标记宾语，读 o；～ています可表示正在做或持续的状态。'],
            ['アニメが好きです。', 'アニメがすきです。', 'anime ga suki desu', '我喜欢动画。', '～が好きです表达喜欢。'],
            ['ありがとうございます。', 'ありがとうございます。', 'arigatou gozaimasu', '谢谢您。', '比ありがとう更礼貌。'],
            ['また明日。', 'またあした。', 'mata ashita', '明天见。', '与熟人告别。'],
        ])),
        group('shopping', '问路 / 点餐 / 购物', '把地点、物品或金额替换成自己的需求，练习真实生活场景。', entries([
            ['駅はどこですか。', 'えきはどこですか。', 'eki wa doko desu ka', '车站在哪里？', '～はどこですか：询问地点。'],
            ['この電車は東京に行きますか。', 'このでんしゃはとうきょうにいきますか。', 'kono densha wa toukyou ni ikimasu ka', '这班电车去东京吗？', 'に表示目的地；行く→行きます。'],
            ['トイレはどこですか。', 'トイレはどこですか。', 'toire wa doko desu ka', '洗手间在哪里？', '～はどこですか：询问地点。'],
            ['これをください。', 'これをください。', 'kore o kudasai', '请给我这个。', '名词＋をください：请求物品。'],
            ['水をお願いします。', 'みずをおねがいします。', 'mizu o onegaishimasu', '麻烦给我水。', '名词＋をお願いします：礼貌请求物品。'],
            ['これはいくらですか。', 'これはいくらですか。', 'kore wa ikura desu ka', '这个多少钱？', 'いくらですか：询问价格。'],
            ['カードで払えますか。', 'カードではらえますか。', 'kaado de haraemasu ka', '可以刷卡吗？', 'で表示方式；払えます是払う的可能形礼貌形式。'],
            ['写真を撮ってもいいですか。', 'しゃしんをとってもいいですか。', 'shashin o totte mo ii desu ka', '可以拍照吗？', '动词て形＋もいいですか：请求许可。'],
        ])),
        group('daily', '日常沟通', '用请求、邀请、否定与过去时，把单词连成能交流的句子。', entries([
            ['もう一度言ってください。', 'もういちどいってください。', 'mou ichido itte kudasai', '请再说一遍。', '言う→言って；て形＋ください表示请求。'],
            ['ゆっくり話してください。', 'ゆっくりはなしてください。', 'yukkuri hanashite kudasai', '请说慢一点。', 'ゆっくり表示慢慢地；話す→話して。'],
            ['よく分かりません。', 'よくわかりません。', 'yoku wakarimasen', '我不太明白。', '～ません是礼貌否定。'],
            ['一緒に行きませんか。', 'いっしょにいきませんか。', 'issho ni ikimasen ka', '要不要一起去？', '～ませんか常表示邀请。'],
            ['明日は時間がありますか。', 'あしたはじかんがありますか。', 'ashita wa jikan ga arimasu ka', '明天有时间吗？', '時間がある：有时间；か表示疑问。'],
            ['昨日は映画を見ました。', 'きのうはえいがをみました。', 'kinou wa eiga o mimashita', '昨天看了电影。', '～ました是礼貌过去形。'],
            ['今日は忙しいです。', 'きょうはいそがしいです。', 'kyou wa isogashii desu', '今天很忙。', 'い形容词原形＋です：礼貌描述状态。'],
            ['少し待ってください。', 'すこしまってください。', 'sukoshi matte kudasai', '请稍等。', '待つ→待って。'],
        ])),
        group('casual', '字幕 / 日常口语', '识别省略、普通形与缩略说法。注意人物关系，先理解语气再模仿。', entries([
            ['何してるの？', 'なにしてるの？', 'nani shiteru no', '你在做什么？', 'している→してる；句尾の可用于解释或询问。熟人间口语。'],
            ['本当に大丈夫？', 'ほんとうにだいじょうぶ？', 'hontou ni daijoubu', '真的没问题吗？', '口语常省略ですか，靠语调表示疑问。'],
            ['ちょっと待って。', 'ちょっとまって。', 'chotto matte', '等一下。', '比待ってください更随意。'],
            ['どうしたの？', 'どうしたの？', 'dou shita no', '怎么了？', '询问发生了什么，常用于关心对方。'],
            ['まだ終わってない。', 'まだおわってない。', 'mada owattenai', '还没结束。', '終わっていない→終わってない；～ない是否定。'],
            ['もう帰らなきゃ。', 'もうかえらなきゃ。', 'mou kaeranakya', '得回去了。', 'なきゃ是なければ（ならない等）的口语缩略，表示必须。'],
            ['一緒に行こう。', 'いっしょにいこう。', 'issho ni ikou', '一起去吧。', '行く→行こう；意志形可表示提议。'],
            ['そんなことないよ。', 'そんなことないよ。', 'sonna koto nai yo', '没有那回事啦。', 'よ向对方传达或强调信息。'],
            ['そうだね。', 'そうだね。', 'sou da ne', '是啊。', 'ね常表示认同或寻求共感。'],
            ['行くって言った。', 'いくっていった。', 'iku tte itta', '说了要去。', 'って可替代引用助词と；主语需从上下文判断。'],
            ['忘れちゃった。', 'わすれちゃった。', 'wasurechatta', '忘掉了。', '忘れてしまった→忘れちゃった；常带遗憾或完成的语气。'],
            ['今行くから、待ってて。', 'いまいくから、まってて。', 'ima iku kara mattete', '我现在就去，等着我。', 'から说明理由；待っていて→待ってて。'],
        ])),
        group('patterns', '读字幕的句型', '补上常见的愿望、理由、转折、比较与修饰结构，逐步读懂较长的对白。', entries([
            ['日本に行きたいです。', 'にほんにいきたいです。', 'nihon ni ikitai desu', '我想去日本。', '动词ます形去ます＋たい：想做某事。'],
            ['雨だから、家にいる。', 'あめだから、いえにいる。', 'ame da kara ie ni iru', '因为下雨，所以待在家里。', '名词＋だから表原因；いる用于有生命者的存在。'],
            ['難しいけど、やってみる。', 'むずかしいけど、やってみる。', 'muzukashii kedo yatte miru', '虽然很难，但试试看。', 'けど表示转折；て形＋みる表示尝试。'],
            ['明日は行けない。', 'あしたはいけない。', 'ashita wa ikenai', '明天去不了。', '行ける是行く的可能形；行けない表示不能去。'],
            ['昨日見たアニメは面白かった。', 'きのうみたアニメはおもしろかった。', 'kinou mita anime wa omoshirokatta', '昨天看的动画很有趣。', '見た直接修饰アニメ；い形容词过去式：面白い→面白かった。'],
            ['これより、あれのほうが好き。', 'これより、あれのほうがすき。', 'kore yori are no hou ga suki', '比起这个，我更喜欢那个。', 'AよりBのほうが～：B比A更～。'],
            ['時間があったら、見てみて。', 'じかんがあったら、みてみて。', 'jikan ga attara mite mite', '有时间的话，看一下吧。', '～たら表示条件；見てみて是見てみる的て形，用于随意请求。'],
            ['約束を忘れないで。', 'やくそくをわすれないで。', 'yakusoku o wasurenaide', '别忘了约定。', 'ない形＋で：请求不要做某事；礼貌说法加ください。'],
        ])),
    ];
    const moveWords = (from, to, texts) => {
        const source = wordGroups.find(section => section.id === from);
        const target = window.JapaneseLifeData.words.find(section => section.id === to);
        target.items.unshift(...source.items.filter(entry => texts.includes(entry.text)));
        source.items = source.items.filter(entry => !texts.includes(entry.text));
    };
    moveWords('travel', 'food', ['水', 'ご飯']);
    moveWords('travel', 'shopping', ['店', 'お金']);
    moveWords('travel', 'questions', ['いくら', 'どこ', 'これ']);
    moveWords('travel', 'home', ['トイレ']);
    moveWords('actions', 'food', ['美味しい']);
    moveWords('actions', 'adjectives', ['大きい', '小さい', '新しい', '古い', '好き', '楽しい', '難しい', '忙しい']);
    // Add life topics while keeping the original learning entries and stable category ids.
    for (const [groups, additions] of [[wordGroups, window.JapaneseLifeData.words], [sentenceGroups, window.JapaneseLifeData.sentences]]) {
        for (const addition of additions) {
            const existing = groups.find(section => section.id === addition.id);
            if (existing) {
                existing.items.push(...addition.items);
                existing.label = addition.label;
                existing.description = addition.description;
            } else groups.push(addition);
        }
    }
    return [
        { id: 'kana', label: '假名', unit: '音', groups: kanaGroups },
        { id: 'words', label: '单词', unit: '词', groups: wordGroups },
        { id: 'sentences', label: '句子', unit: '句', groups: sentenceGroups },
    ];
})();
