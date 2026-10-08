# HeteroCam Lab 技术文档

异构摄像集群交互仿真的设计、实现与排障记录。

- 工程名：`heterocam-lab`
- 运行：`npm install` 后 `npm run dev`，浏览器打开 http://localhost:5173
- 代码根目录：`src/`

---

## 1. 任务怎么被理解

用户要求「作为具身智能专家和计算机视觉专家」，做一个**可交互**的仿真，对象是一组**异构摄像集群**，平台包括但不限于智能拍摄机器人、拍摄机器狗。

这不是单一相机预览，也不是只画几个盒子。它需要同时满足三件事：

1. **具身**：不同平台有不同的运动约束，不能都当成自由刚体平移。
2. **视觉**：每台设备是针孔相机，有内参、外参、视锥、遮挡和多视几何指标。
3. **可交互**：能选中、遥控、改任务模式、看实时画面、改参数、导出位姿。

工作区当时是空目录。最终做成浏览器里的三维指挥台，而不是 Gazebo / Isaac Sim / Unity。原因如下。

| 方案 | 为何没选 / 为何选 |
|---|---|
| ROS + Gazebo / Isaac | 安装重、异构模型要 URDF 和物理引擎，交互周期长，不适合当时空仓库快速交付 |
| Unity | 需要编辑器授权与资源管线，难在当前仓库内直接打开 |
| 浏览器 Three.js | 零额外运行时、一套代码同时做运动学、相机几何和 UI，立刻可点 |

这是**运动学级（kinematic）仿真**，不是刚体动力学仿真。碰撞用圆柱 vs AABB，不求解接触力。对「拍摄任务规划 / 多机覆盖 / 内外参」这一层问题已经够用。

---

## 2. 完成路径（实际是怎么做的）

实现不是一次写完，而是按下面顺序推进。后面第 10 节对应排障细节。

1. `npm create vite@latest . -- --template react-ts` 建立 TypeScript + React 空项目。
2. 安装 `three`、`@react-three/fiber`、`@react-three/drei`、`zustand`。
3. 先写**与渲染无关**的核心：`types` → `kinematics` → `coverage` → `store`。这样运动学和可见性可以单独推理，不绑在 Mesh 上。
4. 再写场景：摄影棚、主体、五类平台模型、视锥 / 热力 / 基线。
5. 用离屏 `WebGLRenderTarget` 给每台设备出一路实时画面。
6. HTML 指挥台 HUD：编队列表、内外参、覆盖指标、导出 JSON。
7. 浏览器里端到端点选、编队、热力、切换机位，修掉主视角全黑、云台俯仰反号、滑轨朝向幕墙等问题。

原则：**状态在 zustand，姿态在 `useFrame` 里写 ref，不让 60 Hz 的位姿更新走 React 调和。** 只有增删机位才改 `agentIds` 触发挂载。

---

## 3. 技术栈

| 层 | 选择 | 作用 |
|---|---|---|
| 构建 | Vite 8 + TypeScript | 开发服务器与类型检查 |
| UI | React 19 | HUD、键盘绑定 |
| 3D | Three.js 0.186 + R3F 9 + drei 10 | 场景、相机、控件 |
| 状态 | zustand 5 | 仿真时钟、机位、指标 |
| 风格 | 自写 CSS + IBM Plex | 深色摄影棚指挥台 |

TypeScript 打开了 `verbatimModuleSyntax` 和 `erasableSyntaxOnly`，因此：

- 类型必须 `import type`
- 不用 `enum`，用 `as const` 对象 + 派生联合类型（见 `PlatformKind`、`TaskMode`）

---

## 4. 目录与数据流

```
src/
  App.tsx                 壳：HUD + Canvas
  sim/
    types.ts              平台种类、Agent、障碍 AABB、世界常量
    kinematics.ts         限幅、光学中心、跟踪角、主体轨迹
    coverage.ts           视锥、遮挡、覆盖率、热力、GSD、三角化
    store.ts              仿真步进、输入、编队、增删机位
  scene/
    World.tsx             Canvas、时钟、轨道控制器
    Studio.tsx            棚、灯、箱子、滑轨梁
    Subject.tsx           主体步行
    Platforms.tsx         五类外形 + 每机 PerspectiveCamera
    Viz.tsx               视锥线、热力、基线、路点
    Feeds.tsx             离屏渲染 + 主相机前的画面条
  ui/Hud.tsx              指挥台与快捷键
```

主循环：

```
R3F useFrame(-3)  SimClock.tick(dt)
        ↓
zustand：推进 time / subject / agents / metrics
        ↓
useFrame(0)  平台 Group、主体骨骼、视锥顶点 读 getState() 写 Three.Object3D
        ↓
useFrame(-1)  各机相机 → WebGLRenderTarget
        ↓
默认通道  轨道相机渲染世界（含 layer 1 可视化、layer 2 画面条）
```

