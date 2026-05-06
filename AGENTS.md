# Repository Guidelines

## Project Structure & Module Organization
本仓库是一个精简的 Expo Router 项目。业务代码位于 `app/`，当前入口为 `app/_layout.tsx` 和 `app/index.tsx`。静态资源放在 `assets/images/`。产品和方案说明集中在 `docs/`，现有草稿见 `docs/v1.md`。`app-example/` 是 Expo 初始化模板的备份目录，已被 `.gitignore` 忽略，通常不作为正式开发区域。

## Build, Test, and Development Commands
优先使用 `pnpm`，因为仓库包含 `pnpm-lock.yaml` 和 `pnpm-workspace.yaml`。

- `pnpm install`：安装依赖。
- `pnpm start`：启动 Expo 开发服务。
- `pnpm android`：在 Android 模拟器或设备中启动。
- `pnpm ios`：在 iOS 模拟器中启动。
- `pnpm web`：启动 Web 版本。
- `pnpm lint`：运行 Expo 自带 ESLint 检查。

## Coding Style & Naming Conventions
项目使用 TypeScript，`tsconfig.json` 已开启 `strict`，并配置了 `@/*` 路径别名。沿用现有风格：2 空格缩进、字符串使用双引号、函数组件默认导出仅用于路由页面。路由文件遵循 Expo Router 约定，例如 `app/book/[id].tsx`。普通组件建议使用 PascalCase 文件名，工具函数使用 camelCase。

## Testing Guidelines
当前仓库尚未接入自动化测试框架，也没有 `__tests__/` 目录。提交前至少运行 `pnpm lint`，并手动验证受影响的平台。新增复杂状态、数据转换或可复用组件时，建议同时引入测试，并使用与文件对应的命名方式，例如 `FooCard.test.tsx`。

## Commit & Pull Request Guidelines
现有提交历史非常短，格式以简短祈使句为主，例如 `init`。后续建议保持单一目的、短标题，可按 `feat: add reader home`、`fix: correct route params` 这种形式书写。PR 需说明改动目的、影响范围和验证方式；涉及界面变更时，附上截图或录屏，并注明测试平台。

## Security & Configuration Tips
不要提交任何密钥、证书或本地环境文件。`.env*.local`、`ios/`、`android/`、`app-example/` 已在忽略列表中。修改时遵循最小化改动原则，优先在现有结构后追加功能，不要覆盖未确认的最新代码。
