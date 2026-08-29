# 地图多入口与树状分叉重构方案（增强重构）

> 目标：把当前"单一 1D 路径"的地图模型，升级为"**多入口 + 向核心（根）汇合的树状分叉**"地图模型；敌人从叶子（入口）生成，沿唯一路径走向根（核心）。
>
> 前置说明：本方案基于**当前代码状态**（含今日新增的 `enemy-armor.ts` 伤害上限、`movementPhase` 波次速度脉动、以及 `PathSampler` 的 `sampleInto/nearestDistance/centerlineIntersectionTime`）。这些系统与路径几何**正交**，本重构不触碰它们，仅要求迁移到"逐敌人 route"后语义不变。

---

## 1. 背景与目标

### 现状
- 每张地图只有一条 `path: readonly Point[]`（`config.ts` `LevelDefinition.path`）。
- `GameEngine` 持有唯一 `this.path: PathSampler`（`engine.ts`），敌人在 `progress·distance` 这条全局 1D 折线上移动。
- 生成时 `spawnEnemy` 一律从 `path.pointAtDistance(0)` 入场（单个入口）。
- 目标排序用 `progress`（`targeting.ts`），预判用 `interception.ts` 沿单一路径线性外推。

### 目标
1. 支持**多个入口（叶子）**。
2. 支持**向核心（根）汇合的分叉**（树结构）。
3. 敌人生成后路线**完全确定**（树的性质：叶→根唯一简单路径），**无运行期选路**。
4. 入口分配规则明确（见 §4）：**普通类信号均分**，**boss 类信号固定指定**。

---

## 2. 设计决策（已定，本方案遵循）

| 决策 | 内容 |
|---|---|
| 地图形状 | 一棵**有根树**：叶子 = 入口，根 = 核心 |
| 行进方向 | 敌人**只上行**：每个节点唯一父节点 → 核心，**不分支决策** |
| 路线确定性 | 入口（叶子）一旦确定，路线唯一，**无运行期选路**（树性质） |
| 入口分配 | 普通类信号**均分**各入口；boss 类信号**固定指定**入口 |
| 排序语义 | 用**到核心的图距 `distanceToCore`** 替代全局 `progress` |

---

## 3. 核心数据模型

### 3.1 `RouteMap`（替代单一 `path`）

```ts
// src/game/path.ts
export interface GraphNode {
  id: NodeId;            // 字符串 id
  position: Point;
  parent: NodeId | null; // 通往核心的下一跳；根为 null
  children: NodeId[];    // 通往叶子的分支
}

export interface GraphEdge {
  from: NodeId; to: NodeId;  // to = parent（朝核心）
  length: number;
}

export interface RouteMap {
  nodes: ReadonlyMap<NodeId, GraphNode>;
  edges: readonly GraphEdge[];
  entrances: readonly NodeId[];  // 叶子集合 = 多入口
  root: NodeId;                  // 核心
  lengthToNode(id: NodeId): number;         // 该节点到根的经路径弧长
}
```

> 每个入口（叶子）都有一条**叶子→根的边链**。由于是树，这条链唯一。我们把这条链解析成一条 **1D 折线 route**（其结构与现在的 `path` 完全同构），作为该敌人出生时携带的"个人路径"。

### 3.2 路线解析（叶子→根，唯一）

```ts
resolveRoute(map: RouteMap, entrance: NodeId): PathSampler {
  const chain: NodeId[] = [];
  let cur = entrance;
  while (cur != null) { chain.push(cur); cur = map.nodes.get(cur).parent; }
  // chain 形如 [entrance, ..., root]；相邻节点连线即折线
  const pts = chain.map((id) => map.nodes.get(id).position);
  return createPathSampler(pts);   // 复用现有采样器！
}
```

> **关键红利**：`resolveRoute` 返回的 `PathSampler` 就是现在的 `createPathSampler` 产物（含 `sampleInto/nearestDistance/centerlineIntersectionTime`）。因此移动、命中、预判、触发判定**逐 route 全部复用现有实现**，只需把"全局唯一 path"换成"该敌人的 route"。

### 3.3 `Enemy` 改动（`types.ts`）

```ts
export interface Enemy {
  // ...现有字段全部保留（含 movementPhase / slowFactor / statuses / shield / armor 等）...
  routeId: NodeId;      // 出生入口 / 路线索引，出生时定死
  distance: number;     // 沿 route 从入口起的弧长（沿用现有语义）
  // progress 只保留给 UI 或按 route 比例使用；排序一律走 distanceToCore
}
```

