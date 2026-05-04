# 溯灵

一款基于 RPG Maker MV 开发的卡牌策略 RPG。

## 项目简介

《溯灵》是一款融合卡牌策略与侧视战斗演出的像素风角色扮演游戏。玩家将在一个充满未知的世界中探索、解谜、战斗，逐步揭开隐藏在迷雾背后的真相。

## 核心特色

- **卡牌策略战斗系统**：自定义卡牌战斗 UI，支持鼠标点选与策略组合
- **侧视动画演出 (Side-View Battle)**：YEP 动作序列插件驱动，战斗动作流畅、打击感强
- **九元素属性克制**：物理 / 炎 / 冰 / 雷 / 水 / 土 / 风 / 光 / 暗，策略深度丰富
- **多维度技能体系**：魔法、必杀技、攻击、防御、爆发、诡术、能力、存在 八大技能派系
- **嵌入式谜题系统**：
  - Truth/Lie 推理判定
  - 开关解谜
  - 反应速度挑战
  - 连线绘图
- **DragonBones 骨骼动画**：角色与敌人动态立绘，增强表现力
- **动态场景效果**：环境光效、镜头缩放、粒子系统、脚步声效

## 技术架构

| 技术项 | 说明 |
|--------|------|
| 引擎 | RPG Maker MV (WebGL + Pixi.js) |
| 分辨率 | 1024 × 768 |
| 语言 | 简体中文 (zh_CN) |
| 战斗系统 | 侧视回合制 (YEP Battle Engine Core) |
| 动画系统 | DragonBones + YEP Animated SV Enemies |
| UI 框架 | MOG 菜单套件 + 自定义卡牌 UI |
| 地图规模 | 11 张风格化叙事地图 |
| 插件数量 | 62 个功能插件 |

### 主要插件清单

- **Yanfly Engine Plugins**：核心引擎、战斗引擎、动作序列包、吸收屏障、动画敌人
- **MOG Plugins**：菜单背景、粒子特效、光标边框、战斗 HUD、血条、滚动条
- **DragonBones**：骨骼动画运行时
- **Puzzle 系列**：TruthLie、SwitchItem、DrawLineGame、SimpleReactionGame
- **自定义插件**：卡牌战斗 UI、卡牌数据修复、鼠标选择系统、环境光效、灵魂引导等

## 运行方式

### 方式一：浏览器运行 (推荐开发调试)

1. 确保已安装 [Node.js](https://nodejs.org/)
2. 进入项目根目录
3. 启动本地服务器：
   ```bash
   npx serve .
   # 或
   python -m http.server 8080
   ```
4. 浏览器访问 `http://localhost:8080`

### 方式二：RPG Maker MV 编辑器

1. 安装 RPG Maker MV
2. 打开项目根目录下的 `Game.rpgproject`
3. 点击编辑器中的「游戏测试」按钮

### 方式三：打包部署

使用 RPG Maker MV 的「部署」功能，选择目标平台（Windows / macOS / Android / iOS / Web）进行打包。

## 项目结构

```
溯灵/
├── audio/              # 音频资源 (BGM / BGS / ME / SE)
├── data/               # 游戏数据 (地图、角色、技能、事件等 JSON)
├── dragonbones_assets/ # DragonBones 骨骼动画资源
├── fonts/              # 自定义字体
├── img/                # 图像资源
│   ├── animations/     # 战斗动画
│   ├── battlebacks1/   # 战斗背景
│   ├── characters/     # 角色行走图
│   ├── faces/          # 角色头像
│   ├── menus/          # 菜单界面素材
│   ├── parallaxes/     # 远景图
│   ├── pictures/       # 图片素材
│   ├── sv_actors/      # 侧视战斗角色图
│   └── tilesets/       # 图块集
├── js/                 # 脚本
│   ├── libs/           # 核心库 (Pixi.js, DragonBones 等)
│   └── plugins/        # 插件目录 (62 个插件)
├── movies/             # 视频素材
├── index.html          # 游戏入口
└── package.json        # 桌面版配置
```

## 开发日志

本项目在开发过程中借助 Claude AI 辅助完成了以下工作：

- 剧情文本生成与润色
- 事件脚本编排与多分支逻辑设计
- 62 个插件的加载优先级梳理与参数调优
- 数值平衡模拟与战斗公式优化
- 谜题系统的事件脚本编写
- 代码审查与冲突排查

## 注意事项

- 本项目使用 SimHei 作为默认中文字体，运行环境需支持该字体或已包含在 `fonts/` 目录中
- 存档文件 (`save/`) 已加入 `.gitignore`，不会被提交到版本库
- `.m4a` 音频文件已排除，仅保留 `.ogg` 格式（适用于 Web/PC 平台）
- `.psd` 源文件已排除，仅保留运行时所需的 `.png` 素材

## 开源与许可

本项目为个人/团队独立游戏作品。项目中使用的 RPG Maker MV 默认素材、Yanfly Engine Plugins、MOG Plugins 等第三方资源遵循其 respective 许可协议。

---

*Made with RPG Maker MV & Claude.*
