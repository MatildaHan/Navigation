'use strict';

// Original daily-life vocabulary and example sentences; rows keep the four learning fields together.
window.JapaneseLifeData = (() => {
    const group = (id, label, description, source) => ({ id, label, description, items: source.trim().split('\n').map(line => {
        const [text, kana, romaji, meaning, note = ''] = line.split('|');
        return { text, kana, romaji, meaning, note };
    }) });
    const words = [
        group('greetings', '问候与回应', '问候、道谢、告别与常见回应。', `
おやすみなさい|おやすみなさい|oyasuminasai|晚安
さようなら|さようなら|sayounara|再见
ごめんなさい|ごめんなさい|gomennasai|对不起
どうぞ|どうぞ|douzo|请 / 请用
どういたしまして|どういたしまして|dou itashimashite|不客气
いただきます|いただきます|itadakimasu|我开动了|吃饭前表达感谢。
ごちそうさまでした|ごちそうさまでした|gochisousama deshita|多谢款待|吃完饭后的表达。
いってきます|いってきます|itte kimasu|我出门了
いってらっしゃい|いってらっしゃい|itte rasshai|路上小心|回应出门的人。
ただいま|ただいま|tadaima|我回来了
おかえりなさい|おかえりなさい|okaerinasai|欢迎回来
お疲れさまです|おつかれさまです|otsukaresama desu|辛苦了|工作中常用的招呼。
失礼します|しつれいします|shitsurei shimasu|打扰了 / 告辞了
おめでとう|おめでとう|omedetou|恭喜
うん|うん|un|嗯 / 是的|熟人间的随意回应。
ううん|ううん|uun|不 / 不是|随意说法，与うん区别。
`),
        group('people', '人物与生活', '人物关系与常用称呼；自家成员和对方家人的称呼可能不同。', `
人|ひと|hito|人
子供|こども|kodomo|孩子
大人|おとな|otona|大人
男の人|おとこのひと|otoko no hito|男性
女の人|おんなのひと|onna no hito|女性
父|ちち|chichi|父亲|向别人说自己的父亲。
母|はは|haha|母亲|向别人说自己的母亲。
お父さん|おとうさん|otousan|爸爸 / 您的父亲
お母さん|おかあさん|okaasan|妈妈 / 您的母亲
兄|あに|ani|哥哥|向别人说自己的哥哥。
姉|あね|ane|姐姐|向别人说自己的姐姐。
弟|おとうと|otouto|弟弟
妹|いもうと|imouto|妹妹
夫|おっと|otto|丈夫
妻|つま|tsuma|妻子
祖父|そふ|sofu|祖父 / 外祖父
祖母|そぼ|sobo|祖母 / 外祖母
赤ちゃん|あかちゃん|akachan|婴儿
学生|がくせい|gakusei|学生
会社員|かいしゃいん|kaishain|公司职员
医者|いしゃ|isha|医生
店員|てんいん|ten'in|店员
隣の人|となりのひと|tonari no hito|邻居 / 旁边的人
`),
        group('travel', '交通与方向', '交通工具、车票、站点和方向。', `
車|くるま|kuruma|汽车
自転車|じてんしゃ|jitensha|自行车
バス|バス|basu|公交车
タクシー|タクシー|takushii|出租车
地下鉄|ちかてつ|chikatetsu|地铁
飛行機|ひこうき|hikouki|飞机
空港|くうこう|kuukou|机场
バス停|バスてい|basutei|公交站
切符|きっぷ|kippu|车票
改札|かいさつ|kaisatsu|检票口
出口|でぐち|deguchi|出口
入口|いりぐち|iriguchi|入口
道|みち|michi|道路
交差点|こうさてん|kousaten|十字路口
信号|しんごう|shingou|交通信号灯
右|みぎ|migi|右
左|ひだり|hidari|左
まっすぐ|まっすぐ|massugu|笔直 / 直走
近く|ちかく|chikaku|附近
遠く|とおく|tooku|远处
地図|ちず|chizu|地图
乗り換え|のりかえ|norikae|换乘
片道|かたみち|katamichi|单程
往復|おうふく|oufuku|往返
出発|しゅっぱつ|shuppatsu|出发
到着|とうちゃく|touchaku|到达
`),
        group('time', '时间与数量', '时间、星期与基本数量；日期和量词常有特殊读法。', `
朝|あさ|asa|早晨
昼|ひる|hiru|中午 / 白天
夜|よる|yoru|夜晚
夕方|ゆうがた|yuugata|傍晚
午前|ごぜん|gozen|上午
午後|ごご|gogo|下午
毎日|まいにち|mainichi|每天
毎週|まいしゅう|maishuu|每周
今週|こんしゅう|konshuu|本周
来週|らいしゅう|raishuu|下周
先週|せんしゅう|senshuu|上周
今月|こんげつ|kongetsu|这个月
来月|らいげつ|raigetsu|下个月
今年|ことし|kotoshi|今年
来年|らいねん|rainen|明年
去年|きょねん|kyonen|去年
月曜日|げつようび|getsuyoubi|星期一
火曜日|かようび|kayoubi|星期二
水曜日|すいようび|suiyoubi|星期三
木曜日|もくようび|mokuyoubi|星期四
金曜日|きんようび|kinyoubi|星期五
土曜日|どようび|doyoubi|星期六
日曜日|にちようび|nichiyoubi|星期日
週末|しゅうまつ|shuumatsu|周末
誕生日|たんじょうび|tanjoubi|生日
何時|なんじ|nanji|几点
半|はん|han|半|三時半：三点半。
分|ふん|fun|分钟|会变读：一分いっぷん、三分さんぷん。
秒|びょう|byou|秒
一日|ついたち|tsuitachi|每月一号|表示一天时通常读いちにち。
二日|ふつか|futsuka|二号 / 两天
三日|みっか|mikka|三号 / 三天
四日|よっか|yokka|四号 / 四天
五日|いつか|itsuka|五号 / 五天
六日|むいか|muika|六号 / 六天
七日|なのか|nanoka|七号 / 七天
八日|ようか|youka|八号 / 八天
九日|ここのか|kokonoka|九号 / 九天
十日|とおか|tooka|十号 / 十天
二十日|はつか|hatsuka|二十号 / 二十天
百|ひゃく|hyaku|一百
千|せん|sen|一千
万|まん|man|一万
一つ|ひとつ|hitotsu|一个
二つ|ふたつ|futatsu|两个
三つ|みっつ|mittsu|三个
一人|ひとり|hitori|一个人
二人|ふたり|futari|两个人
`),
        group('actions', '日常动作', '日常动词原形；用句式练习请求、否定和过去时。', `
起きる|おきる|okiru|起床 / 发生
寝る|ねる|neru|睡觉
歩く|あるく|aruku|走路
走る|はしる|hashiru|跑
乗る|のる|noru|乘坐
降りる|おりる|oriru|下车 / 下去
入る|はいる|hairu|进入
出る|でる|deru|出去 / 出现
座る|すわる|suwaru|坐
立つ|たつ|tatsu|站立
買う|かう|kau|买
売る|うる|uru|卖
使う|つかう|tsukau|使用
作る|つくる|tsukuru|制作
読む|よむ|yomu|读
書く|かく|kaku|写
話す|はなす|hanasu|说话
勉強する|べんきょうする|benkyou suru|学习
働く|はたらく|hataraku|工作
休む|やすむ|yasumu|休息 / 请假
洗う|あらう|arau|洗
掃除する|そうじする|souji suru|打扫
洗濯する|せんたくする|sentaku suru|洗衣服
料理する|りょうりする|ryouri suru|做饭
開ける|あける|akeru|打开|把门等打开，及物动词。
閉める|しめる|shimeru|关上|把门等关上，及物动词。
つける|つける|tsukeru|打开 / 附上|可用于开灯、开电器。
消す|けす|kesu|关掉 / 擦掉
持つ|もつ|motsu|拿 / 拥有
取る|とる|toru|取 / 拿
置く|おく|oku|放置
探す|さがす|sagasu|寻找
忘れる|わすれる|wasureru|忘记
覚える|おぼえる|oboeru|记住
会う|あう|au|见面
遊ぶ|あそぶ|asobu|玩
手伝う|てつだう|tetsudau|帮忙
借りる|かりる|kariru|借入
貸す|かす|kasu|借出
払う|はらう|harau|支付
予約する|よやくする|yoyaku suru|预约
送る|おくる|okuru|发送 / 送
教える|おしえる|oshieru|教 / 告诉
もらう|もらう|morau|收到
あげる|あげる|ageru|给
ある|ある|aru|有 / 在|主要用于无生命的事物。
いる|いる|iru|有 / 在|主要用于人和动物。
できる|できる|dekiru|能够 / 完成
`),
        group('subtitles', '字幕常见词', '普通对白常见的回应、程度词与情绪词。', `
僕|ぼく|boku|我|常用于较随意的男性自称，也受人物风格影响。
俺|おれ|ore|我|随意、偏粗犷的自称，慎用于礼貌场合。
君|きみ|kimi|你|受关系和语气影响，不通用于所有人。
お前|おまえ|omae|你|很随意，有时不礼貌。
すごい|すごい|sugoi|厉害 / 很惊人
やっぱり|やっぱり|yappari|果然 / 还是
ちゃんと|ちゃんと|chanto|好好地 / 规规矩矩地
ちょっと|ちょっと|chotto|稍微 / 等一下
ずっと|ずっと|zutto|一直 / 更加
たぶん|たぶん|tabun|大概
もちろん|もちろん|mochiron|当然
なるほど|なるほど|naruhodo|原来如此
嘘|うそ|uso|谎言|うそ！也可表示惊讶：不会吧！
心配|しんぱい|shinpai|担心
無理|むり|muri|勉强 / 办不到
理由|りゆう|riyuu|理由
`),
        group('food', '饮食与食材', '餐食、饮料、常见食材和味道。', `
朝ご飯|あさごはん|asagohan|早饭
昼ご飯|ひるごはん|hirugohan|午饭
晩ご飯|ばんごはん|bangohan|晚饭
パン|パン|pan|面包
肉|にく|niku|肉
牛肉|ぎゅうにく|gyuuniku|牛肉
豚肉|ぶたにく|butaniku|猪肉
鶏肉|とりにく|toriniku|鸡肉
魚|さかな|sakana|鱼
卵|たまご|tamago|鸡蛋
野菜|やさい|yasai|蔬菜
果物|くだもの|kudamono|水果
りんご|りんご|ringo|苹果
バナナ|バナナ|banana|香蕉
みかん|みかん|mikan|橘子
いちご|いちご|ichigo|草莓
ぶどう|ぶどう|budou|葡萄
じゃがいも|じゃがいも|jagaimo|土豆
にんじん|にんじん|ninjin|胡萝卜
玉ねぎ|たまねぎ|tamanegi|洋葱
トマト|トマト|tomato|番茄
キャベツ|キャベツ|kyabetsu|卷心菜
きゅうり|きゅうり|kyuuri|黄瓜
豆腐|とうふ|toufu|豆腐
米|こめ|kome|大米|尚未煮成饭的米。
塩|しお|shio|盐
砂糖|さとう|satou|糖
醤油|しょうゆ|shouyu|酱油
油|あぶら|abura|油
お茶|おちゃ|ocha|茶
コーヒー|コーヒー|koohii|咖啡
牛乳|ぎゅうにゅう|gyuunyuu|牛奶
ジュース|ジュース|juusu|果汁
ビール|ビール|biiru|啤酒
お酒|おさけ|osake|酒
スープ|スープ|suupu|汤
味噌汁|みそしる|misoshiru|味噌汤
カレー|カレー|karee|咖喱
ラーメン|ラーメン|raamen|拉面
うどん|うどん|udon|乌冬面
そば|そば|soba|荞麦面
寿司|すし|sushi|寿司
おにぎり|おにぎり|onigiri|饭团
弁当|べんとう|bentou|便当
ケーキ|ケーキ|keeki|蛋糕
アイスクリーム|アイスクリーム|aisu kuriimu|冰淇淋
甘い|あまい|amai|甜
辛い|からい|karai|辣
苦い|にがい|nigai|苦
酸っぱい|すっぱい|suppai|酸
しょっぱい|しょっぱい|shoppai|咸
`),
        group('home', '居家与用品', '房间、家具、家电和日常用品。', `
部屋|へや|heya|房间
台所|だいどころ|daidokoro|厨房
玄関|げんかん|genkan|玄关 / 入户处
お風呂|おふろ|ofuro|浴室 / 洗澡
庭|にわ|niwa|院子
窓|まど|mado|窗户
ドア|ドア|doa|门
鍵|かぎ|kagi|钥匙 / 锁
机|つくえ|tsukue|书桌
椅子|いす|isu|椅子
テーブル|テーブル|teeburu|桌子
ベッド|ベッド|beddo|床
布団|ふとん|futon|被褥
枕|まくら|makura|枕头
冷蔵庫|れいぞうこ|reizouko|冰箱
洗濯機|せんたくき|sentakuki|洗衣机
電子レンジ|でんしレンジ|denshi renji|微波炉
エアコン|エアコン|eakon|空调
テレビ|テレビ|terebi|电视
電気|でんき|denki|电 / 电灯
ゴミ|ゴミ|gomi|垃圾
ゴミ箱|ゴミばこ|gomibako|垃圾桶
袋|ふくろ|fukuro|袋子
箱|はこ|hako|盒子
タオル|タオル|taoru|毛巾
石けん|せっけん|sekken|肥皂
歯ブラシ|はブラシ|haburashi|牙刷
シャンプー|シャンプー|shanpuu|洗发水
鏡|かがみ|kagami|镜子
皿|さら|sara|盘子
コップ|コップ|koppu|杯子
箸|はし|hashi|筷子
スプーン|スプーン|supuun|勺子
フォーク|フォーク|fooku|叉子
包丁|ほうちょう|houchou|菜刀
鍋|なべ|nabe|锅
`),
        group('shopping', '购物与衣物', '衣物、价格、付款和日常购物。', `
スーパー|スーパー|suupaa|超市
コンビニ|コンビニ|konbini|便利店
レジ|レジ|reji|收银台
値段|ねだん|nedan|价格
現金|げんきん|genkin|现金
カード|カード|kaado|卡 / 银行卡
お釣り|おつり|otsuri|找零
レシート|レシート|reshiito|小票
財布|さいふ|saifu|钱包
服|ふく|fuku|衣服
シャツ|シャツ|shatsu|衬衫
Tシャツ|ティーシャツ|tii shatsu|T恤
ズボン|ズボン|zubon|裤子
スカート|スカート|sukaato|裙子
コート|コート|kooto|外套 / 大衣
靴|くつ|kutsu|鞋
靴下|くつした|kutsushita|袜子
帽子|ぼうし|boushi|帽子
かばん|かばん|kaban|包
眼鏡|めがね|megane|眼镜
傘|かさ|kasa|伞
サイズ|サイズ|saizu|尺码 / 大小
色|いろ|iro|颜色
赤|あか|aka|红色
青|あお|ao|蓝色
白|しろ|shiro|白色
黒|くろ|kuro|黑色
黄色|きいろ|kiiro|黄色
緑|みどり|midori|绿色
安い|やすい|yasui|便宜
高い|たかい|takai|贵 / 高
`),
        group('health', '身体与健康', '身体部位、症状与常用就诊词汇。', `
体|からだ|karada|身体
頭|あたま|atama|头
顔|かお|kao|脸
目|め|me|眼睛
耳|みみ|mimi|耳朵
鼻|はな|hana|鼻子
口|くち|kuchi|嘴
歯|は|ha|牙齿
首|くび|kubi|脖子
肩|かた|kata|肩膀
手|て|te|手
指|ゆび|yubi|手指 / 脚趾
足|あし|ashi|脚 / 腿
お腹|おなか|onaka|肚子
背中|せなか|senaka|背部
病院|びょういん|byouin|医院
薬局|やっきょく|yakkyoku|药店
薬|くすり|kusuri|药
風邪|かぜ|kaze|感冒
熱|ねつ|netsu|发烧 / 热
咳|せき|seki|咳嗽
痛い|いたい|itai|疼
具合|ぐあい|guai|身体状况 / 状态
元気|げんき|genki|健康 / 有精神
アレルギー|アレルギー|arerugii|过敏
保険証|ほけんしょう|hokenshou|保险证
`),
        group('weather', '天气与自然', '天气、季节和周围环境。', `
天気|てんき|tenki|天气
晴れ|はれ|hare|晴天
曇り|くもり|kumori|阴天
雨|あめ|ame|雨
雪|ゆき|yuki|雪
風|かぜ|kaze|风
暑い|あつい|atsui|天气热
寒い|さむい|samui|天气冷
暖かい|あたたかい|atatakai|暖和
涼しい|すずしい|suzushii|凉爽
春|はる|haru|春天
夏|なつ|natsu|夏天
秋|あき|aki|秋天
冬|ふゆ|fuyu|冬天
空|そら|sora|天空
海|うみ|umi|海
山|やま|yama|山
川|かわ|kawa|河
花|はな|hana|花
木|き|ki|树
犬|いぬ|inu|狗
猫|ねこ|neko|猫
`),
        group('work', '学习与工作', '教室、办公用品、设备与工作安排。', `
会社|かいしゃ|kaisha|公司
教室|きょうしつ|kyoushitsu|教室
大学|だいがく|daigaku|大学
図書館|としょかん|toshokan|图书馆
本|ほん|hon|书
新聞|しんぶん|shinbun|报纸
雑誌|ざっし|zasshi|杂志
ノート|ノート|nooto|笔记本
紙|かみ|kami|纸
ペン|ペン|pen|笔
鉛筆|えんぴつ|enpitsu|铅笔
消しゴム|けしゴム|keshigomu|橡皮
宿題|しゅくだい|shukudai|作业
試験|しけん|shiken|考试
質問|しつもん|shitsumon|问题 / 提问
答え|こたえ|kotae|答案
漢字|かんじ|kanji|汉字
意味|いみ|imi|意思
会議|かいぎ|kaigi|会议
予定|よてい|yotei|计划 / 安排
電話|でんわ|denwa|电话
スマホ|スマホ|sumaho|智能手机
パソコン|パソコン|pasokon|电脑
メール|メール|meeru|邮件
写真|しゃしん|shashin|照片
充電|じゅうでん|juuden|充电
インターネット|インターネット|intaanetto|互联网
`),
        group('hobbies', '休闲与活动', '日常休闲、运动与外出活动。', `
映画|えいが|eiga|电影
音楽|おんがく|ongaku|音乐
歌|うた|uta|歌曲
漫画|まんが|manga|漫画
ゲーム|ゲーム|geemu|游戏
旅行|りょこう|ryokou|旅行
散歩|さんぽ|sanpo|散步
運動|うんどう|undou|运动
スポーツ|スポーツ|supootsu|体育运动
サッカー|サッカー|sakkaa|足球
公園|こうえん|kouen|公园
美術館|びじゅつかん|bijutsukan|美术馆
趣味|しゅみ|shumi|爱好
休日|きゅうじつ|kyuujitsu|休息日
パーティー|パーティー|paatii|聚会
歌う|うたう|utau|唱歌
泳ぐ|およぐ|oyogu|游泳
撮る|とる|toru|拍摄|写真を撮る：拍照。
笑う|わらう|warau|笑
泣く|なく|naku|哭
`),
        group('adjectives', '状态与感受', '描述物品、环境、心情与程度。', `
いい|いい|ii|好|活用多用よい的形式，如よかった。
悪い|わるい|warui|坏 / 不好
多い|おおい|ooi|多
少ない|すくない|sukunai|少
長い|ながい|nagai|长
短い|みじかい|mijikai|短
近い|ちかい|chikai|近
遠い|とおい|tooi|远
早い|はやい|hayai|早
速い|はやい|hayai|快
遅い|おそい|osoi|晚 / 慢
重い|おもい|omoi|重
軽い|かるい|karui|轻
熱い|あつい|atsui|烫 / 物体热|与描述天气的暑い区分。
冷たい|つめたい|tsumetai|冰凉 / 冷淡
簡単|かんたん|kantan|简单
便利|べんり|benri|方便
静か|しずか|shizuka|安静
にぎやか|にぎやか|nigiyaka|热闹
きれい|きれい|kirei|漂亮 / 干净|な形容词：きれいな部屋。
汚い|きたない|kitanai|脏
面白い|おもしろい|omoshiroi|有趣
つまらない|つまらない|tsumaranai|无聊
うれしい|うれしい|ureshii|高兴
悲しい|かなしい|kanashii|悲伤
寂しい|さびしい|sabishii|寂寞
怖い|こわい|kowai|害怕 / 可怕
眠い|ねむい|nemui|困
疲れる|つかれる|tsukareru|疲倦|疲れた：累了。
嫌い|きらい|kirai|不喜欢 / 讨厌
大切|たいせつ|taisetsu|重要 / 珍贵
必要|ひつよう|hitsuyou|必要
とても|とても|totemo|非常
少し|すこし|sukoshi|一点
たくさん|たくさん|takusan|很多
`),
        group('questions', '提问与指示', '疑问词、指示词、位置与连接表达。', `
何|なに|nani|什么|在何ですか等表达中读なん。
誰|だれ|dare|谁
いつ|いつ|itsu|什么时候
どれ|どれ|dore|哪一个
どちら|どちら|dochira|哪边 / 哪位|比どっち礼貌。
どう|どう|dou|怎么样
どんな|どんな|donna|什么样的
いくつ|いくつ|ikutsu|几个 / 几岁
なぜ|なぜ|naze|为什么
それ|それ|sore|那个|靠近听话者。
あれ|あれ|are|那个|离双方都远。
ここ|ここ|koko|这里
そこ|そこ|soko|那里|靠近听话者。
あそこ|あそこ|asoko|那里|离双方都远。
この|この|kono|这个……|后接名词。
その|その|sono|那个……|后接名词。
あの|あの|ano|那个……|后接名词；也可作搭话语。
上|うえ|ue|上面
下|した|shita|下面
中|なか|naka|里面
外|そと|soto|外面
前|まえ|mae|前面 / 之前
後ろ|うしろ|ushiro|后面
隣|となり|tonari|旁边
全部|ぜんぶ|zenbu|全部
一緒|いっしょ|issho|一起
でも|でも|demo|但是
そして|そして|soshite|然后 / 而且
`),
        group('services', '住宿与办事', '住宿、邮政、银行和需要帮助时的基础词。', `
ホテル|ホテル|hoteru|酒店
旅館|りょかん|ryokan|日式旅馆
予約|よやく|yoyaku|预约 / 预订
受付|うけつけ|uketsuke|接待处
住所|じゅうしょ|juusho|地址
番号|ばんごう|bangou|号码
パスポート|パスポート|pasupooto|护照
荷物|にもつ|nimotsu|行李 / 包裹
郵便局|ゆうびんきょく|yuubinkyoku|邮局
銀行|ぎんこう|ginkou|银行
交番|こうばん|kouban|警察岗亭
警察|けいさつ|keisatsu|警察
救急車|きゅうきゅうしゃ|kyuukyuusha|救护车
火事|かじ|kaji|火灾
地震|じしん|jishin|地震
忘れ物|わすれもの|wasuremono|遗失物 / 忘带的东西
注文|ちゅうもん|chuumon|点单 / 订购
メニュー|メニュー|menyuu|菜单
お会計|おかいけい|okaikei|结账
営業時間|えいぎょうじかん|eigyou jikan|营业时间
`),
    ];
    const sentences = [
        group('food', '餐厅与饮食', '点餐、说明需求、询问食材与结账。', `
二人です。|ふたりです。|futari desu|我们两位。|餐厅询问人数时的回应。
メニューを見せてください。|メニューをみせてください。|menyuu o misete kudasai|请给我看一下菜单。|見せる→見せて：给对方看。
おすすめは何ですか。|おすすめはなんですか。|osusume wa nan desu ka|有什么推荐的吗？|可用于菜品或商品。
ラーメンを一つお願いします。|ラーメンをひとつおねがいします。|raamen o hitotsu onegaishimasu|请给我一份拉面。|物品＋数量＋お願いします。
辛くしないでください。|からくしないでください。|karaku shinaide kudasai|请不要做辣。|い形容词去い＋くする：使……。
卵は入っていますか。|たまごははいっていますか。|tamago wa haitte imasu ka|里面有鸡蛋吗？|入る→入っている：已含在里面。
卵のアレルギーがあります。|たまごのアレルギーがあります。|tamago no arerugii ga arimasu|我对鸡蛋过敏。|名词＋のアレルギー。
水をもう一杯ください。|みずをもういっぱいください。|mizu o mou ippai kudasai|请再给我一杯水。|一杯读いっぱい；杯是杯装饮料的量词。
持ち帰りでお願いします。|もちかえりでおねがいします。|mochikaeri de onegaishimasu|麻烦打包带走。|饮食店外带表达。
お会計をお願いします。|おかいけいをおねがいします。|okaikei o onegaishimasu|麻烦结账。|お会計表示结账；お願いします是礼貌请求。
別々に払えますか。|べつべつにはらえますか。|betsubetsu ni haraemasu ka|可以分开付款吗？|別々に：分别。
とてもおいしかったです。|とてもおいしかったです。|totemo oishikatta desu|非常好吃。|おいしい→おいしかった：过去式。
`),
        group('home', '居家与日常安排', '起居、家务、计划与请求帮助。', `
毎朝七時に起きます。|まいあさしちじにおきます。|maiasa shichiji ni okimasu|我每天早上七点起床。|七時常读しちじ；に标记时间点。
今日は早く寝たいです。|きょうははやくねたいです。|kyou wa hayaku netai desu|今天想早点睡。|寝る→寝たい。
窓を開けてもいいですか。|まどをあけてもいいですか。|mado o akete mo ii desu ka|可以开窗吗？|て形＋もいいですか：征求许可。
電気を消してください。|でんきをけしてください。|denki o keshite kudasai|请关灯。|消す→消して。
部屋を掃除しています。|へやをそうじしています。|heya o souji shite imasu|我正在打扫房间。|する→している：正在做或持续进行。
洗濯をしてから、出かけます。|せんたくをしてから、でかけます。|sentaku o shite kara dekakemasu|洗完衣服再出门。|て形＋から：做完……之后。
鍵はどこにありますか。|かぎはどこにありますか。|kagi wa doko ni arimasu ka|钥匙在哪里？|物品＋は＋地点＋にあります。
冷蔵庫に牛乳があります。|れいぞうこにぎゅうにゅうがあります。|reizouko ni gyuunyuu ga arimasu|冰箱里有牛奶。|地点＋に＋物品＋があります。
ゴミはどこに捨てればいいですか。|ゴミはどこにすてればいいですか。|gomi wa doko ni sutereba ii desu ka|垃圾应该扔在哪里？|ば形＋いいですか：询问该怎么做。
手伝ってもらえますか。|てつだってもらえますか。|tetsudatte moraemasu ka|可以帮我一下吗？|て形＋もらえますか：请求别人帮忙。
明日は家で休みます。|あしたはいえでやすみます。|ashita wa ie de yasumimasu|明天在家休息。|で标记动作发生的地点。
夕方までに帰ります。|ゆうがたまでにかえります。|yuugata made ni kaerimasu|我会在傍晚之前回来。|までに：不晚于某个时间。
`),
        group('transport', '交通与问路', '买票、换乘、询问时间与目的地。', `
空港までお願いします。|くうこうまでおねがいします。|kuukou made onegaishimasu|麻烦送我到机场。|乘出租车时可用；まで标记终点。
次の駅で降ります。|つぎのえきでおります。|tsugi no eki de orimasu|我在下一站下车。|降りる→降ります。
どこで乗り換えますか。|どこでのりかえますか。|doko de norikaemasu ka|在哪里换乘？|で标记换乘发生的地点。
駅まで歩いて何分ですか。|えきまであるいてなんぷんですか。|eki made aruite nanpun desu ka|步行到车站要几分钟？|何分读なんぷん。
片道の切符をください。|かたみちのきっぷをください。|katamichi no kippu o kudasai|请给我一张单程票。|片道の切符：单程票；名词＋をください。
このバスは空港に行きますか。|このバスはくうこうにいきますか。|kono basu wa kuukou ni ikimasu ka|这辆公交车去机场吗？|この＋名词；に标记行く的目的地。
まっすぐ行って、右に曲がってください。|まっすぐいって、みぎにまがってください。|massugu itte migi ni magatte kudasai|请直走，再向右拐。|动词て形可以连接动作。
道に迷いました。|みちにまよいました。|michi ni mayoimashita|我迷路了。|道に迷う：迷路。
電車は何時に出発しますか。|でんしゃはなんじにしゅっぱつしますか。|densha wa nanji ni shuppatsu shimasu ka|电车几点出发？|何時に：在几点；出発する→出発します。
ここから遠いですか。|ここからとおいですか。|koko kara tooi desu ka|离这里远吗？|から表示起点；遠い：距离远。
`),
        group('clothes', '购物与衣物', '询问尺码、试穿、价格和付款。', `
これを試着してもいいですか。|これをしちゃくしてもいいですか。|kore o shichaku shite mo ii desu ka|可以试穿这个吗？|試着する：试穿。
もう少し大きいサイズはありますか。|もうすこしおおきいサイズはありますか。|mou sukoshi ookii saizu wa arimasu ka|有没有再大一点的尺码？|もう少し：再稍微……；形容词直接修饰名词。
ほかの色はありますか。|ほかのいろはありますか。|hoka no iro wa arimasu ka|有其他颜色吗？|ほかの＋名词：其他的……。
これにします。|これにします。|kore ni shimasu|我选这个。|名词＋にする：做出选择。
袋はいりません。|ふくろはいりません。|fukuro wa irimasen|不需要袋子。|要る→いりません；与表示存在的いる区分。
現金で払います。|げんきんではらいます。|genkin de haraimasu|我用现金付款。|で表示支付方式。
レシートをください。|レシートをください。|reshiito o kudasai|请给我小票。|名词＋をください：请给我……。
この服は少し高いです。|このふくはすこしたかいです。|kono fuku wa sukoshi takai desu|这件衣服有点贵。|少し＋形容词：稍微有点……；高い在此表示贵。
営業時間は何時までですか。|えいぎょうじかんはなんじまでですか。|eigyou jikan wa nanji made desu ka|营业到几点？|何時まで：到几点；まで表示终点。
これを二つ買いたいです。|これをふたつかいたいです。|kore o futatsu kaitai desu|我想买两个这个。|買う→買いたい；二つ是通用数量表达。
`),
        group('health', '健康与求助', '说明不适、寻求帮助与询问位置。', `
頭が痛いです。|あたまがいたいです。|atama ga itai desu|我头疼。|身体部位＋が痛いです。
熱があります。|ねつがあります。|netsu ga arimasu|我发烧了。|症状＋があります：有某种症状。
昨日から咳が出ています。|きのうからせきがでています。|kinou kara seki ga dete imasu|从昨天开始一直咳嗽。|から标记起点；咳が出る：咳嗽。
近くに病院はありますか。|ちかくにびょういんはありますか。|chikaku ni byouin wa arimasu ka|附近有医院吗？|地点＋に＋物品或设施＋はありますか：询问有无。
保険証を持っています。|ほけんしょうをもっています。|hokenshou o motte imasu|我带了保险证。|持っている：持有。
この薬はいつ飲みますか。|このくすりはいつのみますか。|kono kusuri wa itsu nomimasu ka|这个药什么时候吃？|药用飲む表达服用。
今日は具合が悪いので、休みます。|きょうはぐあいがわるいので、やすみます。|kyou wa guai ga warui node yasumimasu|今天身体不舒服，所以休息。|ので说明原因。
助けてください。|たすけてください。|tasukete kudasai|请帮帮我。|需要帮助时的表达。
救急車を呼んでください。|きゅうきゅうしゃをよんでください。|kyuukyuusha o yonde kudasai|请叫救护车。|呼ぶ→呼んで。
財布をなくしました。|さいふをなくしました。|saifu o nakushimashita|我把钱包弄丢了。|なくす：弄丢。
`),
        group('work', '学习与工作', '沟通安排、请教、借用物品与联系。', `
この漢字はどう読みますか。|このかんじはどうよみますか。|kono kanji wa dou yomimasu ka|这个汉字怎么读？|どう＋动词：询问方式；読む→読みます。
この言葉はどういう意味ですか。|このことばはどういういみですか。|kono kotoba wa dou iu imi desu ka|这个词是什么意思？|どういう＋名词：什么样的 / 什么……。
日本語で何と言いますか。|にほんごでなんといいますか。|nihongo de nan to iimasu ka|用日语怎么说？|と表示引用。
ペンを借りてもいいですか。|ペンをかりてもいいですか。|pen o karite mo ii desu ka|可以借一下笔吗？|借りる→借りて；てもいいですか：请求许可。
質問してもいいですか。|しつもんしてもいいですか。|shitsumon shite mo ii desu ka|可以问个问题吗？|質問する→質問して；てもいいですか：请求许可。
会議は何時からですか。|かいぎはなんじからですか。|kaigi wa nanji kara desu ka|会议几点开始？|から表示起始时间。
メールを送りました。|メールをおくりました。|meeru o okurimashita|邮件已经发送了。|送る→送りました：已经发送，礼貌过去式。
もう少し時間をください。|もうすこしじかんをください。|mou sukoshi jikan o kudasai|请再给我一点时间。|もう少し：再一点；名词＋をください。
明日までに終わらせます。|あしたまでにおわらせます。|ashita made ni owarasemasu|我会在明天之前做完。|終わらせる：使某事完成。
スマホを充電してもいいですか。|スマホをじゅうでんしてもいいですか。|sumaho o juuden shite mo ii desu ka|可以给手机充电吗？|充電する→充電して；てもいいですか：请求许可。
`),
        group('plans', '邀约与天气', '约时间、描述天气、表达希望和计划。', `
週末に映画を見に行きませんか。|しゅうまつにえいがをみにいきませんか。|shuumatsu ni eiga o mi ni ikimasen ka|周末要不要去看电影？|动词ます形去ます＋に行く：去做……。
土曜日は空いていますか。|どようびはあいていますか。|doyoubi wa aite imasu ka|星期六有空吗？|空いている：有空 / 空着。
三時に駅で会いましょう。|さんじにえきであいましょう。|sanji ni eki de aimashou|三点在车站见吧。|～ましょう：提议一起做。
少し遅れます。|すこしおくれます。|sukoshi okuremasu|我会晚到一会儿。|遅れる：迟到 / 晚到；ます可表示将来的安排。
今日は雨が降っています。|きょうはあめがふっています。|kyou wa ame ga futte imasu|今天正在下雨。|降る→降っている。
傘を持っていきます。|かさをもっていきます。|kasa o motte ikimasu|我会带伞去。|て形＋いく：带着去 / 做了再去。
明日は晴れると思います。|あしたははれるとおもいます。|ashita wa hareru to omoimasu|我觉得明天会放晴。|普通形＋と思います：表达判断。
寒くなりましたね。|さむくなりましたね。|samuku narimashita ne|天气变冷了呢。|い形容词去い＋くなる：变得……。
また今度にしましょう。|またこんどにしましょう。|mata kondo ni shimashou|我们改天再约吧。|今度：下次；にしましょう：提议选择……。
旅行に行く予定です。|りょこうにいくよていです。|ryokou ni iku yotei desu|我计划去旅行。|动词原形＋予定です：计划做……。
`),
        group('hotel', '住宿与办事', '入住、寄送包裹与填写资料。', `
予約した田中です。|よやくしたたなかです。|yoyaku shita tanaka desu|我是预约过的田中。|予約した修饰名字；可换成自己的姓名。
チェックインをお願いします。|チェックインをおねがいします。|chekkuin o onegaishimasu|麻烦办理入住。|名词＋をお願いします：礼貌地提出办理需求。
荷物を預けてもいいですか。|にもつをあずけてもいいですか。|nimotsu o azukete mo ii desu ka|可以寄存行李吗？|預ける：寄存 / 托付。
チェックアウトは何時ですか。|チェックアウトはなんじですか。|chekkuauto wa nanji desu ka|几点退房？|何時ですか：询问时间点。
部屋の鍵をなくしました。|へやのかぎをなくしました。|heya no kagi o nakushimashita|我把房间钥匙弄丢了。|名词＋の＋名词：所属关系；なくしました是过去式。
この荷物を中国に送りたいです。|このにもつをちゅうごくにおくりたいです。|kono nimotsu o chuugoku ni okuritai desu|我想把这个包裹寄到中国。|に标记寄送目的地；送りたい：想寄送。
ここに住所を書けばいいですか。|ここにじゅうしょをかけばいいですか。|koko ni juusho o kakeba ii desu ka|在这里写地址就可以吗？|書く→書けば；ば形＋いいですか。
番号を教えてください。|ばんごうをおしえてください。|bangou o oshiete kudasai|请告诉我号码。|教える→教えて；て形＋ください：请告诉我……。
`),
        group('patterns', '读字幕的句型', '更多常见结构：经验、能力、持续、条件和推测。', `
日本に行ったことがあります。|にほんにいったことがあります。|nihon ni itta koto ga arimasu|我去过日本。|动词た形＋ことがある：有某种经历。
ひらがなを読むことができます。|ひらがなをよむことができます。|hiragana o yomu koto ga dekimasu|我能读平假名。|动词原形＋ことができる：能够……。
今、勉強しているところです。|いま、べんきょうしているところです。|ima benkyou shite iru tokoro desu|我现在正在学习。|ているところ：正处在做某事的过程。
雨でも、行きます。|あめでも、いきます。|ame demo ikimasu|即使下雨也去。|名词＋でも：即使……也……。
もう食べた？|もうたべた？|mou tabeta|已经吃过了吗？|普通形过去式可以用升调提问。
まだ食べていない。|まだたべていない。|mada tabete inai|还没吃。|まだ＋ていない：还没有做……。
早く寝たほうがいい。|はやくねたほうがいい。|hayaku neta hou ga ii|早点睡比较好。|动词た形＋ほうがいい：建议做……。
明日は寒いかもしれない。|あしたはさむいかもしれない。|ashita wa samui kamo shirenai|明天可能会冷。|普通形＋かもしれない：可能……。
これ、おいしそう。|これ、おいしそう。|kore oishisou|这个看起来很好吃。|い形容词去い＋そう：看起来……；いい→よさそう是例外。
勉強しながら音楽を聞く。|べんきょうしながらおんがくをきく。|benkyou shinagara ongaku o kiku|一边学习一边听音乐。|动词ます形去ます＋ながら：一边……一边……。
行く前に、電話して。|いくまえに、でんわして。|iku mae ni denwa shite|去之前打个电话。|动词原形＋前に：做……之前。
帰ったら、連絡する。|かえったら、れんらくする。|kaettara renraku suru|回去之后联系你。|～たら也可表示某事完成后的时间。
`),
    ];
    return { words, sentences };
})();
