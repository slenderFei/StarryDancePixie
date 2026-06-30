# 超级马里奥风格体感游戏技术设计文档

## 1. 目标

新增一个横版平台跳跃体感游戏模式，内部模式名为 `platformer`，界面名称为「星光大冒险」。

这个模式借鉴经典横版平台游戏的结构：向右推进、跳跃平台、收集金币、躲避敌人、顶开单词方块、抵达终点。但美术、角色、音效、关卡和素材必须使用本项目原创设计，不使用任天堂或其他第三方 IP 资源。

核心目标：

- 让孩子通过身体左右倾斜、跳跃、下蹲、挥手完成平台冒险。
- 把英语单词学习嵌入关卡推进，而不是单独弹题。
- 复用现有登录、摄像头、MediaPipe、游戏记录和后台管理能力。
- 先做一个稳定可玩的 MVP，再扩展关卡、敌人、BOSS 和排行榜。

## 2. 当前项目接入点

现有项目已有四类游戏模式：

- `classic`：体感学单词
- `balloon`：气球跳跳碰
- `fruit`：单词拼写，保留历史内部名
- `rope`：虚拟跳绳

新增模式使用：

```js
playMode: 'platformer'
```

需要接入的文件：

- `src/store/gameStore.js`
- `src/App.jsx`
- `src/components/LoadingScreen.jsx`
- `src/components/PoseDetector.jsx`
- `src/components/GameUI.jsx`
- `src/components/AdminDashboard.jsx`
- `src/utils/gameRecords.js`

新增核心目录：

```text
src/components/platformer/
  PlatformerOverlay.jsx
  PlatformerOverlay.css
  PlatformerCanvas.jsx
  PlatformerHud.jsx
  PlatformerScene.jsx
  PlatformerCharacter.jsx
  PlatformerLevel.jsx
  PlatformerParticles.jsx

src/utils/platformer/
  platformerPhysics.js
  platformerGestures.js
  platformerCollision.js
  platformerLevelRuntime.js

src/data/platformer/
  levels.json
```

## 3. 产品体验

### 3.1 游戏循环

1. 用户在模式页选择「星光大冒险」。
2. 系统进入全屏摄像头和横版 2.5D 游戏画面。
3. 开始前进行 2 秒体感校准，读取站立高度、肩宽、髋部高度和脚踝基线。
4. 倒计时 3 秒后开始。
5. 玩家通过体感控制角色向右冒险。
6. 角色收集金币、打开单词方块、躲避或踩掉敌人。
7. 每个单词方块触发一次短单词挑战。
8. 到达终点旗帜后结算。
9. 结算页展示分数、金币、学到的单词、受伤次数、通关时间。

### 3.2 单局时长

MVP 单关时长控制在 90 到 150 秒。第一版只提供 1 个关卡，后续扩展为 3 到 6 个关卡。

### 3.3 失败规则

MVP 不做高挫败的死亡重开。

- 掉坑：回到最近安全平台，扣 1 生命。
- 撞敌人：扣 1 生命，获得 1.2 秒无敌闪烁。
- 生命归零：进入结算，标记 `completed: false`。
- 到达终点：进入结算，标记 `completed: true`。

## 4. 体感控制设计

### 4.1 输入来源

复用现有 `getLatestPose()` 和 `getLatestHands()`。

关键 Pose 点：

- 左右肩：11, 12
- 左右肘：13, 14
- 左右手腕：15, 16
- 左右髋：23, 24
- 左右膝：25, 26
- 左右脚踝：27, 28

### 4.2 校准数据

进入游戏后采集 24 帧稳定数据：

```js
{
  standingHipY,
  standingFootY,
  shoulderWidth,
  bodyHeight,
  centerX,
}
```

校准阶段要求肩、髋、脚踝至少 4 个关键点可见。校准失败时 HUD 显示「请全身入镜」。

### 4.3 动作映射

| 游戏动作 | 体感动作 | 检测方式 | 键盘备用 |
| --- | --- | --- | --- |
| 向左移动 | 身体重心左移 | 髋部中心相对校准中心左移超过 `shoulderWidth * 0.18` | A / ← |
| 向右移动 | 身体重心右移 | 髋部中心相对校准中心右移超过 `shoulderWidth * 0.18` | D / → |
| 跳跃 | 双手上举或身体快速上移 | 手腕高于肩膀，或髋部上移速度超过阈值 | Space / W |
| 下蹲 | 下蹲 | 髋部低于站立髋部 `bodyHeight * 0.08` | S / ↓ |
| 冲刺 | 双臂快速摆动 | 左右手腕水平速度均超过阈值 | Shift |
| 攻击/交互 | 单手前挥 | 手腕速度突增且接近身体前方区域 | E |

