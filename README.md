# AI读绘本

AI 驱动的多语言儿童绘本生成与朗读应用。

## 功能概览

- **绘本管理** — 创建、编辑、删除绘本，支持中文/英文
- **AI 内容生成** — 接入多模态 Vision 模型，自动生成页面原文、画面描述和朗读文本
- **AI 语音合成** — 接入 TTS 模型，为每页生成朗读语音
- **全局音频播放器** — 全局单例播放器，支持跨页面连续播放、播放列表、倍速切换
- **模型配置** — 可视化配置 Vision / TTS 模型（支持 OpenAI 兼容接口、Xiaomi MiMo）
- **本地持久化** — SQLite 存储绘本/页面/配置，文件系统存储图片和音频

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React Native 0.81 + Expo SDK 54 |
| 路由 | expo-router（文件路由） |
| 数据库 | expo-sqlite |
| 音频播放 | expo-av（全局 Context 单例） |
| 文件存储 | expo-file-system |
| 动画/手势 | react-native-reanimated、react-native-gesture-handler |
| 类型检查 | TypeScript |

## 项目结构

```
app/                        # 页面（expo-router 文件路由）
  _layout.tsx               # 根布局（PlayerProvider + Stack）
  index.tsx                 # 首页（绘本列表）
  books/
    new.tsx                 # 新建绘本
    [bookId]/
      index.tsx             # 绘本详情（页面列表、连续播放）
      edit.tsx              # 编辑绘本
      page/
        [pageId].tsx        # 页面详情（原文/画面描述/朗读文本、单页播放）
  settings/
    index.tsx               # 设置（模型配置、播放速度、缓存管理）

components/                 # 共享组件
  PlayerBar.tsx             # 全局播放栏
  AppHeader.tsx             # 导航栏按钮
  ActionButton.tsx          # 通用按钮
  Dialog.tsx                # 确认对话框
  OptionSheet.tsx           # 选项面板
  BookEditorScreen.tsx      # 绘本编辑表单
  PreviewImage.tsx          # 图片预览

lib/
  db/                       # 数据库层（books、pages、modelConfigs、settings）
  services/
    PlayerContext.tsx        # 全局播放器 Context（播放列表、轨道管理）
    audioPlayer.ts           # expo-av 播放 hook（已被 PlayerContext 替代）
    generation/              # AI 生成流水线（文本 + 语音）
    modelProviders/          # 模型 provider（OpenAI 兼容、Xiaomi MiMo）
    modelConfigs.ts          # 模型配置 CRUD
  storage/                   # 文件持久化（native 文件系统 + web IndexedDB）
  settings/                  # 配置常量（播放速度选项等）
  alert.ts                   # 跨平台 alert/confirm
types/                       # TypeScript 类型定义
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npx expo start

# 构建 Android APK
npm run build
```

## 数据管理

- SQLite 数据库保存在 `FileSystem.documentDirectory + 'SQLite/huiben.db'`
- 绘本图片和音频保存在 `FileSystem.documentDirectory + 'huiben/books/{bookId}/'`
- Web 端使用 IndexedDB 存储音频文件
- 设置页支持清除音频缓存

## 模型配置

在「设置」页配置模型：

- **Vision 模型** — 用于生成页面文本（原文描述、画面描述、朗读文本）
- **TTS 模型** — 用于生成页面朗读语音
- 支持中文/英文分别指定不同模型
- 支持 OpenAI 兼容接口和 Xiaomi MiMo 两种 provider
- 可配置模型名称、base URL、API Key、voice、speed 等参数
