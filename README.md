# Subscription Manager

本地优先的订阅管理 Android 应用。  
无需账号、无需云端，数据默认保存在你的设备上。

[English README](./README.en.md)

## 这是什么

**Subscription Manager**（内部代号 SubScout）帮助你：

- 记录月付 / 年付订阅
- 查看本月支出与分类占比
- 在扣费前提醒自己
- 离线完整使用核心功能

设计目标是**隐私友好、低运维、可快速安装使用**。

## 界面预览

<p align="center">
  <img src="docs/screenshots/01-overview.png" alt="概览页" width="220" />
  <img src="docs/screenshots/02-subscriptions.png" alt="订阅列表" width="220" />
  <img src="docs/screenshots/03-settings.png" alt="设置页" width="220" />
</p>

| 概览 | 订阅 | 设置 |
| --- | --- | --- |
| 活跃订阅、本月计划扣费、多币种折合 | 订阅卡片、下次扣费倒计时 | 主题、汇率、分类、通知、备份 |


## 主要功能

- **订阅管理**：新增、编辑、取消、恢复订阅
- **账单周期**：支持月付与年付
- **首页概览**：活跃订阅数、本月支出、分类环形图
- **多币种**：手动维护汇率，首页可折算为 CNY 汇总
- **本地提醒**：基于设备本地通知，按提前提醒天数调度
- **外观主题**：Scout / Ocean / Coral / Graphite，支持浅色 / 深色 / 跟随系统
- **语言**：中文 / English
- **备份恢复**：本地导出 / 导入（MVP 能力）

## 技术栈

| 层级 | 技术 |
| --- | --- |
| UI | Vue 3 + TypeScript + Tailwind CSS |
| 路由 / 状态 | Vue Router + Pinia |
| 移动容器 | Capacitor 8 |
| 本地数据库 | SQLite（`@capacitor-community/sqlite`） |
| 本地通知 | `@capacitor/local-notifications` |
| 测试 | Vitest + Vue Test Utils |

## 项目结构

```text
Subscription_manager/
├── README.md                 # 中文说明（默认）
├── README.en.md              # English README
├── docs/screenshots/         # 应用截图
├── .scratch/                 # 规格与 issue 草稿
└── mobile/                   # 应用源码
    ├── android/              # Capacitor Android 工程
    ├── src/
    │   ├── application/      # 应用服务层
    │   ├── domain/           # 领域逻辑
    │   ├── database/         # SQLite 访问
    │   ├── notifications/    # 本地通知适配
    │   ├── views/            # 页面
    │   └── components/       # UI 组件
    ├── package.json
    └── capacitor.config.ts
```

## 快速开始

### 环境要求

- Node.js `^22.18.0` 或 `>=24.12.0`
- npm
- Android Studio / Android SDK（构建与安装 Android 包）
- 可选：Android 模拟器或真机

### 安装依赖

```bash
cd mobile
npm install
```

### 浏览器开发

```bash
cd mobile
npm run dev
```

### 类型检查 / 测试 / 构建

```bash
cd mobile
npm run type-check
npm run test:unit
npm run build
```

### 同步并构建 Android

```bash
cd mobile
npm run build-only
npx cap sync android
cd android
# Windows 示例
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
gradlew.bat assembleDebug
```

Debug APK 输出路径：

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### 安装到设备 / 模拟器

```bash
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.subscout.app -c android.intent.category.LAUNCHER 1
```

应用 ID：`com.subscout.app`  
显示名称：`Subscription Manager`

## 产品原则

1. **本地优先**：核心数据与提醒默认只存在本机
2. **离线可用**：记录订阅、查看统计、调度提醒不依赖网络
3. **隐私友好**：不强制注册登录，不默认上传订阅习惯
4. **边界清晰**：页面、领域计算、数据库、通知适配分层，后续可扩展同步，不必重写 UI

## 当前状态

当前仓库是可运行的 Android MVP：

- 已支持订阅生命周期、首页统计、本地提醒、主题与语言
- 已可在模拟器 / 真机安装调试包
- iOS 打包需要 macOS / Xcode，当前主验证路径是 Android

## 开发说明

- 规格与拆分 issue 见：`.scratch/mobile-subscription-manager/`
- 领域逻辑尽量放在 `mobile/src/domain`
- 持久化放在 `mobile/src/database` 与 `mobile/src/application`
- 通知通过适配层接入，测试中使用内存实现

## 许可证

尚未声明开源许可证。如需开源发布，请先补充 `LICENSE`。