### 4.4 去抖和冷却

跳跃必须有冷却：

```js
JUMP_COOLDOWN_MS = 420
GESTURE_SMOOTHING = 0.32
POSE_LOST_GRACE_MS = 500
```

如果人体短暂丢失，不立即结束游戏，而是暂停输入，HUD 显示「回到镜头继续」。超过 3 秒仍未识别，游戏自动暂停。

## 5. 玩法系统

### 5.1 角色

角色为原创「星光小勇者」，不使用马里奥造型。

状态机：

```text
idle -> walk -> run
idle/walk/run -> jump -> fall -> land
idle/walk/run -> crouch
any -> hurt -> invincible -> idle
any -> victory
```

角色属性：

```js
{
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  width: 0.72,
  height: 1.1,
  health: 3,
  grounded: false,
  invincibleUntil: 0,
  animation: 'idle',
  direction: 1
}
```

### 5.2 平台

MVP 平台类型：

- `ground`：地面
- `float`：固定浮空平台
- `moving`：移动平台
- `spring`：弹跳平台
- `thin`：可从下方穿过的平台

后续扩展：

- `breakable`：踩 1 秒后碎裂
- `vanish`：踩上闪烁并消失
- `conveyor`：传送带

### 5.3 收集物

- 金币：+10 分
- 大金币：+50 分，稀有
- 星星：5 秒无敌
- 生命心：恢复 1 生命
- 单词星：完成单词挑战后获得

### 5.4 敌人

MVP 敌人：

- `walker`：左右巡逻，可被踩掉。
- `flyer`：固定波浪路径飞行，可挥手击退。

碰撞规则：

- 角色从上方落下踩到敌人：敌人消失，角色小跳，+100 分。
- 角色侧面碰到敌人：扣血。
- 无敌期间碰敌人：敌人消失，+100 分。

### 5.5 单词方块

单词方块是学习核心。

触发方式：

- 角色从下方向上顶到方块。
- 或角色靠近后做「单手前挥」。

挑战流程：

1. 游戏暂停物理。
2. 弹出单词卡片：中文释义、英文单词、发音按钮。
3. 系统朗读单词。
4. 玩家做指定动作，例如 hands_up / crouch / wave / jump。
5. 成功后方块打开，生成单词星，记录到 `wordsLearned`。
6. 失败不扣血，只提示重试。

MVP 单关包含 5 个单词方块，从五年级词库抽取。

## 6. 关卡数据结构

文件：`src/data/platformer/levels.json`

```json
{
  "levels": [
    {
      "id": "sunny-valley-1",
      "title": "阳光山谷",
      "theme": "sunny",
      "length": 42,
      "timeLimitSeconds": 150,
      "wordCount": 5,
      "spawn": { "x": 1, "y": 2 },
      "finish": { "x": 40, "y": 2 },
      "platforms": [
        { "id": "ground-1", "type": "ground", "x": 0, "y": 0, "w": 12, "h": 1 },
        { "id": "p-1", "type": "float", "x": 9, "y": 3, "w": 4, "h": 0.5 },
        { "id": "p-2", "type": "moving", "x": 16, "y": 4, "w": 3, "h": 0.5, "path": [[16, 4], [21, 4]], "speed": 1.4 },
        { "id": "spring-1", "type": "spring", "x": 25, "y": 1, "w": 1.2, "h": 0.35 }
      ],
      "coins": [
        { "id": "c-1", "x": 4, "y": 2.2, "score": 10 },
        { "id": "c-2", "x": 10, "y": 4.2, "score": 10 }
      ],
      "wordBoxes": [
        { "id": "w-1", "x": 7, "y": 3.2, "action": "hands_up" },
        { "id": "w-2", "x": 18, "y": 5.2, "action": "jump" }
      ],
      "enemies": [
        { "id": "e-1", "type": "walker", "x": 12, "y": 1, "range": [11, 15], "speed": 0.8 },
        { "id": "e-2", "type": "flyer", "x": 28, "y": 4, "range": [26, 31], "speed": 1.1 }
      ]
    }
  ]
}
```

## 7. 物理引擎

MVP 建议使用自研轻量 AABB 物理，不引入 Matter.js。理由：

- 游戏只需要横版平台、矩形碰撞和简单敌人路径。
- 自研实现更小，移动端加载更轻。
- 现有项目已经较重，Three.js 和 MediaPipe 包体较大。

