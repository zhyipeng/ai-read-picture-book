# AI 绘本朗读 App V1 实施计划

本文档基于以下两份文档继续展开：

1. `docs/v1.md`
2. `docs/v1-breakdown.md`

目标不是再重复需求，而是把需求映射到当前仓库结构，形成一份可以直接指导开发的实施计划。

配套任务文档：

1. `docs/todo.md`

## 1. 当前仓库现状

当前代码结构非常精简：

1. 已有 Expo Router 基础入口：`app/_layout.tsx`
2. 已有占位首页：`app/index.tsx`
3. 还没有业务页面
4. 还没有数据层、服务层、组件层目录
5. 还没有本地数据库、文件存储、模型调用相关代码

这意味着当前最适合采用“最小增量搭建”的方式推进，不建议一开始引入过多抽象。

## 2. 实施原则

### 2.1 最小化目录扩张

首版建议只新增这些一级目录：

1. `app/`
2. `components/`
3. `lib/`
4. `types/`
5. `docs/`

如果后续复杂度没有明显上升，不要再拆出 `features/`、`store/`、`services/` 等更多层级。

### 2.2 先闭环，后增强

先完成以下主链路：

1. 新建绘本
2. 导入图片
3. 生成文本
4. 编辑文本
5. 生成语音
6. 单页播放
7. 连续播放

拍照导入、图片裁剪、绘本级覆盖等需求一律后置。

### 2.3 抽象只做必要层

首版只建议保留三类抽象：

1. 数据访问层
2. 文件存储层
3. 模型调用层

状态管理、复杂缓存、插件式架构都不应在首版提前引入。

## 3. 建议目录结构

建议逐步演进到以下结构：

```text
app/
  _layout.tsx
  index.tsx
  books/
    new.tsx
    [bookId]/
      index.tsx
      page/
        [pageId].tsx
  settings/
    index.tsx

components/
  books/
    BookCard.tsx
    BookForm.tsx
    PageGrid.tsx
  page/
    PageImage.tsx
    PageTextEditor.tsx
    PageActionBar.tsx
  player/
    AudioPlayerBar.tsx
    PlaybackControls.tsx
  settings/
    ConfigForm.tsx
    ConfigList.tsx

lib/
  db/
    index.ts
    schema.ts
    books.ts
    pages.ts
    modelConfigs.ts
    settings.ts
  storage/
    files.ts
    paths.ts
  providers/
    vision.ts
    tts.ts
    openai-compatible.ts
  playback/
    player.ts
  utils/
    errors.ts
    time.ts
    language.ts

types/
  book.ts
  page.ts
  config.ts
  settings.ts
```

说明：

1. 保持目录浅层，便于 Expo Router 项目快速推进
2. `lib/` 统一承载非 UI 逻辑
3. `types/` 单独存放核心实体定义，避免 UI 文件反复内联类型

## 4. 页面与路由落地方案

### 4.1 路由规划

建议路由如下：

1. `/`：绘本列表页
2. `/books/new`：新建绘本页
3. `/books/[bookId]`：绘本详情页
4. `/books/[bookId]/page/[pageId]`：页面详情页
5. `/settings`：设置页

### 4.2 页面职责映射

#### `app/index.tsx`

职责：

1. 查询全部绘本
2. 展示绘本卡片列表
3. 跳转新建页
4. 支持进入绘本详情
5. 支持删除绘本

首版不做：

1. 搜索
2. 筛选
3. 批量操作

#### `app/books/new.tsx`

职责：

1. 填写绘本名称
2. 选择语言
3. 导入多张页面图片
4. 调整页面顺序
5. 创建绘本与页面记录

#### `app/books/[bookId]/index.tsx`

职责：

1. 展示绘本基础信息
2. 展示页面缩略图及状态
3. 触发整本生成文本
4. 触发整本生成语音
5. 触发连续播放
6. 进入页面详情

#### `app/books/[bookId]/page/[pageId].tsx`

职责：

1. 展示页面大图
2. 编辑三段文本
3. 单页生成文本
4. 单页生成语音
5. 播放当前页音频