`tick` 的优先级是 `-3`，保证几何在离屏拍画面之前已经是本帧姿态。`dt` 钳在 `0.05`，避免切后台后一帧走出棚。

---

## 5. 坐标、相机与光学中心

世界是 Three.js 默认：**Y 向上，右手系，相机局部看向 −Z**。欧拉角顺序 **YXZ**（先 yaw 再 pitch）。

机体前进方向与 yaw 的关系：

```
forward(yaw) = (−sin yaw, −cos yaw)     // xz
yaw = 0  → 朝 −Z
yaw = π  → 朝 +Z
```

滑轨装在舞台后方 `z = −6.45 m`。若机体 yaw 仍为 0，镜头对着幕墙。所以滑轨默认 `yaw = π`，光学轴指向舞台。

`cameraPose(agent)` 把「底盘位姿 + 云台」变成光学中心。变焦不改分辨率，只缩小垂直视场：

```
fov_eff = fovY / zoom
```

各平台光学中心（相对底盘）：

| 平台 | 光学中心 |
|---|---|
| PTZ | 底盘上方 `+1.38 m` |
| RAIL | 轨道高度 `y = 4.18 − 0.22 m`，`z` 锁在轨道 |
| ROVER | 桅杆顶 `y = 1.30 m` |
| DOG | 头前方 `0.34 m`，约 `y = 0.64 m`，叠一点 `bodyPitch` |
| UAV | 机腹下 `y − 0.20 m` |

跟踪时看向主体胸部 `(x, 1.12, z)`：

```
worldYaw = atan2(−dx, −dz)
elev     = atan2(dy, hypot(dx, dz))
pan      = wrap(worldYaw − bodyYaw)
tilt     = elev
```

Three.js 里 **`rotation.x > 0` 是抬头**（+X 右手系把视线 −Z 旋向 +Y）。因此 `tilt` 直接等于仰角：目标在下方则为负。实现过程中曾把 `tilt` 取反，滑轨和无人机全部朝天，画面丢失；纠正后六路才能同时 LOCK。

针孔内参加 `focalPx`：

```
fy = (resY / 2) / tan(fov_eff / 2)
fx = fy          // 方形像素
cx = resX / 2
cy = resY / 2
```

导出 JSON 里的 `T_wc.t` 是光学中心世界坐标，`rpy_yxz` 是 `(pitch, yaw, 0)`。这是相机到世界的位置与 YXZ 姿态，不是 OpenCV 的 `T_cw`，下游若做 PnP / 三角化需要先求逆。

---

## 6. 异构运动学

每类平台有独立 `LIMITS`：云台行程、最大线速度、偏航角速度、碰撞半径、飞行高度。

### 6.1 固定云台 PTZ

位置锁死。`WASD` 映射为 pan/tilt。适合侧机位、无法进场的机位。

### 6.2 滑轨 RAIL

构型空间是一维：`x ∈ [−8.6, 8.6]`，`z` 钉在轨道。`W/S` 沿轨，`A/D` 补 pan。巡航时 `x` 跟随主体 `x * 1.15`。

### 6.3 轮式拍摄机器人 ROVER

非完整约束（unicycle）：

```
yaw += ω · dt
(x, z) += v · forward(yaw) · dt
```

不能横移。朝目标行驶时，航向误差大于约 `arccos(0.2)` 则先转弯、不给油，避免原地画弧刮到箱子。

### 6.4 拍摄机器狗 Quadruped

近完整约束：前进 + `C/V` 侧移。头部 pan 只有 ±0.85 rad，模拟脖子行程。加速时加一点 `bodyPitch`，相机俯仰跟着身体。腿用对角相位正弦抬腿，只是外观，不进动力学。

### 6.5 无人机 UAV

平面机动与狗类似，高度由 `Q/E` 控制，限制在 `[1.4, 7.2] m`。巡航时绕主体转，高度做小幅起伏。

### 6.6 碰撞

地面平台用圆 vs AABB。幕墙箱子 `min.y > 2.2` 的（整面天幕）不挡地面走，但挡视线。无人机水平同样做圆碰撞，高度单独限幅。

### 6.7 任务模式

| 模式 | 行为 |
|---|---|
| 手动 | 键盘 / 滑条有效；双击地面给路点，移动平台驶向该点 |
| 跟踪 | 每帧 `applyLook`，底盘不动（除非同时在巡航） |
| 巡航 | 移动平台绕主体；滑轨跟 x；云台仍跟踪 |

选中且为手动时，不自动 look-at，避免和方向键抢云台。

