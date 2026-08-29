# 棱镜堡垒

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI and GitHub Pages](https://github.com/szdytom/ntd/actions/workflows/ci.yml/badge.svg)](https://github.com/szdytom/ntd/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/play-GitHub%20Pages-6c5ce7)](https://szdytom.github.io/ntd/)

棱镜堡垒是一款以模块编程为核心的几何风格塔防游戏。把弹射物、修正、逻辑、尾迹和触发器装入炮塔槽位，编译器会从左到右将排列顺序转换为攻击程序；同一批模块经过重排即可形成截然不同的施法结果。

**[在线试玩](https://szdytom.github.io/ntd/)**

## 游戏特色

- **模块化构筑：** 22 个内置模块覆盖穿透、分叉、制导、弹跃、范围伤害、持续伤害与嵌套触发。
- **顺序即规则：** 修正与逻辑模块影响右侧的下一枚弹射物，未闭合的施法块可以回到开头再读取一次。
- **两种模式：** 正式模式包含库存限制、开局选牌、波后奖励和经济成长；创造模式开放无限模块、无限晶片与自定义信号台。
- **四张地图与五档难度：** 每个区域拥有独立路径、部署节点、敌人倍率与波次配置。
- **差异化首领：** 可再生护盾、死亡分裂与局部冷却压制会被逐步引入并最终组合。
- **可靠弹道：** 固定步长模拟、连续碰撞检测、路径提前量、穿透与制导重新锁定共同处理高速战斗。
- **轻量图形栈：** React 负责界面，Canvas 2D 绘制战场，WebGL 提供可选泛光与护盾折射并支持自动回退。
- **中英文 UI：** 基于 `i18next` 和 `react-i18next`，游戏内可随时切换语言并保留选择。

## 快速开始

需要 Node.js 22 或更新版本。

```bash
git clone https://github.com/szdytom/ntd.git
cd ntd
npm ci
npm run dev
```

浏览器打开 <http://localhost:4173>。生产构建：

```bash
npm run build
```

静态文件输出到 `dist/`，可由任意静态文件服务托管。

## 基础玩法

1. 选择区域、模式和难度。
2. 正式模式在第一波前完成三轮四选一。
3. 点击虚线节点部署炮塔，再点击炮塔打开模块工作台。
4. 从左到右排列模块；只有编译成有效弹射物程序的炮塔才会攻击。
5. 调整目标策略、升级炮塔并启动下一波信号。

组合示例：

- `制导 → 穿刺`：制导穿透弹可以重新锁定附近仍存活的目标。
- `弹跃 → 巨化 → 刃片`：大型刃片会在敌群间改道切割。
- `命中触发 → 脉冲 → 接近触发 → 感应雷 → 新星`：脉冲命中后部署地雷，敌人靠近时释放新星载荷。

静态载荷不能直接发射，必须放在碰撞、计时或接近触发器之后的载荷位置。工作台会报告不完整和非法的模块序列。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 esbuild 监听与本地开发服务器 |
| `npm run build` | 生成压缩后的静态资源 |
| `npm run lint` | 执行 ESLint |
| `npm run typecheck` | 执行 TypeScript 严格类型检查 |
| `npm test` | 运行 Vitest 单元与组件测试 |
| `npm run test:e2e` | 运行 Playwright 浏览器冒烟测试 |
| `npm run check` | 依次运行代码检查、类型检查、测试和生产构建 |
| `npm run balance:report` | 根据当前配置生成平衡报告 |
| `npm run perf:report` | 运行空间索引性能报告 |

## 技术架构

```text
src/
├── game/       战斗引擎、路径、碰撞、目标策略、关卡与数值模型
├── modules/    模块定义、注册表、稀有度与顺序编译器
├── effects/    特效生命周期、Canvas 绘制器与效果工厂
├── i18n/       共享 i18next 实例、展示辅助函数与语言资源
├── ui/         React 组件；每个组件拥有同名独立样式表
└── styles/     全局基础与响应式样式
```

战斗引擎以 120 Hz 固定步长运行，并通过不可变快照向 React 发布状态。模块只能通过受限战斗 API 查询目标、造成伤害、施加状态或改变弹体目标，因此模块实现不会直接耦合波次、经济或 UI。

中文技术文档：

- [架构与扩展模块](docs/architecture.md)
- [内置模块目录](docs/modules.md)
- [数值平衡基线](docs/balance.md)

## 国际化约定

React 组件、教程、引擎提示和 Canvas 标签均通过同一个 i18next 实例解析。英文是回退语言；首次进入时会使用已保存的选择或浏览器语言。

语言资源位于 `src/i18n/locales/`，使用平坦的 JSON 对象。每个键直接对应一个字符串，例如 `"levels.starter-elbow.name": "启航折线"`，便于搜索，也方便没有编程经验的维护者编辑。每个文件只通过 `"lang.name"` 描述自己的语言；中文资源写 `中文`，其他语言则使用各自的本地名称。语言选择器会读取这些自描述信息，并自动为每个已注册资源生成选项。新增界面文本时应在所有语言文件中加入相同键，不应直接嵌入组件或游戏逻辑。`npm run check:locales` 会检查文件是否保持平坦、键集合一致且包含自描述名称。除文档与语言文件外，源码和测试文件不得包含 CJK 字符。

## CI 与 GitHub Pages

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) 会在 push 与 pull request 时执行 ESLint、TypeScript、Vitest、生产构建、平衡报告和 Playwright 冒烟测试。`main` 分支验证成功后发布到：

```text
https://szdytom.github.io/ntd/
```

入口与资源均使用相对路径，无需为仓库子路径额外设置 base URL。