#### `app/settings/index.tsx`

职责：

1. 管理 Vision 配置
2. 管理 TTS 配置
3. 设置中英文默认配置
4. 设置默认播放参数
5. 清理本地缓存

## 5. 数据模型落地方案

首版建议严格围绕四类实体：

1. `Book`
2. `Page`
3. `ModelConfig`
4. `AppSettings`

### 5.1 Book

建议字段：

```ts
type Book = {
  id: string;
  title: string;
  language: "zh" | "en";
  coverPageId: string | null;
  pageCount: number;
  currentPageIndex: number;
  visionConfigId: string | null;
  ttsConfigId: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 5.2 Page

建议字段：

```ts
type Page = {
  id: string;
  bookId: string;
  pageIndex: number;
  imagePath: string;
  originalText: string;
  sceneDescription: string;
  readAloudText: string;
  audioPath: string | null;
  audioDuration: number | null;
  textStatus: "idle" | "generating" | "done" | "error";
  audioStatus: "idle" | "generating" | "done" | "error";
  lastError: string | null;
  hasManualEdit: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### 5.3 ModelConfig

建议字段：

```ts
type ModelConfig = {
  id: string;
  type: "vision" | "tts";
  name: string;
  baseUrl: string;
  apiKeyRef: string;
  model: string;
  voice: string | null;
  speed: number | null;
  extraParams: string | null;
  createdAt: string;
  updatedAt: string;
};
```

说明：

1. `apiKeyRef` 只保存安全存储中的引用，不直接把 Key 写入普通表
2. `extraParams` 首版可先存 JSON 字符串，避免提前设计复杂结构

### 5.4 AppSettings

建议字段：

```ts
type AppSettings = {
  defaultZhVisionConfigId: string | null;
  defaultEnVisionConfigId: string | null;
  defaultZhTtsConfigId: string | null;
  defaultEnTtsConfigId: string | null;
  playbackSpeed: number;
  pauseBetweenPages: number;
};
```

## 6. 数据流设计

### 6.1 新建绘本

数据流：

1. 选择图片
2. 复制图片到本地私有目录
3. 创建 `Book`
4. 为每张图片创建 `Page`
5. 回到绘本详情页

### 6.2 单页生成文本

数据流：

1. 读取页面图片路径
2. 根据绘本语言选择默认 Vision 配置
3. 调用 Vision Provider
4. 写回 `originalText`、`sceneDescription`、`readAloudText`
5. 更新 `textStatus`
6. 失败时写入 `lastError`

### 6.3 单页生成语音

数据流：

1. 校验 `readAloudText` 非空
2. 根据绘本语言选择默认 TTS 配置
3. 调用 TTS Provider
4. 保存音频文件
5. 写回 `audioPath`、`audioDuration`、`audioStatus`

### 6.4 连续播放

数据流：

1. 查询当前绘本所有页面
2. 按 `pageIndex` 排序
3. 找到有音频的起始页
4. 当前页播放完成后切换下一页
5. 遇到无音频页面时停止并提示
6. 回写 `currentPageIndex`

## 7. 建议新增模块职责

### 7.1 `lib/db/`

职责：

1. 初始化数据库
2. 执行 CRUD
3. 封装业务查询
4. 维护排序和状态更新

建议拆分：

1. `books.ts`：绘本相关读写
2. `pages.ts`：页面相关读写
3. `modelConfigs.ts`：模型配置读写
4. `settings.ts`：应用设置读写

### 7.2 `lib/storage/`

职责：

1. 生成图片和音频存储路径
2. 复制导入图片
3. 删除音频文件
4. 删除整本绘本目录

### 7.3 `lib/providers/`

职责：

1. 封装 OpenAI 兼容接口请求
2. 对 Vision 与 TTS 做统一调用入口
3. 隔离配置选择逻辑
4. 提供统一错误结构

建议边界：

1. Provider 只负责远程调用与结果解析
2. 不负责页面状态更新
3. 不直接操作 UI

### 7.4 `lib/playback/`

职责：

1. 统一封装音频播放
2. 维护当前播放状态
3. 提供单页播放和连续播放能力

## 8. 迭代顺序

### 8.1 第一轮

目标：让 App 从空白页变成可浏览的业务骨架。

任务：

1. 替换 `app/index.tsx` 占位内容
2. 建立基础页面路由
3. 建立静态页面骨架
4. 补齐页面跳转关系

交付结果：

1. 用户可以在页面间跳转
2. 页面结构与需求一致
3. 不要求功能真实可用

### 8.2 第二轮

目标：打通本地数据与绘本管理。

任务：

1. 接入本地数据库
2. 实现 `Book` / `Page` 基础 CRUD
3. 实现新建绘本流程
4. 实现列表页与详情页真实数据渲染

交付结果：

1. 可创建绘本
2. 可展示绘本
3. 可展示页面列表

### 8.3 第三轮

目标：打通图片导入和文件持久化。

任务：

1. 接入图片选择能力
2. 导入后复制图片到私有目录
3. 创建页面记录
4. 实现页面排序

交付结果：

1. 可导入多页图片
2. 可持久化保存页面图片
3. 可调整页面顺序

### 8.4 第四轮

目标：打通文本生成。

任务：

1. 建立 Vision 配置管理
2. 实现单页文本生成
3. 实现整本逐页文本生成
4. 写回页面文本和状态

交付结果：

1. 每页可生成三段文本
2. 失败页不影响其他页
3. 文本可重新生成

### 8.5 第五轮

目标：打通语音生成和播放。

任务：

1. 建立 TTS 配置管理
2. 实现单页生成语音
3. 保存本地音频
4. 实现单页播放
5. 实现连续播放

交付结果：

1. 页面可试听音频
2. 整本可连续播放
3. 最近播放页可记录

### 8.6 第六轮

目标：补稳定性和细节规则。

任务：

1. 覆盖确认逻辑
2. 空文本禁止生成音频
3. 删除绘本时清理文件
4. 错误提示与失败重试
5. 缓存清理入口

交付结果：

1. 行为符合需求约束
2. 数据与文件不会明显失配

## 9. 首版建议新增依赖类别

这里只列能力类别，不在文档里锁死具体实现包版本，避免后续随 Expo SDK 变动反复改文档。

需要补充的能力：

1. 本地数据库
2. 本地文件存储
3. 图片选择
4. 音频播放
5. 安全存储
6. 拖拽排序

选型原则：

1. 优先选与 Expo 生态兼容的方案
2. 优先选官方或维护稳定的能力
3. 首版避免为单一需求引入重量级状态库

## 10. 首版开发清单

建议按以下顺序开工：

1. 路由骨架
2. 类型定义
3. 数据库 schema
4. 本地数据读写封装
5. 绘本列表页
6. 新建绘本页
7. 图片导入
8. 绘本详情页
9. 页面详情页
10. 模型配置页
11. 文本生成
12. 语音生成
13. 播放器
14. 错误处理与清理逻辑

## 11. 验收标准

### 11.1 MVP 验收

满足以下条件即可认为 MVP 跑通：

1. 可以创建绘本并导入多张图片
2. 可以查看和调整页面顺序
3. 可以单页生成文本
4. 可以编辑三段文本
5. 可以单页生成语音
6. 可以播放单页音频
7. 可以整本连续播放已有音频页
8. 关闭 App 后再次打开，数据和音频仍可使用

### 11.2 稳定性验收

满足以下条件即可认为进入可持续迭代状态：

1. 页面生成失败不会影响其他页面
2. 重生成覆盖规则与文档一致
3. 删除绘本不会残留明显孤儿文件
4. API Key 不会出现在普通日志和数据库明文中

## 12. 下一步建议

如果继续推进代码实现，建议先做这三个动作：

1. 先把路由页面骨架补齐
2. 再把本地数据层和类型定义补齐
3. 然后从“新建绘本 + 导入图片”这个最短链路开始做第一批代码

不建议从模型调用或播放器先开工，因为那会让项目很快进入“能力有了、主流程没通”的状态。