- `routeId` 在 `spawnEnemy` 时由入口分配决定并写入（一次性）。
- `route` 采样器由引擎缓存（`Map<NodeId, PathSampler>`）或按需从 `RouteMap` 解析，避免每帧重复分配。

### 3.4 排序键：`distanceToCore`

```ts
function distanceToCore(enemy, map): number {
  return routeSampler(enemy.routeId).length - enemy.distance;
}
```

- 该标量在**任意两个敌人之间**均有意义：哪怕它们在不同分支上还没汇合，也能正确比较"物理上还剩多少到核心"；一旦在某节点汇合，之后走同一尾段，排序自然一致。
- 替换点：`targeting.ts` 的 `core-nearest/farthest` 比较、`density` 平局键、`engine.findTriggerTarget` 的 `progress` 最大选择。

---

## 4. 入口分配规则（本次设计重点）

> 规则来源：**普通类信号均分，boss 类信号固定指定。**

### 4.1 wave 数据结构新编码（`config.ts`）

把 `LevelDefinition.waves` 从 `readonly (readonly EnemyType[])[]` 升级为**分条目标注**：

```ts
export interface SpawnEntry {
  type: EnemyType;
  entrance?: NodeId;      // 显式指定入口
  boss?: boolean;         // 标记为 boss（用于校验强制指定入口）
}

export interface LevelDefinition {
  // ...
  graph: RouteMap;                    // 取代 path
  waves: readonly (readonly SpawnEntry[])[];
}
```

- `ENEMIES[type]` 增加 `boss?: boolean`，用于把 `crown / fracture / radiant` 等标记为 boss 类；`anvil` 这类重甲不标记为 boss（它是普通威胁）。
- `graph.entrances` 为叶子集合。

### 4.2 分配算法（`engine` 生成期，确定性）

```ts
function assignEntrance(entry: SpawnEntry, spawnIndex: number, entrances: NodeId[]): NodeId {
  if (entry.entrance) return entry.entrance;         // boss：固定指定
  if (entry.boss) {
    // 校验：boss 必须显式指定入口，否则编译/启动时诊断
    throw new Error(`Boss ${entry.type} must declare a fixed entrance`);
  }
  // 普通类：均分——按 spawn 序号 round-robin 遍历入口
  return entrances[spawnIndex % entrances.length];
}
```

- **普通信号均分**：同一波次内所有未标注 `entrance` 的条目，按生成顺序在入口列表上 **round-robin**，使各入口获得接近等量的普通敌人（`spawnIndex` 是波次内计数器）。
- **boss 信号固定指定**：boss 条目标注 `entrance`，引擎固定从该入口生成；同一波次该入口可能收到 boss 与其随行小兵（小兵仍按均分规则走其它入口）。
- **确定性**：`spawnIndex` 为纯计数，无随机源，便于回放 / 单测 / 平衡复现。

### 4.3 `spawnQueue` 与 `spawnEnemy` 改动（`engine.ts`）

- `spawnQueue: SpawnEntry[]`（由 `startWave` 从 `getWaveBlueprint` 填充）。
- `spawnEnemies` 出队后，用 `spawnIndex` 调 `assignEntrance` 得到 `entrance`，再 `spawnEnemy(entry.type, entrance)`。
- `spawnEnemy` 内：`const route = this.routeFor(entrance); enemy.routeId = entrance; enemy.distance = 0;` 首帧位置取 `route.pointAtDistance(0)`。

---

## 5. 各子系统改动清单

按改动面由大到小：

| 区域 | 改动 | 说明 |
|---|---|---|
| `path.ts` | 新增 `RouteMap`、`NodeId`、`resolveRoute`；保留现有 `createPathSampler` | route 复用现有采样器 |
| `types.ts` | `Enemy` 加 `routeId`；`EnemyType`/`EnemyConfig` 加 `boss?` | 只加字段 |
| `engine.ts` 生成 | `spawnQueue` 元素类型、`assignEntrance`、`spawnEnemy(type,entrance)`、`routeFor()` 缓存 | 一次性解析 |
| `engine.ts` 移动 | `updateEnemies` 用 `enemyRoute.sampleInto(...)` 代替 `this.path.*`；`progress`→现按 route 比例 | `distance += speed*delta` 不变 |
| `engine.ts` 触发 | `findTriggerTarget` 用 `distanceToCore` 最大者 | 取代 `progress` |
| `targeting.ts` | `core-nearest/farthest` 与 density 平局改用 `distanceToCore` | 排序键 |
| `interception.ts` | 传入的 `path` 改为**该敌人的 route** | 正确性由树性质保证 |
| `config.ts` | `LevelDefinition.graph` 取代 `path`；`waves` 改为 `SpawnEntry[]`；`ENEMIES` 加 `boss` | 作者格式 + 4 图迁移 |
| `renderer.ts` | `tracePath/drawPath` 画**多条**边；箭头逐边定向；画入口/核心/岔口节点 | 树可视化 |
| `engine.ts` 裂变 | `spawnSplitChildren` 沿当前 route 的边方向 offset，避免跨岔口 | split 逻辑 |
| 模块层 | 极少数读 `enemy.progress`；几乎全靠几何 `position` | 影响很小 |
| 测试 / 平衡 / 性能 / e2e | 依赖 `distance/progress/path` 的用例 + 迁移 `balance-report`、`perf-report` | 回归面 |