### 7.1 坐标

使用游戏世界坐标，1 单位约等于角色身高。

- X 向右为正。
- Y 向上为正。
- 重力使 `vy` 变小。

### 7.2 参数

```js
const PHYSICS = {
  gravity: -28,
  walkAccel: 36,
  runAccel: 52,
  maxWalkSpeed: 5.2,
  maxRunSpeed: 7.2,
  groundFriction: 0.82,
  airControl: 0.48,
  jumpVelocity: 10.6,
  springVelocity: 15.5,
  terminalVelocity: -22,
}
```

### 7.3 更新顺序

每帧：

1. 读取体感输入和键盘输入。
2. 合并为 `PlatformerInput`。
3. 处理水平加速度。
4. 处理跳跃。
5. 应用重力。
6. 先移动 X 并做 X 轴碰撞。
7. 再移动 Y 并做 Y 轴碰撞。
8. 处理金币、单词方块、敌人、终点。
9. 生成事件队列给 React UI 和音效系统。

### 7.4 数据类型

```ts
type PlatformerInput = {
  left: boolean
  right: boolean
  jumpPressed: boolean
  jumpHeld: boolean
  crouch: boolean
  sprint: boolean
  interactPressed: boolean
}

type PlatformerEvent =
  | { type: 'coin'; coinId: string; score: number }
  | { type: 'wordBox'; boxId: string }
  | { type: 'enemyDefeated'; enemyId: string; score: number }
  | { type: 'hurt'; sourceId: string }
  | { type: 'checkpoint'; x: number; y: number }
  | { type: 'finish' }
```

## 8. React 和 Three.js 架构

### 8.1 App 接入

`App.jsx` 新增 lazy import：

```js
const PlatformerOverlay = lazy(() => import('./components/platformer/PlatformerOverlay'))
```

隐藏经典 `GameCanvas` 的条件新增 `platformer`：

```js
const hideCanvasForArcade =
  isArcadePlaying &&
  (playMode === 'balloon' || playMode === 'fruit' || playMode === 'rope' || playMode === 'platformer')
```

渲染：

```jsx
{isArcadePlaying && playMode === 'platformer' && (
  <Suspense fallback={null}>
    <PlatformerOverlay />
  </Suspense>
)}
```

### 8.2 PoseDetector 接入

`isArcadeMode` 新增 `platformer`，让摄像头全屏并持续发布 pose。

状态提示：

```js
if (gs.playMode === 'platformer') {
  updatePoseStatus('🏃 星光大冒险：左右倾斜移动，举手或起跳跳跃')
}
```

### 8.3 Store 接入

`ARCADE_ROUND_SIZE_BY_MODE`：

```js
platformer: 5
```

`playMode` 注释加入 `platformer`。

`startGame({ mode: 'platformer' })`：

- 随机抽取 5 个词。
- `arcadeVersus` 固定为 false。
- `gameState` 设置为 `arcade_playing`。

`finishArcade` 复用现有记录逻辑，新增可选字段：

```js
{
  playMode: 'platformer',
  score,
  coins,
  completed,
  durationSeconds,
  deathCount,
  damageCount,
  wordsLearned,
  platformerStats
}
```

### 8.4 Overlay 组件职责

`PlatformerOverlay.jsx`：

- 初始化 runtime。
- 读取最新 pose/hands。
- 管理校准、倒计时、playing、wordChallenge、paused、finished。
- 调用 `finishArcade`。

`PlatformerCanvas.jsx`：

- 包含 `<Canvas>`。
- 设置 orthographic camera。
- 渲染场景、角色、平台、金币、敌人、粒子。

`PlatformerHud.jsx`：

- 显示生命、金币、分数、当前单词、时间、校准状态。

## 9. UI 设计

### 9.1 入口卡片

新增在 `LoadingScreen.jsx`：

标题：星光大冒险  
描述：横版平台跳跃，用身体左右倾斜移动，举手跳跃，顶开单词方块通关。  
按钮：开始冒险

### 9.2 游戏 HUD

顶部 HUD：

- 左：生命 3 颗心
- 中：分数、金币
- 右：时间、已学单词数

底部弱提示：

- 左倾 / 右倾 / 举手跳 / 下蹲

不要使用大段教程文字。只在校准和首次动作时显示简短状态。

### 9.3 单词挑战弹层

用于暂停游戏并强化学习：

- 中文释义大字显示
- 英文单词
- 发音按钮
- 目标动作图标
- 成功后自动关闭

## 10. 游戏记录和后台

### 10.1 记录字段

扩展 `saveGameRecord` 可选字段：

