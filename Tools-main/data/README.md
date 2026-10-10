# 大学英语四级词库

`cet4-vocabulary.js` 包含 3,847 个唯一词条，按单词字母顺序排列，由英语学习详情页本地加载，无需运行时请求外部词典。

数据来源：[skywind3000/ECDICT](https://github.com/skywind3000/ECDICT)，固定版本 `bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b` 的 [`ecdict.csv`](https://github.com/skywind3000/ECDICT/blob/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/ecdict.csv)。上游采用 MIT 许可，完整声明见 [ECDICT-LICENSE](ECDICT-LICENSE)。

处理规则：

- 仅提取 `tag` 中含独立 `cet4` 标签的词条；这是开源词典的四级分类，不宣称为官方完整考试大纲。
- 排除上游两个拼写异常词条 `reservior` 和 `uptodate`，不把错误拼写用于学习。
- 保留单词、音标和中文释义；从释义前缀提取词性，将 `a.` 展示为 `adj.`，合并重复释义，优先展示通用释义。
- 上游缺少音标或词性时保留空值，页面隐藏相应字段；仍可使用浏览器朗读。
- 原页面音标和例句在匹配的四级词条中保留；完整例句由下方独立文件提供。

扩充时请继续核对来源分类、授权和词条格式，运行 `node --test tests/english.test.js`，并检查详情页切词和窄屏显示。

## 英文例句与中文句意

`cet4-examples.js` 为全部 3,847 个单词提供一个配对的英文例句与中文句意，保持原词库数量和字母顺序。例句单独本地加载，切词时通过 `textContent` 展示。

来源：[Ceelog 的《威威的 GPT 单词本》](https://github.com/Ceelog/DictionaryByGPT4)，固定版本 `8c9b050b653108145a94a559c816e0e499ef1627` 的 [`gptwords.json`](https://github.com/Ceelog/DictionaryByGPT4/blob/8c9b050b653108145a94a559c816e0e499ef1627/gptwords.json)。源内容为 GPT-4 生成的学习材料，采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 许可，完整许可见 [EXAMPLES-LICENSE](EXAMPLES-LICENSE)。此处改编的 `cet4-examples.js` 也以 CC BY-SA 4.0 提供；原词库的 MIT 许可保持独立。

改编方式：仅从匹配词条的例句部分提取包含目标词或其屈折变化的英文句子及配对中文，去掉 Markdown 排版和多余括号；保留原页面已有的有效例句，补写缺失或不适合展示的例句。原书的词源、记忆故事和其他分析没有导入。补写内容由 Navigation 维护者和 AI 助手整理。页面提供来源署名及许可链接。
