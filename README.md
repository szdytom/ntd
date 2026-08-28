# Prism Bastion / 棱镜堡垒

[![CI and GitHub Pages](https://github.com/szdytom/ntd/actions/workflows/ci.yml/badge.svg)](https://github.com/szdytom/ntd/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/play-GitHub%20Pages-6c5ce7)](https://szdytom.github.io/ntd/)

一款以模块编程为核心的几何风格塔防游戏。把弹体、修正器、逻辑、尾迹和触发器装入炮塔槽位，系统会从左到右编译出攻击程序；同一批模块因为顺序不同，可以形成完全不同的施法结果。

**[在线试玩](https://szdytom.github.io/ntd/)**

## 游戏特色

- **模块化构筑**：22 个内置模块，覆盖穿透、分叉、制导、弹跃、范围伤害、持续伤害与嵌套触发。
- **顺序即规则**：修正与逻辑模块影响右侧的下一枚弹体，未闭合的法术块可以回绕读取一次。
- **两种模式**：正式模式包含库存、开局抽卡、波后奖励和经济成长；创造模式开放无限模块、无限晶片与自定义敌人信号台。
- **四张独立地图**：每关拥有自己的路径、部署节点、敌人倍率与波次配置，并提供五档数值难度。
- **可靠弹道**：固定步长模拟、连续碰撞检测、路径提前量、穿透和制导重新锁定共同处理高速战斗。
- **轻量图形栈**：React 负责界面，Canvas 2D 负责战场，WebGL 提供可选泛光与护盾折射；不支持 WebGL 时自动回退。

## 快速开始

需要 Node.js 22 或更新版本。

```bash
git clone https://github.com/szdytom/ntd.git
cd ntd
npm ci
npm run dev
```

浏览器打开 <http://localhost:4173>。

生产构建：

```bash
npm run build
```

构建结果位于 `dist/`，可以由任意静态文件服务托管。

## 基础玩法

1. 选择关卡、模式和难度。
2. 正式模式开局先完成三轮四选一，为第一波补充模块。
3. 点击地图上的虚线节点部署炮塔，点击炮塔打开模块工作台。
4. 从左到右排列模块；只有形成有效弹体程序的炮塔才会攻击。
5. 调整目标策略、升级炮塔并启动下一波。

推荐组合：

- `寻路 → 穿刺`：制导穿透弹会绕回存活目标，目标死亡后重新锁定附近敌人。
- `弹跃 → 巨化 → 刃片`：大型刃片在敌群间改道并连续切割。
- `命中触发 → 脉冲 → 接近触发 → 感应雷 → 新星`：脉冲命中后部署地雷，敌人靠近时释放新星载荷。

静态载荷不能直接从炮塔射出，必须放在碰撞、计时或接近触发器的载荷位置。工作台会对不完整或非法的模块序列显示诊断。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 esbuild 监听与本地开发服务器 |
| `npm run build` | 生成压缩后的生产静态资源 |
| `npm run lint` | 执行 ESLint |
| `npm run typecheck` | 执行 TypeScript 严格类型检查 |
| `npm test` | 运行 Vitest 单元与组件测试 |
| `npm run test:e2e` | 使用 Playwright/Chromium 运行浏览器冒烟测试 |
| `npm run check` | 依次执行 lint、类型检查、测试和生产构建 |
| `npm run balance:report` | 从当前配置生成数值平衡报告 |
| `npm run perf:report` | 运行空间索引性能报告 |

## 技术架构

```text
src/
├── game/       战斗引擎、路径、碰撞、目标策略、关卡与数值模型
├── modules/    模块定义、注册表、稀有度与顺序编译器
├── effects/    特效生命周期、Canvas 绘制器与效果工厂
├── ui/         React 组件；每个组件拥有同名独立样式表
└── styles/     全局基础与响应式样式
```

战斗引擎以 120 Hz 固定步长运行，并通过只读快照向 React 发布状态。模块只能通过受限战斗 API 查询目标、造成伤害、施加状态或改变弹体目标，因此模块实现不会直接耦合波次、经济或 UI。

进一步阅读：

- [架构与扩展模块](docs/architecture.md)
- [内置模块目录](docs/modules.md)
- [数值平衡基线](docs/balance.md)

## CI 与 GitHub Pages

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) 负责验证和发布：

- 每次 push 和 pull request 都运行 ESLint、TypeScript、Vitest、生产构建、平衡报告和 Playwright 冒烟测试。
- `main` 分支验证通过后，重新构建 `dist/`，上传 GitHub Pages artifact，并部署到 `github-pages` 环境。
- 工作流也支持从 Actions 页面手动触发；只有在 `main` 上触发时才会部署。

首次启用时，在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。之后推送到 `main` 即会发布到：

```text
https://szdytom.github.io/ntd/
```

页面入口和构建资源使用相对路径，因此无需为仓库子路径额外设置 base URL。
