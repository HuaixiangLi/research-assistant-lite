# Research Assistant Lite

Research Assistant Lite 是一个给 Zotero 用的轻量插件。它解决的是一个很常见的问题：文献越导越多，标签越来越乱，最后想找一篇论文还得靠记忆。

插件不会调用 AI，也不会把文献信息传到服务器。它只在本地读取论文的标题、摘要、DOI 和 Zotero 标签，然后用一组可编辑的关键词规则给论文归类。适合用来管理催化、材料、化学工程等方向的论文库，也可以按自己的研究方向改规则。

## 它能做什么

导入论文后，插件会自动判断论文属于哪些研究方向。比如标题或摘要里出现 `propane dehydrogenation`，就会打上 `PDH`；出现 `nickel` 或 `Ni-based`，就会打上 `Ni catalyst`；出现 `deactivation`、`coking`、`sintering` 这类词，就会归到 `Catalyst stability`。

一篇论文可以有多个分类标签。比如一篇关于 Ni 催化剂用于丙烷脱氢稳定性的综述，可能同时得到：

```text
PDH
Ni catalyst
Catalyst stability
review
```

插件不依赖 Zotero 文件夹来做分类。它保留 Zotero 原有结构，只用标签作为研究方向入口。你原来已有的阅读状态标签，比如“泛读”“未读”“notion”，不会再混进插件的研究分类面板。

## 主要功能

自动分类：新增或导入文献时，插件会监听 Zotero 的 item add 事件，并自动运行本地规则。

批量整理：右侧面板里有 `Re-classify` 按钮，可以重新扫描当前 library，把旧文献也按最新规则整理一遍。

可解释标签：每个自动标签都能看到来源。插件会显示命中的规则、关键词、字段和分数，方便判断这个分类是不是合理。

排序搜索：侧栏搜索不是简单过滤。标题命中、摘要命中、标签命中和最近打开记录都会影响排序，常用或更相关的论文会排在前面。

研究概览：面板会统计当前文献库里各研究方向的数量，显示最近 7 天新增文献、最常见方向和潜在重复条目数量。

重复检测：插件会用 DOI 和标题相似度做轻量去重提醒。它只提示，不会自动删除任何条目。

## 当前内置分类

默认规则偏向催化和材料方向，主要包括：

```text
PDH
CO2 hydrogenation
Ni catalyst
Pt catalyst
In catalyst
Catalyst stability
Reaction mechanism
Catalyst synthesis
Dry reforming
Oxidative dehydrogenation
2D materials
Zeolite catalyst
review
```

这些分类不是写死在代码里的。你可以改 `src/rules/rules.json`，然后重新打包 XPI。

## 修改分类规则

规则文件在：

```text
src/rules/rules.json
```

一个规则大概长这样：

```json
{
  "PDH": {
    "keywords": [
      "propane dehydrogenation",
      "dehydrogenation of propane",
      "PDH",
      "propylene production"
    ],
    "weight": 3
  },
  "Ni catalyst": {
    "keywords": ["Ni", "nickel", "Ni-based", "nickel-based"],
    "weight": 2,
    "wordBoundary": true
  }
}
```

每个分类名就是最终显示在 Zotero 里的标签名。`keywords` 是关键词列表，插件会在标题和摘要里查找这些词。`weight` 用来调节这个规则的重要程度。`wordBoundary` 适合 `Ni`、`Pt` 这种很短的词，可以减少误匹配。

还可以使用这些字段：

```text
fields
```

指定匹配字段，默认是 `["title", "abstract"]`。

```text
name
```

给规则起一个解释用的名字。如果不写，就使用分类标签本身。

## 使用方式

安装 XPI 后，重启 Zotero。选中一篇文献，在右侧详情栏里找到 Research Assistant Lite 面板。不同 Zotero 界面布局下，它可能显示在右侧竖排图标区，也可能作为右侧详情栏里的一个折叠面板。

第一次使用建议点一次：

```text
Re-classify
```

这样旧文献也会按当前规则重新分类。以后新导入的论文会自动处理。

如果你改了 `rules.json`，也需要重新构建并安装 XPI，然后再点一次 `Re-classify`。

## 安装和构建

开发环境使用 pnpm：

```powershell
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

构建完成后会生成：

```text
dist/research-assistant-lite.xpi
```

也会生成带版本号的 XPI，例如：

```text
dist/research-assistant-lite-0.3.6.xpi
```

在 Zotero 里打开插件或附加组件管理器，选择从文件安装，然后选这个 XPI。

## 隐私和限制

这个插件只做本地关键词匹配。它不会调用 OpenAI、Claude、Gemini 或其他 AI API，也不会使用 embedding、向量数据库、后端服务或云端同步。

它的好处是简单、透明、可控。缺点也很明确：分类质量取决于规则写得好不好。如果你的研究方向变化了，或者想区分更细的材料体系，需要自己调整 `rules.json`。

## 适合谁

这个插件适合已经在 Zotero 里积累了不少论文，又不想每篇都手动放文件夹的人。尤其适合按研究方向、催化体系、材料类型、反应类型来找论文的场景。

它不是文献综述自动写作工具，也不是智能问答助手。它更像一个本地整理器：导入时先帮你粗分一遍，之后你可以用标签、搜索和解释信息快速定位论文。