「环绕编队」把 ROVER / DOG / UAV 按种类半径均布在主体周围，切到跟踪，PTZ 与滑轨不动。

---

## 7. 视觉与多视几何

### 7.1 可见性 `seesSubject`

两步：

1. 胸部点是否在视锥内（`pointInFront`：变换到相机系，要求 `z ∈ [−far, −near]` 且落在 `tan(fov/2)` 张成的矩形）。
2. 光学中心到胸部的线段是否与障碍 AABB 相交（slab 算法，忽略起点附近 `t < 0.02`，避免自交）。

HUD 上 LOCK / LOST、画面条「主体在框 / 未入画」都来自这里。

### 7.2 覆盖率

在舞台附近 `10 m × 10 m` 网格（默认 28×28）采样地面点，统计至少被一台相机视锥罩住的比例。热力图是另一张 `16 m × 40×40` 的 RGBA `DataTexture`，约 4 Hz 更新，颜色按「看见该点的相机数 / 4」映射。热力只算视锥，不算遮挡，为的是交互时还能跑满帧。

### 7.3 基线与三角化质量

对所有同时看见主体的相机两两求光学中心距离，得到平均 / 最短基线。三角化分数把视线夹角相对 60° 的偏差映射到 `[0, 1]`：夹角太小则退化，接近直角又浪费重叠。这是启发式，不是协方差椭圆。

### 7.4 GSD

用水平距离近似深度：

```
height_m = 2 · tan(fov_eff / 2) · depth
gsd_cm/px = height_m / resY · 100
```

选中机位时右侧显示该值，用来比较「跟多近 / 变焦多少」对地面采样间距的影响。

---

## 8. 渲染：层、离屏画面、指挥台

### 8.1 图层

| Layer | 内容 | 谁能看见 |
|---|---|---|
| 0 | 棚、主体、平台（默认） | 轨道相机 + 各机相机 |
| 1 | 视锥、热力、基线、路点 | 仅轨道相机 |
| 2 | 主相机前方的画面条 | 仅轨道相机 |

各机 `PerspectiveCamera` 默认只开 layer 0，所以实时画面是「干净镜头」，不含调试图元，也不会把画面条再拍进画面条。

### 8.2 为何不用 drei `<Hud>`

第一版把画面条放在 `Hud + OrthographicCamera makeDefault` 里。`makeDefault` 把 R3F 默认相机换成正交相机，主视角变成近黑、只剩 CSS/标签。后来改成：**画面条作为子物体，每帧复制轨道相机的位姿**，放在相机前方 `z = −1.15`、视场底部约 20% 高度。GPU 纹理直接当 `map`，不 `readPixels`。

离屏尺寸 `320×180`。`FeedCapture` 用 `try/finally` 恢复 `getRenderTarget()`，避免中途抛错后主缓冲不再更新、整屏死黑。

### 8.3 平台网格

五类外形都是 Primitive（盒、柱、胶囊），不加载 GLTF，保证仓库自包含。每台设备旁有一个独立的 `perspectiveCamera`，世界系写入 `cameraPose`，注册进 `agentCameras` Map 供离屏使用。

主体是低模人，相位 `time * 7.2` 摆臂摆腿；平面轨迹是双纽线（8 字）：

```
x = 3.4 sin(s)
z = 1.7 sin(s) cos(s)
s = 0.32 t
```

朝向由速度的 `atan2` 给出，与相机 yaw 同一套前进定义。

### 8.4 灯光与雾

摄影棚用半球光 + 环境光 + 定向光 + 三盏聚光。雾的 near/far 必须大于轨道相机到舞台的距离（约 14–18 m）。第一版 `fog(18, 42)` 把整台戏吃进雾里，主视角只剩标签。现为 `fog(32, 70)`。Three r186 去掉了 `PCFSoftShadowMap`，阴影通道关掉，避免无意义警告。

### 8.5 标签

`drei Html` 在 React 19 下会 `unmount a root while rendering`，六个铭牌触发六次。改成 `Billboard + Text`（troika），标签留在 WebGL 里。

---

## 9. 交互与导出

键盘在 `bindKeys` 里监听 `e.code`（布局无关）：

| 键 | 作用 |
|---|---|
| WASD | 底盘 / 滑轨；PTZ 则为云台 |
| QE | 无人机升降；PTZ 俯仰 |
| 方向键 | 云台 pan/tilt |
| ZX | 变焦 |
| CV | 机器狗侧移 |
| 空格 | 暂停仿真（手动仍可摆机位） |
| F / G / B | 视锥 / 热力 / 基线 |
| 1–8 | 按列表选机 |
| 单击机位或画面条 | 选中 |
| 双击地面 | 路点 |

右侧滑条改 pan/tilt 时会把模式切到手动，避免跟踪立刻覆盖用户输入。