```js
{
  coins: 0,
  completed: false,
  damageCount: 0,
  deathCount: 0,
  durationSeconds: 0,
  platformerStats: {
    levelId: 'sunny-valley-1',
    finishX: 0,
    maxX: 0,
    coinsCollected: [],
    enemiesDefeated: [],
    wordBoxResults: []
  }
}
```

`hitWords` 存储完成的单词方块。  
`missedWords` 存储本关未完成的单词方块。

### 10.2 后台展示

`AdminDashboard.jsx`：

- `modeName` 新增 `platformer` -> 星光大冒险。
- 列表摘要显示：分数 / 已学单词数 / 是否通关。
- 详情显示：全量单词、学到单词、未完成单词、金币、受伤次数、通关时间。

## 11. 音效

复用现有 `soundEffects.js`：

- 金币：短促高音 `playSuccessTone(1)`
- 单词完成：`playSuccessTone(4)` + `playWordPronunciation(word)`
- 受伤：新增或复用低音提示
- 通关：连续成功音

音频播放必须包裹 try/catch，保持和现有实现一致，避免浏览器自动播放限制导致报错。

## 12. 开发计划

### Phase 1：MVP 骨架

目标：能进入新模式，控制角色走、跳、落地。

- 新增 `platformer` 模式入口。
- 新增 Overlay 和 Canvas。
- 新增轻量物理系统。
- 新增体感左右移动和跳跃。
- 新增一个测试关卡。
- 新增键盘备用控制。

验收：

- 能从首页进入星光大冒险。
- 摄像头全屏工作。
- 角色可以左右移动、跳跃、站在平台上。
- 掉落后回到检查点。

### Phase 2：完整单关

目标：完成一局可结算的游戏。

- 金币收集。
- 敌人巡逻和踩踏。
- 终点旗帜。
- 分数和生命。
- `finishArcade` 结算。
- 后台记录展示。

验收：

- 到达终点后进入结算页。
- 结算页显示得分、金币、时间。
- 后台有记录。

### Phase 3：单词学习

目标：把单词方块和动作挑战接入。

- 单词方块触发。
- 单词卡片弹层。
- 动作挑战识别。
- 语音播报。
- `hitWords` / `missedWords` 记录。

验收：

- 每关 5 个单词方块。
- 完成动作后记录对应单词。
- 未完成的单词进入 missedWords。

### Phase 4：体验优化

目标：让游戏更顺、更像正式产品。

- 粒子特效。
- 角色动画状态机。
- 移动平台和弹跳平台。
- 低帧率降级。
- 移动端布局适配。

## 13. 验收标准

功能：

- 新模式可从首页启动。
- 支持退出游戏，Esc 和顶部退出按钮均有效。
- 无摄像头时可以用键盘调试。
- 一局完整流程可结束并记录。

体感：

- 左右移动误触率低。
- 跳跃有冷却，不因举手停留连续触发。
- 丢失人体时暂停输入，不让角色失控。

性能：

- 桌面 Chrome 目标 55 FPS 以上。
- 普通笔记本摄像头 + MediaPipe + Three.js 不明显卡顿。
- 低帧率时自动减少粒子和后处理。

部署：

- `npm run build` 通过。
- EdgeOne/Cloudflare 静态部署可打开。
- 不依赖外部图片素材。

## 14. 风险和缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 体感移动不够精准 | 玩家难以控制 | 增加死区、平滑、键盘备用 |
| 跳跃误触发 | 游戏体验差 | 起跳冷却 + 必须落地后再次触发 |
| MediaPipe + Three.js 性能压力 | 低端设备卡顿 | 低粒子、无后处理、减少动态物体 |
| 横版物理边界 bug | 卡墙/穿模 | AABB 轴分离碰撞，关卡只用矩形平台 |
| 版权风险 | 不能公开部署 | 使用原创角色、原创素材，只保留“横版平台风格” |

## 15. 第一版推荐实现清单

第一版只做这些，避免范围失控：

- 1 个原创关卡「阳光山谷」
- 1 个角色
- 2 种平台：ground / float
- 1 种敌人：walker
- 金币
- 5 个单词方块
- 终点旗帜
- 体感：左右移动、跳跃
- 键盘备用：A/D/Space
- 结算和后台记录

## 16. 后续扩展

- 多关卡地图
- BOSS 单词战
- 双人合作模式
- 关卡排行榜
- 自定义词库关卡
- 老师后台布置指定单词关卡

---

文档版本：v1.1  
最后更新：2026-06-30  
维护者：StarryDancePixie 开发团队
