# 大学英语四级词库

`cet4-vocabulary.js` 包含 3,847 个唯一词条，按单词字母顺序排列，由英语学习详情页本地加载，无需运行时请求外部词典。

数据来源：[skywind3000/ECDICT](https://github.com/skywind3000/ECDICT)，固定版本 `bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b` 的 [`ecdict.csv`](https://github.com/skywind3000/ECDICT/blob/bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b/ecdict.csv)。上游采用 MIT 许可，完整声明见 [ECDICT-LICENSE](ECDICT-LICENSE)。

处理规则：

- 仅提取 `tag` 中含独立 `cet4` 标签的词条；这是开源词典的四级分类，不宣称为官方完整考试大纲。
- 排除上游两个拼写异常词条 `reservior` 和 `uptodate`，不把错误拼写用于学习。
- 保留单词、音标和中文释义；从释义前缀提取词性，将 `a.` 展示为 `adj.`，合并重复释义，优先展示通用释义。
- 上游缺少音标或词性时保留空值，页面隐藏相应字段；仍可使用浏览器朗读。
- 原页面例句及其音标在匹配的四级词条中保留；其他词条不生成或冒充来源例句。

扩充时请继续核对来源分类、授权和词条格式，运行 `node --test tests/english.test.js`，并检查详情页切词和窄屏显示。