「导出外参」下载 `heterocam-poses-<time>s.json`，每台相机包含 `K`、`T_wc`、是否看见主体、GSD。可用于离线多视几何或自己的规划脚本，但坐标约定见第 5 节，不要直接当 OpenCV `rvec/tvec`。

集群上限 8 台，避免离屏相机线性涨上去把 GPU 打满。

---

## 10. 实现时踩过的坑（和代码里最终的对策）

这些是「怎么完成的」里真正花时间的部分，不是事后归纳的最佳实践清单。

1. **主视角被 HUD 相机抢走**  
   `Hud` 内 `OrthographicCamera makeDefault` 替换默认相机。对策：不用 Hud，画面条挂在轨道相机上，并用 layer 2 隔离。

2. **雾太近**  
   相机距原点约 18 m，雾从 18 m 开始，舞台相当于没了。对策：拉开雾，相机收到 `[8.6, 5.8, 9.4]`。

3. **俯仰符号与 Three.js 相反**  
   曾把 `tilt = −elev`，高机位全抬头。对照 `Rx(θ)·(0,0,−1) = (0, sin θ, −cos θ)` 后改为 `tilt = elev`，并放宽向下（负）行程。

4. **滑轨 yaw=0 正对天幕**  
   轨道在 −Z，镜头默认 −Z。对策：滑轨 `yaw = π`，pan 行程给满 ±π。

5. **React 19 + drei Html**  
   铭牌 portal 在渲染中卸载。对策：WebGL 文本。

6. **HMR 与 `cameraPose` 暂时导出失败**  
   连改 `kinematics.ts` 时 Vite 会报「没有 named export」。硬刷新即可；把 `bindKeys`、`agentCameras` 和组件放在同一文件也会让 Fast Refresh 失效，属已知限制。

7. **PowerShell 不接受 `&&`**  
   Windows 上连续 `npm install` 要用 `;` 和 `$LASTEXITCODE`。

8. **60 Hz 订阅 zustand 导致 Mesh 重挂载**  
   平台位姿只在 `useFrame` 里写 ref；`agentIds` 仅增删时变，列表才 reconcile。

---

## 11. 默认编队（开机场景）

| 名称 | 种类 | 默认模式 | 意图 |
|---|---|---|---|
| PTZ-L / PTZ-R | 固定云台 | 跟踪 | 左右侧机 |
| RAIL-1 | 滑轨 | 跟踪 | 高位横移 |
| ROVER-1 | 轮式机器人 | 巡航 | 地面环绕 |
| DOG-1 | 机器狗 | **手动** | 一开机就可 WASD |
| UAV-1 | 无人机 | 巡航 | 空中环绕 |

DOG-1 被设为默认选中，是为了让「可交互」在第一秒就能被摸到。

---

## 12. 验证过什么

浏览器里实际点过，不是只看编译：

- 六路同时 LOCK，底部六路画面都能看到红衣主体
- 「环绕编队」会改变移动平台位置和云台角
- 「热力」在地面画出覆盖
- 选中 UAV-1 后检视器文案变为「三维飞行 + 三轴云台」，滑条显示正在跟踪的 pan/tilt
- `tsc -b` 通过

未做的：自动化单测、物理步态、镜头畸变、完整深度图。运动学与 `pointInFront` 足够纯函数化，以后可抽到 Node 测试。

---

## 13. 局限与可续做的方向

当前刻意没做的：

- 无 IMU / 轮速噪声，跟踪是理想 look-at
- 无径向畸变、无卷帘、无曝光
- 热力不算遮挡；可见性才算
- 导出的是 YXZ 欧拉而不是旋转矩阵或四元数
- 离屏相机每帧全渲染，机位 > 8 需要降分辨率或隔帧

若要往「研究工具」再走一步，比较自然的是：

1. 把 `T_wc` 改成 3×4 矩阵，并同时给 `T_cw`
2. 给每路可选深度 / 实例 ID 附件，做多视重建实验
3. 覆盖巡航改成可配置的角间距与半径，而不是写死 `orbitRadius`
4. 用 WebWorker 算热力，主线程只上传纹理

---

## 14. 关键文件对照

读代码时建议按这个顺序：

1. `src/sim/types.ts` — 状态长什么样  
2. `src/sim/kinematics.ts` — 光学中心和限幅  
3. `src/sim/coverage.ts` — 什么叫「看见」  
4. `src/sim/store.ts` 的 `stepAgent` / `tick` — 一帧里发生什么  
5. `src/scene/Feeds.tsx` + `World.tsx` — 画面如何画出来  
6. `src/ui/Hud.tsx` 的 `exportPoses` — 和外部 CV 管线的接口  

以上就是本仿真从空目录做到可交互指挥台的完整技术说明。