**正交、无需改动**：`enemy-armor.ts`（伤害上限）、`enemy-movement.ts`（波次速度脉动）、`enemy-shield.ts`、`statuses（applyStatus/updateEnemyStatuses）`、`EnemySpatialIndex`、难度/经济倍率。它们只依赖 `enemy.speed/hp/shield/status/position`，与路径无关。

---

## 6. 兼容与迁移

- **现有 4 张图**：把单一路径视作"**一条边链**"的退化树——`graph = { nodes: 路径各顶点, edges: 相邻边, entrances: [首顶点], root: 末顶点 }`。`waves` 由 `EnemyType[]` 机械转成 `SpawnEntry[]`（不标 `entrance`，默认均分到唯一的入口）。**行为应与现状完全一致**。
- `TUTORIAL_LEVEL_ID` / `DEFAULT_LEVEL_ID` 只引用 id，不变。
- 提供一段 `legacyPathToGraph(path): RouteMap` 迁移函数，供作者复用与测试。

---

## 7. 实施里程碑（建议顺序）

1. **M0：`RouteMap` + `resolveRoute` 纯函数 + 退化树迁移与单测**（不接引擎）。
2. **M1：引擎生成/移动接入 route**——单入口退化树下，行为与现状一致为验收标准。
3. **M2：排序键切换** `progress`→`distanceToCore`，单入口下结果相同。
4. **M3：多入口 + 普通均分（round-robin）+ `renderer` 画树**；新增一张"三入口汇一"示例图。
5. **M4：boss 固定指定入口 + 相关 UI 展示入口流线**；`balance-report` 增加按入口流量统计。
6. **M5：性能/端到端回归 + 全量文案（i18n 中英）**。

> M1–M2 在退化树（单入口）下应做到"与现状逐帧一致"，作为安全网。

---

## 8. 测试计划

- **单元**：`RouteMap` 构建校验（环检测、唯一入根可达、叶子识别）；`resolveRoute` 长度/位置正确；`assignEntrance` 均分与 boss 固定、boss 缺入口报错；`distanceToCore` 跨分支正确。
- **模拟**：固定 seed 下，多入口均分与 boss 固定入口的生成序列可复现。
- **回归**：单入口退化树逐帧快照与现状一致（`tests/` 中新增 `tree-snapshot.test.ts`）。
- **平衡**：各入口敌人流量、汇合处火力密度、`coreDamage` 承受曲线（`balance-report.ts` 增强）。
- **端到端**：新示例图在 `e2e/smoke.spec.ts` 中游玩一段。

---

## 9. 风险与平衡

- **汇合处火力密度**：多支线汇入根前可能形成"漏斗"，需平衡各入口距离与塔位，避免玩家在单一咽喉点一劳永逸。
- **入口距离不均**：`distanceToCore` 排序天然公平，但**塔射程覆盖**会偏好某入口；作者需设计近的入口用"脆高伤"、远的用"肉低伤"来对冲。
- **树的可读性**：渲染若能画清分叉方向与入口流线，玩家才能做预判；否则体验下降。
- **`interception` 的近似**：树已消除运行期选路，但若未来允许"某入口的敌人随机走不同子树"，预判会失效——**本方案明确禁止**，保持"入口即路线"。

---

## 10. 待定问题

1. 是否允许同一波次内**普通敌人也携带 `entrance`**（部分显式、部分均分）？当前方案允许（未标即均分），是否收紧？
2. "均分"的具体粒度：**按条目标注**（每个 `SpawnEntry` 轮流）还是**按序号**（`spawnIndex` 连过所有入口）？本方案用后者，简单确定。
3. `distanceToCore` 是否还要接**减速/脉动**对"实际到达时间"的修正（当前是纯图距）？接 `enemyMovementSpeedMultiplier` 会更准，但会引入运动模型耦合。建议先纯图距，后续按需加强。
