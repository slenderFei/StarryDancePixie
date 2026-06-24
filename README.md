# ✨ 星光词汇挑战 - Starry Dance Pixie

一款专为 9-11 岁女孩设计的体感英语单词学习应用。通过身体律动和 AI 驱动的互动体验，让英语学习变成一场梦幻的魔法冒险！

## 🌟 核心理念

**"身体在律动，大脑在吸收"**

将枯燥的单词记忆转变为充满乐趣的体感游戏，每个单词都配有专属的魔法动作，让学习自然发生。

## 🎨 特色功能

- **梦幻 3D 场景**：马卡龙色系的柔美渐变背景，漂浮的几何装饰，闪烁的星光粒子
- **可爱的 3D 精灵**：跟随鼠标移动的小精灵伙伴，陪伴学习全程
- **体感互动**：基于 MediaPipe Pose 的实时骨架检测，识别各种身体动作
- **魔法粒子特效**：双手高举时触发绚丽的星星散开效果（Shader 实现）
- **正面反馈系统**：即时鼓励、连击奖励、成就动画

## 🚀 技术栈

- **React 18** - 现代化的前端框架
- **Three.js + React Three Fiber** - 3D 渲染引擎
- **@react-three/drei** - Three.js 实用组件库
- **@react-three/postprocessing** - 后期处理效果
- **MediaPipe Pose** - Google 的姿态检测 AI
- **Zustand** - 轻量级状态管理
- **Vite** - 快速的构建工具

## 📦 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🎮 使用说明

1. 打开应用后，允许摄像头访问权限
2. 站在摄像头前，确保上半身可见
3. 点击"开始魔法冒险"按钮
4. 跟随屏幕提示完成魔法动作
5. 动作正确后自动进入下一个单词
6. 完成所有单词后查看学习成果

## 🎯 支持的动作

| 动作名称 | 描述 | 对应单词示例 |
|---------|------|-------------|
| hands_up | 双手高举过头顶 | sunshine, starlight |
| arms_wave | 双臂像翅膀一样扇动 | butterfly |
| arms_arc | 双手画弧线 | rainbow |
| sway | 身体左右摇摆 | dancing |
| jump | 轻轻跳跃 | jumping |
| arms_triangle | 双手头顶合拢成三角 | mountain |
| wave_motion | 双臂模拟海浪 | ocean |
| bloom | 双手从合拢到打开 | flower |
| stretch | 双臂向两侧伸展 | stretching |
| hands_together | 双手合十 | dreaming |
| arms_spread | 双臂平展像飞机 | flying |

## 📁 项目结构

```
src/
├── main.jsx          # 应用入口
├── App.jsx           # 主组件
├── App.css           # 主样式
├── index.css         # 全局样式
├── components/
│   ├── Scene3D.jsx       # 3D 场景
│   ├── Sprite3D.jsx      # 3D 精灵
│   ├── StarParticles.jsx # 星星粒子特效
│   ├── PoseDetector.jsx  # MediaPipe 姿态检测
│   ├── WordPanel.jsx     # 单词面板
│   ├── GameUI.jsx        # 游戏 UI
│   └── LoadingScreen.jsx # 加载屏幕
├── store/
│   └── gameStore.js      # Zustand 状态管理
└── data/
    └── words.json        # 单词数据
```

## 🎨 设计原则

- **马卡龙配色**：柔和、梦幻、少女心
- **即时正面反馈**：每次成功都有鼓励
- **低强度运动**：适合 9-11 岁儿童的身体发育
- **渐进式学习**：从简单动作到复杂动作

## 🔮 未来计划

- [ ] 添加更多单词和动作
- [ ] 支持语音朗读
- [ ] 添加 AI 对话引导
- [ ] 支持多人模式
- [ ] 添加成就系统
- [ ] 支持自定义单词列表

## 📄 License

MIT License

---

Made with 💖 for young learners
