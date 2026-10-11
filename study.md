# 灵眸慧检 微信小程序 技术全解学习文档

> 面向零编程基础学习者 —— 从项目入口开始，逐步讲解每一行代码在做什么、为什么这么做、用到了什么技术。

---

## 目录

1. [项目全景：它是什么、能干什么](#一项目全景)
2. [基础概念：一个微信小程序是怎么构成的](#二基础概念)
3. [技术总览](#三技术总览)
4. [逐模块深度讲解](#四逐模块深度讲解)
   - [app.js —— 小程序的大脑](#41-appjs--小程序的大脑入口)
   - [app.json —— 小程序的配置单](#42-appjson--小程序的配置单)
   - [app.wxss —— 小程序的皮肤](#43-appwxss--小程序的皮肤全局样式)
   - [pages/index —— 首页](#44-pagesindex--首页)
   - [pages/detect —— 视力检测核心页](#45-pagesdetect--视力检测核心页)
   - [GestureManager —— 手势识别总指挥官](#46-utilsgesturemanagerjs--手势识别总指挥官)
   - [tfjs-engine —— TensorFlow.js AI 引擎](#47-utilstfjs-enginejs--tensorflowjs-ai-引擎)
   - [color-simulation —— 色盲模拟算法](#48-utilscolor-simulationjs--色盲模拟算法)
   - [color-train —— 色彩训练游戏](#49-pagescolor-train--色彩训练游戏)
   - [package_colorblind —— 色盲检测](#410-package_colorblind--色盲检测)
   - [astigmatism —— 散光检测](#411-pagesastigmatism--散光检测)
   - [protect —— 护眼训练营](#412-pagesprotect--护眼训练营)
   - [package_ai —— AI 对话助手](#413-package_ai--ai-对话助手)
   - [deepseek-api —— 与大语言模型通信](#414-utilsdeepseek-apijs--与大语言模型对话)
   - [tts —— 文本转语音](#415-utilsttsjs--文本转语音)
   - [i18n —— 中英文双语](#416-utilsi18njs--中英文双语系统)
   - [components —— 可复用组件](#417-components--可复用组件)
5. [完整技术流总结](#五完整技术流总结)
6. [架构决策](#六为什么这么设计--架构决策)

---

## 一、项目全景

**项目名称**：灵眸慧检（AI Vision Test）

**它是什么**：一个运行在微信里的**视力健康检测与训练小程序**。用户打开微信就能用，无需下载安装额外 App。

**它能干什么**：

1. **视力检测** —— 用 E 字表/数字表/图形表测视力等级
2. **色盲筛查** —— 用石原色盲检测图判断色觉是否正常
3. **散光自测** —— 用放射状线条判断是否有散光
4. **AI 手势交互** —— 可以用手在空中比划方向来回答问题（不用触摸屏幕）
5. **AI 语音对话** —— 可以和 AI 助手语音聊天，问护眼问题
6. **护眼训练** —— 追星星、气球变焦、大风车等视觉训练游戏
7. **色彩训练** —— 找色差、颜色记忆、渐变排序，训练色彩感知
8. **散光康复训练** —— 经线对齐、Gabor 条纹对比度训练
9. **眼保健操引导** —— 六节标准眼保健操图文引导
10. **中英双语** —— 全界面支持中文/英文切换

---

## 二、基础概念

### 2.1 什么是微信小程序？

微信小程序是一种**不需要安装**就能使用的应用。用户扫个码或者在微信里搜一下就能打开。它跑在微信这个大壳子里，微信给它提供了摄像头、语音、存储等能力。

### 2.2 一个小程序页面由四个文件组成

每个页面都是一个文件夹，里面有四兄弟：

| 文件后缀 | 角色 | 类比 |
|---------|------|------|
| `.js` | **逻辑层** — 控制页面行为 | 人的大脑 |
| `.json` | **配置层** — 页面设置 | 人的身份证 |
| `.wxml` | **视图层** — 页面长什么样 | 人的骨架和五官 |
| `.wxss` | **样式层** — 颜色、字体、间距 | 人的衣服和妆容 |

**打个比方**：你要做一个"按钮点击后变颜色"的效果，需要——
- `.wxml` 里画一个按钮（骨架）
- `.wxss` 里定义按钮的颜色、大小（衣服）
- `.js` 里写"点击后切换颜色"的逻辑（大脑）
- `.json` 里配置页面标题等基本信息（身份证）

### 2.3 提前解释的关键术语

| 术语 | 含义 |
|------|------|
| **API** | 应用程序接口。"别人写好的功能，你直接调用就行"。比如 `wx.getStorageSync` 是微信提供的"读取本地存储"的 API |
| **npm / node_modules** | Node.js 的包管理器。别人写好的代码库，通过 `require()` 引入 |
| **异步 (async/await)** | 处理"需要等待的操作"的方式。下载时程序不会傻等，而是继续做别的事 |
| **回调函数 (callback)** | "你做完这件事之后，记得叫我" |
| **事件 (Event)** | 用户触发的东西：点击、滑动、长按 |
| **数据绑定** | `.js` 里数据变了，`.wxml` 页面自动跟着变 |
| **Tensor（张量）** | AI 的基本数据单位 = 多维数组。图片在 AI 眼里是 3 维张量（宽×高×颜色） |
| **模型 (Model)** | AI 的"训练好的大脑"。给输入，出结果 |

---

## 三、技术总览

```
+------------------------------------------------------------------+
|                         灵眸慧检 小程序                              |
+------------------------------------------------------------------+
|                                                                   |
|  [前端框架]  微信小程序原生框架 (WXML + WXSS + JS + JSON)           |
|                                                                   |
|  [AI 引擎层]                                                       |
|   +-- TensorFlow.js (WebGL 后端)  --  手部21关键点检测              |
|   +-- VisionKit (微信原生)        --  手势分类 (握拳/手掌/剪刀等)     |
|   +-- DeepSeek Chat API          --  大语言模型对话                  |
|   +-- DeepSeek Whisper API       --  语音转文字                     |
|   +-- DeepSeek TTS API           --  文字转语音播报                  |
|                                                                   |
|  [算法层]                                                          |
|   +-- 色盲模拟矩阵变换 (protanopia/deuteranopia/tritanopia)        |
|   +-- WCAG 2.1 对比度计算公式                                       |
|   +-- HSL 色彩空间插值/操作                                         |
|   +-- 手指方向角计算 (atan2)                                        |
|   +-- 手指伸出计数算法                                              |
|                                                                   |
|  [工程层]                                                          |
|   +-- 事件驱动架构 (GestureManager emits events)                    |
|   +-- 观察者模式 (status/results listeners)                         |
|   +-- 降级策略 (VisionKit 失败 -> TensorFlow.js)                    |
|   +-- 分包加载 (lazy loading)                                       |
|   +-- 国际化 i18n (中/英双语)                                       |
|   +-- 节流/防抖 (性能优化)                                          |
|   +-- 音频队列播放                                                   |
|                                                                   |
+------------------------------------------------------------------+
```

---

## 四、逐模块深度讲解

### 4.1 app.js —— 小程序的大脑（入口）

**文件位置**：`/app.js`

它是整个小程序启动时**最先执行**的代码。就像一个公司的 CEO，它不干具体活，但管全局。

#### 4.1.1 模块引入

```javascript
const i18n = require('./utils/i18n.js');
```

**`require()`** 是 Node.js 的关键词，意思是"我需要用到那个文件里导出的东西"。把翻译文本单独放在一个文件里，app.js 只负责"用"，不负责"存"。这叫**关注点分离**——一个文件只做一件事。

#### 4.1.2 全局入口与生命周期

```javascript
App({
  onLaunch() {
    const lang = wx.getStorageSync('language') || 'zh';
    this.globalData.language = lang;
    this.globalData.t = i18n.translations[lang];
```

- **`App({...})`**：微信小程序框架规定的写法，告诉微信"这是我这个程序的入口配置"。
- **`onLaunch()`**：生命周期函数。微信在小程序启动时自动调用，不需要手动调用。
- **`wx.getStorageSync('language')`**：从手机本地存储读取语言设置。`|| 'zh'` 表示如果没读到就用默认值中文。
- **`this.globalData`**：全局数据对象。任何页面都能通过 `getApp().globalData` 访问。
- **`i18n.translations[lang]`**：从翻译文件里取出当前语言对应的所有翻译文本。

#### 4.1.3 规则引擎：按时间生成问候语

```javascript
_generateGreeting() {
  const hour = new Date().getHours();  // 0-23
  if (hour >= 6 && hour < 11) {
    timeGreeting = '早上好';
    eyeTip = '新的一天开始了，记得让眼睛也充充电哦!适当远望5分钟~';
  } else if (hour >= 11 && hour < 14) {
    timeGreeting = '中午好';
  } // ... 还有下午、晚上、深夜的分段
}
```

**`new Date().getHours()`** 获取当前小时（0-23），按时间段分叉到不同问候语。这是**规则引擎**的最简实现——不需要 AI，纯 if-else 就能实现"个性化"。

#### 4.1.4 登录与记录

```javascript
login(userInfo) {
  this.globalData.userInfo = userInfo;
  this.globalData.isLoggedIn = true;
  wx.setStorageSync('localUserInfo', userInfo);  // 持久化保存
  const records = wx.getStorageSync('loginRecords') || [];
  records.push({
    time: new Date().toISOString(),  // ISO 8601 标准时间格式
    platform: (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).platform
  });
  wx.setStorageSync('loginRecords', records);
}
```

- **`wx.setStorageSync(key, value)`**：写入本地存储。数据存在用户手机里，关程序再打开还在。
- **`records.push(...)`**：Array 的 `push` 方法，往数组末尾加条目。
- **`wx.getWindowInfo ? ... : ...`**：三元运算符做**兼容降级**——新 API 有就用，没有就用旧的。

#### 4.1.5 全局语言切换

```javascript
setLanguage(lang) {
  this.globalData.language = lang;
  this.globalData.t = i18n.translations[lang];
  wx.setStorageSync('language', lang);
  const pages = getCurrentPages();  // 获取所有打开的页面
  pages.forEach(page => {
    if (page && typeof page.updateLanguage === 'function') {
      page.updateLanguage();  // 每个页面更新自己的翻译
    }
  });
},
```

- **`getCurrentPages()`**：获取页面栈（所有已打开的页面）
- **`forEach`**：遍历每个页面，调用它们的 `updateLanguage()` 方法
- **`typeof ... === 'function'`**：安全检查，防止调用不存在的方法导致崩溃

**技术点小结**：`require()` 模块化、`wx.getStorageSync/setStorageSync` 本地存储、生命周期 `onLaunch`、全局状态 `globalData`、三元运算符兼容降级、`push`/`forEach`、规则引擎

---

### 4.2 app.json —— 小程序的配置单

**文件位置**：`/app.json`

相当于小程序的"身份证 + 地图"。

```json
{
  "pages": ["pages/index/index", "pages/detect/detect", ...],
  "subpackages": [
    { "root": "package_colorblind", "pages": [...] },
    { "root": "package_ai", "pages": [...] }
  ],
  "window": {
    "navigationBarTitleText": "灵眸慧检"
  },
  "permission": {
    "scope.camera": {
      "desc": "我们需要使用摄像头来进行 AI 手势识别和视力测试"
    }
  }
}
```

- **`pages` 数组**：列出所有主包页面。第一项是首页。
- **`subpackages`（分包）**：用到时才下载的代码包。TF.js 模型文件体积大，如果不分包，主包会超微信 2MB 限制。分包 = **懒加载**——用户点击对应功能时才下载。
- **`permission`**：摄像头权限声明。微信会弹窗显示这段描述让用户同意。这是**隐私合规**要求。
- **`usingComponents`**：全局注册组件，所有页面都能直接使用。

---

### 4.3 app.wxss —— 小程序的皮肤（全局样式）

WXSS 类似于 CSS，控制界面长什么样。

```css
:root {
  --primary-color: #3d8eff;  /* CSS 变量：医疗蓝 */
  --text-color: #333333;
  --bg-color: #F8F9FA;
}
```

- **CSS 变量 (`--xxx`)**：定义后全项目统一使用。改主题色只需改一处。
- **`#3d8eff`**：十六进制颜色码 = 蓝色医疗主题色。

```css
.card {
  background-color: rgba(255, 255, 255, 0.9);  /* 半透明白色 */
  backdrop-filter: blur(10px);  /* 毛玻璃模糊效果 */
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx 0 rgba(0, 0, 0, 0.15);
}
```

- **`rgba(255,255,255,0.9)`**：白色但 90% 不透明，让背景透出来。
- **`backdrop-filter: blur(10px)`**：iOS 风格毛玻璃效果。
- **`rpx`**：微信响应式单位。750rpx = 屏幕宽，不管多大屏幕，比例始终一致。

```css
@keyframes borderRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

- **`@keyframes`**：CSS 动画。定义 360 度旋转。按钮边框有持续旋转的光晕 → 科技感。

---

### 4.4 pages/index —— 首页

**文件位置**：`/pages/index/index.js`

用户打开小程序看到的第一屏。

#### 4.4.1 页面结构

```javascript
Page({
  data: {
    language: 'zh',
    isShattering: false,  // 是否正在播放粉碎动画
    particles: [],         // 粒子碎片数据
  },
  onLoad() {
    this.updateLanguage();
    this.startAnimation();
  },
```

- **`Page({...})`**：每个页面必须这样写，微信框架识别。
- **`data`**：页面的数据仓库。里面任何变量都能在 `.wxml` 里通过 `{{变量名}}` 显示。
- **`this.setData({...})`**：**小程序最核心的方法**。修改数据必须通过它，不能直接 `this.data.xxx = yyy`，否则页面不会刷新。

#### 4.4.2 粒子粉碎动画（语言切换特效）

```javascript
switchLanguage() {
  if (this.data.isShattering) return;  // 防重复触发
  const nextLang = this.data.language === 'zh' ? 'en' : 'zh';
  this.generateParticles();  // 生成40个彩色碎片
  this.setData({ isShattering: true });
  wx.vibrateShort({ type: 'medium' });  // 手机震动

  setTimeout(() => {
    app.setLanguage(nextLang);  // 500ms后切换内容
  }, 500);

  setTimeout(() => {
    this.setData({ isShattering: false, particles: [] });  // 1200ms清理
  }, 1200);
},
```

- **`wx.vibrateShort()`**：触发手机线性马达震动，触觉反馈增强体验。
- **`setTimeout(函数, 毫秒)`**：延时执行。不阻塞代码——"500ms 后记得做这件事"。
- **两次 `setTimeout` 编排动画时序**：500ms 粉碎到最大时偷换语言内容，1200ms 结束清理。

#### 4.4.3 随机粒子生成

```javascript
generateParticles() {
  const particleCount = 40;
  for (let i = 0; i < particleCount; i++) {
    newParticles.push({
      x: 40 + Math.random() * 20,        // 初始X位置
      y: 30 + Math.random() * 40,        // 初始Y位置
      tx: (Math.random() - 0.5) * 600,   // 目标X偏移（-300~+300）
      ty: (Math.random() - 0.5) * 800,   // 目标Y偏移（-400~+400）
      rot: Math.random() * 720 - 360,    // 随机旋转
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}
```

- **`Math.random()`**：生成 0~1 随机小数
- **`Math.floor()`**：向下取整，用于随机选数组元素
- **`(Math.random() - 0.5) * 600`**：生成 -300 到 +300 的随机数。粒子向四面八方扩散，不只一个方向。
- **粒子系统 (Particle System)**：游戏/动效常用技术。每个粒子有初始位置和目标偏移，WXML 用 CSS transition 做"飞过去"的动画效果。

#### 4.4.4 页面导航

```javascript
goToVision() {
  wx.navigateTo({ url: '/pages/detect/detect' });
},
```

- **`wx.navigateTo()`**：跳转页面，用户可以点返回。
- **产品设计：渐进式披露**——首页只给四大入口按钮，不塞满内容。

---

### 4.5 pages/detect —— 视力检测核心页

**文件位置**：`/pages/detect/detect.js`

整个项目**最复杂、代码量最大**的页面。实现标准视力表检测流程。

#### 4.5.1 视力等级表（对数视力表）

```javascript
visionLevels: [
  { size: 240, level: '4.0' },
  { size: 190, level: '4.1' },
  { size: 150, level: '4.2' },
  // ... 逐级缩小到
  { size: 15, level: '5.2' }
],
```

**`size`** 是 E 字的显示大小（单位 rpx），**`level`** 是对应视力等级。字越小 → 需要眼睛分辨细节越精细 → 视力等级越高。

#### 4.5.2 随机符号生成

```javascript
refreshSymbol() {
  if (chartType === 'E') {
    eDirection = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
  } else if (chartType === 'number') {
    currentSymbol = ['0','1','2','3','4','5','6','8'][Math.floor(Math.random() * 8)];
  } else {
    currentSymbol = ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)];
  }
},
```

E 字表随机四方向、数字表随机 0-8（跳过易混淆的 7 和 9）、图形表随机圆/方/三角。

#### 4.5.3 触摸滑动判方向（纯数学，不依赖 AI）

```javascript
handleTouchEnd(e) {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - this._touchStartPoint.x; // 水平滑动
  const dy = touch.clientY - this._touchStartPoint.y; // 垂直滑动

  if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return; // 忽略太短的

  const isHorizontal = Math.abs(dx) > Math.abs(dy);
  if (isHorizontal) {
    this.handleRecognition(dx > 0 ? 0 : 180);  // 右滑=0度, 左滑=180度
  } else {
    this.handleRecognition(dy > 0 ? 90 : 270); // 下滑=90度, 上滑=270度
  }
},
```

- **向量方向识别**：手指抬起时计算位移向量 (dx, dy)
- **`Math.abs(dx)`**：取绝对值。比较 |dx| 和 |dy| 谁是主要方向
- **30px 阈值**：防止手指微颤误触发
- **完全不依赖 AI**，纯几何计算。在"触控模式"下使用。

#### 4.5.4 测试升级规则

```javascript
handleCorrect() {
  if (++correctCount >= 2 || currentLevel === 0) {
    currentLevel++;  // 连对2次 → 升级
    correctCount = 0;
  }
},
handleWrong() {
  if (++wrongCount >= maxWrong) {
    return this.finishTest(上一级的结果); // 错满2次 → 结束
  }
},
```

- **`++correctCount`**：自增运算符。`++x` 表示"先加 1，再用新值"
- **结束条件**：跑到最顶级 OR 错满 `maxWrong` 次

#### 4.5.5 性能优化：节流（Throttle）

```javascript
throttledSetData(data) {
  const now = Date.now();
  const minInterval = 100;  // 最多每100ms更新一次UI（10fps）
  if (now - this._lastUIUpdateTime > minInterval) {
    this.setData(data);
    this._lastUIUpdateTime = now;
  }
},
```

AI 每秒可能产生 30 帧结果。若每帧都 `setData` 会卡死。**节流为每 100ms 一次**，人眼察觉不到但性能降低到 1/3。

#### 4.5.6 防抖变体 + 冷却机制

```javascript
debounceDirection(value) {
  if (value === this._lastDetected) this._dirCount += 1;
  else { this._dirCount = 1; this._lastDetected = value; }

  const threshold = this.data.confidence >= 80 ? 3 : 4;
  // 高置信度需连续3帧, 低置信度需4帧
  if (this._dirCount >= threshold) {
    this.setData({ isProcessing: true });  // 进入700ms冷却期
    this.handleRecognition(value);
    setTimeout(() => this.setData({ isProcessing: false }), 700);
  }
},
```

不是简单阻止重复，而是要求**同一手势被连续检测 3-4 次**才确认。确认后进入 700ms 冷却期防止连续误判。兼顾准确性和响应速度。

---

### 4.6 GestureManager —— 手势识别总指挥官

**文件位置**：`/utils/GestureManager.js`

AI 交互的核心调度器。

#### 4.6.1 策略模式 + 自动降级

```javascript
async start(options = {}) {
  try {
    // 1. 首选：微信原生 VisionKit（快、准，但需新版微信）
    await this._startVisionKit(options);
    this.engineType = 'VK';
  } catch (vkError) {
    // 2. 备选：TensorFlow.js（通用但较慢）
    await this._startTFJS(options);
    this.engineType = 'TFJS';
  }
},
```

- **策略模式 (Strategy Pattern)**：同一功能两种实现，上层不关心底层细节。
- **降级 (Graceful Degradation)**：优先最优方案，失败自动切备选，用户无感知。
- **`async/await` + `try/catch`**："等一等，如果出错就换一条路"。

#### 4.6.2 事件驱动架构（观察者模式）

```javascript
on(event, callback) {
  this._listeners[event] = callback;
}
_emit(event, data) {
  if (this._listeners[event]) this._listeners[event](data);
}
```

- **`on('result', fn)`**：注册监听——"有结果时调用 fn"
- **`_emit('result', data)`**：触发通知——"结果来了！"
- GestureManager 不知道结果用来干什么，只管"有结果就喊一嗓子"。这叫**解耦**。

#### 4.6.3 手势到方向的映射表（适配器模式）

```javascript
_mapVKGestureToValue(gesture) {
  // E字模式：手势ID → 方向角度
  const map = { 6: 270, 2: 0, 1: 90, 3: 180 };
  // 6=点赞→上(270°), 2=剪刀→右(0°), 1=手掌→下(90°), 3=握拳→左(180°)
  return map[gesture] !== undefined ? map[gesture] : -1;
},
```

VisionKit 输出的是**手势类型 ID**，但项目需要的是**方向角度**。所以做一个翻译映射 → **适配器模式**。

#### 4.6.4 TFJS 手指方向计算 (atan2 角度法)

```javascript
_calculateValueFromPoints(points) {
  const indexTip = points[8];   // 食指尖
  const indexBase = points[5];  // 食指根
  const dx = indexTip.x - indexBase.x;
  const dy = indexTip.y - indexBase.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // 40度容差映射到四方向
  if (Math.abs(angle + 90) < 40) return 270;  // 上
  if (Math.abs(angle) < 40) return 0;          // 右
  if (Math.abs(angle - 90) < 40) return 90;    // 下
  if (Math.abs(angle - 180) < 40 || Math.abs(angle + 180) < 40) return 180;
},
```

- **`Math.atan2(dy, dx)`**：反正切函数，根据 y 和 x 差值计算角度
- **`* (180 / Math.PI)`**：弧度 → 角度转换
- **40 度容差**：手指不可能精确指向 0°/90°/180°/270°，给容差降低操作难度

#### 4.6.5 手指伸出计数算法

```javascript
const wrist = points[0];   // 手腕
const fingerTips = [8, 12, 16, 20];  // 四指尖
const fingerBases = [5, 9, 13, 17];  // 四指根

for (let i = 0; i < 4; i++) {
  const tipDist = Math.hypot(fingerTips[i].x - wrist.x, fingerTips[i].y - wrist.y);
  const baseDist = Math.hypot(fingerBases[i].x - wrist.x, fingerBases[i].y - wrist.y);
  if (tipDist > baseDist * 1.15) extendedCount++;  // 指尖比指根远15% → 伸直
}
```

- **`Math.hypot(x, y)`**：欧氏距离 = sqrt(x^2 + y^2)。比手动算更快更准。
- **启发式算法**：不追求 100% 精确，但多数情况足够好用。指尖距离 > 指根距离 × 1.15 → 手指伸直。

### MediaPipe 手部 21 关键点模型

```
     8(食指尖)    12(中指尖)   16(无名指尖)  20(小指尖)
     7            11           15            19
     6            10           14            18
     5(食指根)   9(中指根)   13(无名指根)  17(小指根)
     4(拇指尖)
     3
     2(拇指根)
     1
     0(手腕)
```

Google 预训练模型，输入图片 → 输出这 21 个点的精确坐标。本项目用索引 8(食指尖) 和 5(食指根) 算方向，用拇尖到腕距判断拇指伸展。

---

### 4.7 tfjs-engine —— TensorFlow.js AI 引擎

**文件位置**：`/utils/tfjs-engine.js`

**TensorFlow.js** 是 Google 的 JavaScript 机器学习库。让你在浏览器/微信里直接跑 AI 模型，不需要服务器。

**为什么在小程序里用**：
- 不把用户手部照片上传服务器（隐私保护）
- 不需要服务器 GPU（省钱）
- 利用手机自带 GPU 计算（WebGL 后端）

#### 4.7.1 引擎初始化

```javascript
async function initEngine() {
  tf = require('@tensorflow/tfjs-core');        // TF 核心
  require('@tensorflow/tfjs-backend-webgl');     // WebGL GPU加速
  handpose = require('@tensorflow-models/handpose'); // 手部模型
  fetchWechat = require('fetch-wechat');         // 微信网络适配

  const tfjsWechat = require('@tensorflow/tfjs-wechat');
  tfjsWechat.setupWechatPlatform({              // 微信平台适配
    fetchFunc: fetchWechat.fetchFunc(),
    tf,
    canvas: wx.createOffscreenCanvas({ type: 'webgl' })
  });

  await tf.setBackend('wechat-webgl');           // 用手机GPU

  model = await handpose.load({
    detectionConfidence: 0.6,   // 检测到手的置信度阈值 >=60%才报告
    scoreThreshold: 0.6         // 关键点置信度阈值
  });
}
```

- **`@tensorflow/tfjs-backend-webgl`**：WebGL 本用于 3D 图形，TF.js 借它做矩阵运算。GPU 比 CPU 快几十倍。
- **`@tensorflow/tfjs-wechat`**：微信不是标准浏览器，需要这个适配层才能用 TF.js。
- **`handpose.load()`**：加载 Google 预训练模型，下载模型文件到手机。
- **`detectionConfidence: 0.6`**：模型必须 ≥60% 把握"这里有手"才报告，降低误检。

#### 4.7.2 推理管线（核心流程）

```javascript
async function estimateHands(frame) {
  tf.engine().startScope();  // 开内存作用域
  try {
    // 1. 原始摄像头数据 → Tensor
    tensor = tf.tensor(new Uint8Array(frame.data), [frame.height, frame.width, 4]);

    // 2. RGBA → RGB（切除 Alpha 透明通道）
    const rgb = tf.slice(tensor, [0, 0, 0], [-1, -1, 3]);

    // 3. 模型推理（最耗时步骤）
    const predictions = await model.estimateHands(rgb, true); // true=水平翻转

    // 4. 标准化坐标
    const normalizedPoints = hand.landmarks.map(point => ({
      x: point[0] / frame.width,   // 归一化到 0~1
      y: point[1] / frame.height,
      z: point[2]
    }));
    return { score: hand.handInViewConfidence, points: normalizedPoints };
  } finally {
    tf.engine().endScope();  // 释放内存（防泄漏导致崩溃）
  }
}
```

**推理管线详解**：

1. **`tf.tensor(data, shape)`**：JS 数组 → Tensor。`shape = [高,宽,4]`（4通道=RGBA）
2. **`tf.slice(tensor, begin, size)`**：切片。切掉 Alpha 通道，RGBA → RGB
3. **`model.estimateHands(rgb, true)`**：喂图给模型，得 21 关键点。`true` = 水平翻转（前置摄像头是镜像的）
4. **归一化**：像素坐标 ÷ 图像宽高 → 0~1 比例值。不依赖分辨率。
5. **`startScope/endScope`**：AI 推理产生大量临时 Tensor，不释放会内存泄漏导致崩溃。

**注意**：`model.estimateHands` 是异步的（返回 Promise），不能放 `tf.tidy`（同步），必须手动 `startScope/endScope`。

---

### 4.8 color-simulation.js —— 色盲模拟算法

**文件位置**：`/utils/color-simulation.js`

#### 4.8.1 色彩空间知识

颜色有三种主流表示方式：
- **RGB**：红绿蓝三原色混合。`#FF0000` = 纯红
- **HSL**：色相(Hue) + 饱和度(Sat) + 亮度(Lightness)。`hsl(0,100%,50%)` = 纯红
- **十六进制 Hex**：`#RRGGBB` 格式

#### 4.8.2 色盲模拟：3x3 矩阵变换

```javascript
function simulateColorblind(hex, type) {
  const [r, g, b] = hexToRgb(hex);
  switch (type) {
    case 'protanopia':  // 红色盲
      nr = r * 0.56667 + g * 0.43333 + b * 0;
      ng = r * 0.55833 + g * 0.44167 + b * 0;
      nb = r * 0       + g * 0.24167 + b * 0.75833;
      break;
    case 'deuteranopia':  // 绿色盲
      nr = r * 0.625 + g * 0.375 + b * 0;
      ng = r * 0.7   + g * 0.3   + b * 0;
      nb = r * 0     + g * 0.3   + b * 0.7;
      break;
    case 'tritanopia':  // 蓝色盲
      nr = r * 0.95  + g * 0.05   + b * 0;
      ng = r * 0     + g * 0.43333 + b * 0.56667;
      nb = r * 0     + g * 0.475  + b * 0.525;
      break;
    case 'achromatopsia':  // 全色盲 → 灰度
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      nr = ng = nb = gray;
      break;
  }
  return rgbToHex(nr, ng, nb);
}
```

**原理**：色盲因视网膜某类视锥细胞缺失/异常。模拟 = 用一个 3x3 变换矩阵把"正常 RGB"映射成"色盲眼中的 RGB"。

以红色盲为例：新R = 原R×0.57 + 原G×0.43。意味着红色盲无法区分红和绿——它们在新R通道的值很接近。这些变换矩阵来自医学色彩科学研究，不是随便编的。

#### 4.8.3 WCAG 2.1 对比度计算

```javascript
function getLuminance(r, g, b) {
  const sRGB = [r,g,b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });  // 伽马校正
  return sRGB[0] * 0.2126 + sRGB[1] * 0.7152 + sRGB[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
```

**WCAG 标准**规定：正常文本对比度 ≥ 4.5:1。本项目用它量化"在色盲模拟下两个颜色还能区分吗？"
- **`Math.pow(base, exp)`**：求幂。`Math.pow(2, 3)` = 8
- **伽马校正**：屏幕亮度不是线性的，需要校正。公式来自国际标准
- **绿色权重 0.7152 >> 蓝色 0.0722**：人眼对绿色最敏感

---

### 4.9 color-train —— 色彩训练游戏

**文件位置**：`/pages/color-train/color-train.js`

包含三个色彩训练小游戏，锻炼色彩感知能力。

#### 游戏1：色差挑战 (Odd One Out)

```javascript
initOddOne() {
  const size = this.data.difficulty + 1;  // 难度高 -> 格子多
  const baseColor = this.getRandomColor();
  const diffColor = this.getLightenedColor(baseColor, 40 / difficulty);
  // 难度越高，亮度差越小（40/difficulty越来越小）
  const oddIndex = Math.floor(Math.random() * total);
  const items = Array(total).fill(0).map((_, i) => ({
    color: this.applySim(i === oddIndex ? diffColor : baseColor),
    isOdd: i === oddIndex
  }));
}
```

- **`Array(n).fill(0).map(...)`**：批量创建 n 个元素的数组
- **HSL 亮度操作**：`getLightenedColor()` 在保持色相/饱和度不变下增减亮度，产生"几乎一样但微有不同"的两个颜色
- **`applySim(color)`**：若用户选了色盲模拟模式，所有颜色显示前被变换，让正常视力者也能看到色盲眼中的世界 → **同理心设计**

#### 针对色盲类型的颜色生成策略（领域知识）

```javascript
getRandomColor() {
  if (type === 'protanopia') {
    // 红色盲：避开深红，多用黄蓝
    h = Math.random() < 0.5
      ? Math.floor(Math.random() * 60 + 40)   // 40-100 (黄绿)
      : Math.floor(Math.random() * 60 + 200);  // 200-260 (蓝)
  }
}
```

**领域知识驱动**：在红色盲模式下训练，游戏应避开红绿色盲无法区分的颜色（红绿），用能区分的颜色（黄蓝）。训练才有效果。

#### 游戏2：颜色记忆

```javascript
initMemory() {
  const deck = [...colors, ...colors]  // 展开运算符：每种颜色两份
    .sort(() => Math.random() - 0.5)   // 随机洗牌
    .map((c, i) => ({ id: i, color: this.applySim(c), flipped: false }));
}
```

- **`[...arr1, ...arr2]`**：展开运算符。`[...[1,2], ...[1,2]]` = `[1,2,1,2]` —— 凑配对
- **洗牌算法**：`sort(() => Math.random() - 0.5)`。最简单（非完美）的随机排列

#### 游戏3：渐变排序 + HSL 颜色插值

```javascript
initSort() {
  const startColor = this.getRandomColor();
  const endColor = this.getLightenedColor(startColor, 100);
  const items = Array(count).fill(0).map((_, i) => ({
    color: this.applySim(
      this.interpolateColor(startColor, endColor, i / (count - 1)))
  })).sort(() => Math.random() - 0.5);
}

interpolateColor(c1, c2, factor) {
  // factor=0 -> c1, factor=1 -> c2, 在HSL空间线性插值
  const h = Math.round(h1 + (h2 - h1) * factor);
  const s = Math.round(s1 + (s2 - s1) * factor);
  const l = Math.round(l1 + (l2 - l1) * factor);
  return `hsl(${h}, ${s}%, ${l}%)`;
}
```

从深色到浅色均匀采样 n 个颜色，打乱顺序。用户按亮度深浅重新排列。

---

### 4.10 package_colorblind —— 色盲检测

**文件位置**：`/package_colorblind/pages/colorblind/colorblind.js`

#### 石原检测图数据结构

```javascript
testList: [
  {
    id: 1,
    image: '/package_colorblind/assets/images/压缩图片/01.png.png',
    answer: '15',
    options: ['12', '15', '17', '18'],
    type: 'all'  // 检测类型: all/protanopia/deuteranopia/tritanopia
  },
  // ... 7张检测图
],
```

- 石原图（Ishihara plates）：彩色圆点组成图案，正常看到某数字，色盲可能看不到或看到另一个。
- 每张图标注 `type`：主要检测哪种色盲。

#### 色盲模拟叠加

```javascript
updateDisplayColors() {
  if (type !== 'normal') {
    bg = colorSim.simulateColorblind(bg, type);     // 矩阵变换
    target = colorSim.simulateColorblind(target, type);
  }
  const contrast = colorSim.getContrastRatio(bg, target).toFixed(2);
}
```

正常视力者也能**体验色盲眼中的世界**，理解为什么色盲患者看到的不同 → **同理心设计**。

---

### 4.11 astigmatism —— 散光检测

**文件位置**：`/pages/astigmatism/astigmatism.js`

#### 放射状散光表

```javascript
onLoad() {
  const lines = [];
  for (let i = 0; i < 180; i += 15) {
    lines.push({ angle: i });  // 12条线，每15度一条
  }
}
```

**医学原理**：散光 (Astigmatism) 是角膜在不同方向曲率不同（像橄榄球不是篮球）。散光患者看某些方向的线条比其它方向更清晰/更黑。用户选"最清晰的方向"确定散光轴向。这叫 **散光钟形表 (Astigmatic Fan)**。

#### 字符串模板替换

```javascript
suggestion = t.result.astigmatism.sugSuspect.replace('{axis}', this.data.selectedAxis);
// "疑似存在约{axis}° 轴向的散光" -> "疑似存在约45° 轴向的散光"
```

---

### 4.12 protect —— 护眼训练营

**文件位置**：`/pages/protect/protect.js`

#### 定时器驱动训练

```javascript
startTimer() {
  this.stopTimer();  // 先停旧定时器（防止多个叠加）
  this.timer = setInterval(() => {
    if (this.data.timeLeft > 0) {
      this.setData({ timeLeft: this.data.timeLeft - 1 });
      // 每20秒换语音鼓励
      if (this.data.timeLeft % 20 === 0 && this.data.timeLeft > 0) {
        const tips = ['真棒!继续加油！', '坚持住，眼睛会感谢你的', '做得很到位哦'];
        const tip = tips[Math.floor(Math.random() * tips.length)];
        this.playVoice(tip);
      }
    } else {
      this.finishGame();
    }
  }, 1000);  // 每秒执行一次
},
```

- **`setInterval(回调, 毫秒)`**：重复定时器。每秒减 1。
- **`%`（取余）**：`timeLeft % 20 === 0` → 能被 20 整除时触发（60、40、20 秒）
- **必须先 `clearInterval` 再创建**：否则多个定时器叠加，计时加倍变快。

#### 训练数据本地持久化

```javascript
saveStats(minutes) {
  const stats = wx.getStorageSync('protectStats') || { weeklyMinutes: 0, history: [] };
  stats.history.push({
    date: new Date().toLocaleDateString(),
    duration: minutes,
    gameId: this.data.currentGame.id
  });
  wx.setStorageSync('protectStats', stats);
}
```

记录每次训练的日期、时长、类型。存在本地，下次打开还在。

---

### 4.13 package_ai —— AI 对话助手

**文件位置**：`/package_ai/pages/chat/chat.js`

用户和 AI 大语言模型对话的聊天页面。

#### 4.13.1 流式响应 (Streaming)

```javascript
this._streamTask = deepseekApi.chatStream(
  context,   // 对话历史
  (chunk, fullText) => {
    // 每收到一小段文字就立刻显示（打字机效果）
    this.setData({ [`messages[${lastIdx}].content`]: fullText });
  },
  (fullText) => {
    // 全部接收完后的处理
    deepseekApi.saveHistory(currentMessages);
  },
  (err) => { /* 出错处理 */ }
);
```

**普通 API**：发请求 → 等 → 一次性拿到全部结果（用户盯空白屏傻等 3-5 秒）

**流式响应**：边生成边发送。模型每生成几个字就发来，前端立刻显示。所以和 ChatGPT 一样，回答是"打字机式"一个字一个字出现的。

**三个回调函数**：`onChunk`（每收到一段）、`onDone`（全部完成）、`onError`（出错）——这是**回调模式 (Callback Pattern)**。

#### 4.13.2 语音输入 (Whisper API)

```javascript
_recognizeVoice(filePath) {
  wx.uploadFile({
    url: 'https://api.deepseek.com/audio/transcriptions',
    filePath: filePath,  // 录音文件的本地路径
    name: 'file',
    header: { 'Authorization': `Bearer ${config.apiKey}` },
    formData: { model: 'whisper-1', language: 'zh' },
    success: (res) => {
      const data = JSON.parse(res.data);
      if (data.text) {
        this.setData({ inputValue: data.text });
        this.sendMessage();  // 自动发送
      }
    }
  });
}
```

- **`wx.uploadFile()`**：微信文件上传 API。把录音上传到 DeepSeek Whisper 服务做语音→文字转换。
- **`Authorization: Bearer sk-xxx`**：API 鉴权。`sk-xxx` 就像密码，服务器用它确认身份。
- **`JSON.parse(res.data)`**：服务器返回 JSON 字符串（`{"text": "你好"}`），需要解析成 JS 对象才能读。

#### 4.13.3 对话上下文窗口管理

```javascript
loadChatHistory() {
  const history = deepseekApi.loadHistory();  // 本地存储恢复历史
  this.setData({ messages: history });
}
buildContext(messages) {
  const recent = messages.slice(-(MAX_CONTEXT_ROUNDS * 2));
  // 只保留最近10轮对话，超过会超出API的Token限制
  return recent.map(m => ({ role: m.role, content: m.content }));
}
```

对话历史存手机里，关闭再打开还在 —— AI "记得你们聊过什么"。但每次请求只发最近 10 轮（约合 API 的 Token 限制），太长会超限或多花钱。

---

### 4.14 deepseek-api.js —— 与大语言模型通信

**文件位置**：`/utils/deepseek-api.js`

#### 4.14.1 流式请求实现

```javascript
function chatStream(messages, onChunk, onDone, onError) {
  const context = [SYSTEM_PROMPT, ...messages];
  requestTask = wx.request({
    url: 'https://api.deepseek.com/chat/completions',
    method: 'POST',
    enableChunked: true,  // 关键！启用分块传输
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Accept': 'text/event-stream'  // SSE格式
    },
    data: {
      model: 'deepseek-chat',
      messages: context,
      max_tokens: 1024,  // 最多生成1024个token
      temperature: 0.7,  // 创造性：0=确定，1=随机
      stream: true
    },
  });
  if (requestTask.onChunkReceived) {
    requestTask.onChunkReceived((res) => {
      // 每块原始字节 -> UTF-8解码 -> 解析SSE格式
      const text = _decodeUtf8(new Uint8Array(res.data));
      // 解析 'data: {...}

' 行
    });
  }
}
```

- **`enableChunked: true`**：告诉微信"响应分批到达，别等到齐再给"。HTTP 分块传输编码。
- **`onChunkReceived`**：微信的流式接收回调，每块数据到了就触发。
- **`temperature: 0.7`**：控制 AI 创造性。0 = 完全确定（数学题），1 = 高度随机（创意写作），0.7 = 聊天的甜区。
- **`max_tokens: 1024`**：限制一次最多生成的 Token 数（≈600-800 中文字）。既控制了回答长度，也控制了费用。
- **`stream: true`**：告诉 DeepSeek "用流式返回，不要一次性给我"。

#### 4.14.2 手写 UTF-8 流式解码器

```javascript
let _utf8Buf = [];  // 缓冲区

function _decodeUtf8(uint8Arr) {
  // 1字节: 0xxxxxxx (ASCII)
  // 2字节: 110xxxxx 10xxxxxx
  // 3字节: 1110xxxx 10xxxxxx 10xxxxxx (中文)
  // 4字节: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (Emoji)
  // 若当前块截断在多字节中间 -> 留着,等下一块凑齐再解析
}
```

**为什么需要**：`onChunkReceived` 返回原始字节（`Uint8Array`），可能把中文的 3 字节截在中间（第一块得前 2 字节、第二块得最后 1 字节）。直接解析会乱码。手写解码器维护缓冲区，不完全的字节先存着。这是处理流式二进制数据的**标准做法**。

- **`&` 和 `<<`（位运算符）**：`b1 & 0x1F` 取低 5 位，`<< 6` 左移 6 位，用来把多字节拼成一个 Unicode 码点。

#### 4.14.3 System Prompt（提示词工程）

```javascript
const SYSTEM_PROMPT = {
  role: 'system',
  content: '你是"灵眸慧检"小程序的AI健康助手，专注于眼部健康和视力保护领域。请用简洁友好的方式回答，每次回复控制在200字以内。'
};
```

在用户消息发送前，**悄悄先给 AI 一条指令**，告诉它"你是谁、领域是什么、怎么说话"。用户看不到这条消息。

通过 System Prompt，**把通用大模型变成眼科健康专家**——这是**提示词工程 (Prompt Engineering)** 的基础应用。

---

### 4.15 tts.js —— 文本转语音

**文件位置**：`/utils/tts.js`

#### 音频队列播放

```javascript
let _audioQueue = [];
let _isPlaying = false;

function _playNext() {
  if (_audioQueue.length > 0) {
    const nextUrl = _audioQueue.shift();  // 从队头取出
    _isPlaying = true;
    ctx.src = nextUrl;
    ctx.play();  // 播完自动触发 onEnded -> _playNext()
  }
}
```

- **队列 (Queue) 数据结构**：先进先出。`shift()` 取第一个。
- 多个 TTS 请求并发时，不用队列会互相覆盖导致声音混乱。

#### TTS API 调用

```javascript
function speak(text) {
  wx.request({
    url: 'https://api.deepseek.com/audio/speech',
    method: 'POST',
    data: { model: 'tts-1', voice_id: 501001, input: text, response_format: 'mp3' },
    responseType: 'arraybuffer',  // 二进制MP3数据
    success(res) {
      const fs = wx.getFileSystemManager();
      fs.writeFile({
        filePath: `${wx.env.USER_DATA_PATH}/tts_${Date.now()}.mp3`,
        data: res.data,
        encoding: 'binary',
        success() { _audioQueue.push(filePath); if (!_isPlaying) _playNext(); }
      });
    }
  });
}
```

- **`responseType: 'arraybuffer'`**：告诉微信"返回的是二进制 MP3，不是文字"
- **`wx.getFileSystemManager().writeFile()`**：二进制 → 本地 MP3 文件
- **`Date.now()` 做文件名**：时间戳保证每次不重名不覆盖

---

### 4.16 i18n.js —— 中英文双语系统

**文件位置**：`/utils/i18n.js`

i18n = Internationalization（国际化）。

```javascript
const translations = {
  zh: {
    common: { back: '返回', confirm: '确认', cancel: '取消' },
    index: { title: '灵眸慧检', visionMode: '视力模式' },
    detect: { preparing: '正在准备...', enableAI: '启用AI' },
  },
  en: {
    common: { back: 'Back', confirm: 'Confirm', cancel: 'Cancel' },
    index: { title: 'AI Vision Test', visionMode: 'Vision Mode' },
    detect: { preparing: 'Preparing...', enableAI: 'Enable AI' },
  }
};
module.exports = { translations };
```

**实现原理**：
1. 所有界面文字不写死在代码里（不是 `"视力模式"`），而是从翻译对象取（`t.index.visionMode`）
2. 切换语言只需改一个变量 `lang`，所有页面重新绑定翻译文本
3. app.js 的 `setLanguage()` 遍历所有打开页面，调用它们的 `updateLanguage()`

**好处**：加第三种语言（如日语）只需加一个 `ja: {...}` 对象，**不改任何业务逻辑**。翻译人员直接编辑这个文件，不看代码。

---

### 4.17 components —— 可复用组件

组件是小程序的"积木块"——UI + 逻辑打包成独立模块，任何页面都能复用。

#### vision-chart 组件（视力表符号）

```javascript
Component({
  properties: {
    type: { type: String, value: 'E' },     // E/number/graphic
    size: { type: Number, value: 100 },     // 大小
    rotation: { type: Number, value: 0 },   // 旋转角度
    symbol: { type: String, value: 'E' }    // 显示符号
  }
})
```

极简组件——只接收属性，没有方法。就像一个"万能显示框"，告诉它类型/大小/角度/符号，它照做。detect 页面反复渲染它。

#### greeting-dialog 组件（打字机效果）

```javascript
_typeText(text, callback) {
  let i = 0;
  this._typeTimer = setInterval(() => {
    if (i < text.length) {
      this.setData({ displayText: text.substring(0, i + 1) });
      i++;
    } else {
      clearInterval(this._typeTimer);
      setTimeout(() => { callback && callback(); }, 600);
    }
  }, 60);  // 每60ms出一个字
},
```

- **`text.substring(0, i + 1)`**：从第0字符截到第 i+1，每 60ms i 加 1 → "打字机"效果
- **`callback && callback()`**：短路求值。如果 callback 存在就执行，等价于 `if(callback) callback()`

#### float-ball 组件（悬浮 AI 助手球）

全局可见的浮动小球。点按进入 AI 对话，长按语音输入。

**拖拽实现**：
```javascript
onTouchMove(e) {
  const dx = touch.clientX - this._startX;
  const dy = touch.clientY - this._startY;
  const rpxRatio = 750 / wx.getSystemInfoSync().windowWidth;
  // 设计师用750宽的设计稿 -> 需要屏幕适配
  let newX = this._startPosX + dx * rpxRatio;
  let newY = this._startPosY + dy * rpxRatio;
  // 值域限制 (Clamping) -> 不拖出屏幕
  newX = Math.max(0, Math.min(630, newX));
  newY = Math.max(0, Math.min(1400, newY));
},
```

**松手吸附**：
```javascript
onTouchEnd() {
  const snapX = this.data.posX < 375 ? 20 : 630;
  // 左半屏 -> 左侧边缘, 右半屏 -> 右侧边缘
  this.setData({ posX: snapX });
},
```

**语音交互闭环**：长按录音 → Whisper API 转文字 → DeepSeek Chat 获回复 → TTS 读出来。完整的 **语音→文字→AI→语音** 闭环。

---

## 五、完整技术流总结

把前面所有技术串联——一个用户从打开小程序到完成视力检测：

```
用户打开小程序
    |
    v
[app.js onLaunch]
    |-- 读本地语言设置 -> 加载翻译 (i18n)
    |-- 读本地用户信息 -> 恢复登录
    +-- 按时间生成问候语 (规则引擎)
    |
    v
[pages/index 首页]
    |-- 显示问候 + 四大入口按钮
    +-- 可选：中英切换（粒子粉碎动画）
    |
    v  点击「视力模式」
[pages/detect 检测页]
    |-- 初始化视力等级表
    |-- 生成第一个E字(随机方向)
    |
    |-- [触控模式] 滑动判方向
    |   +-- handleTouchEnd() -> 算dx,dy -> 映射到E字方向
    |
    +-- [AI手势模式] 空中比划
        |-- GestureManager.start()
        |   |-- 尝试 VisionKit (原生) -> 成功? VK引擎
        |   +-- 失败? -> TensorFlow.js
        |       |-- initEngine() -> 下载模型
        |       |-- 加载handpose -> 设置WebGL后端
        |       +-- 每帧: frame->Tensor->推理->关键点
        |
        +-- _calculateValueFromPoints() -> 方向/数字
        +-- debounceDirection() -> 防抖确认
        +-- handleRecognition() -> 判对错
    |
    |-- 判对: correctCount++, 连对2次->升级+新符号(更小)
    +-- 判错: wrongCount++, 满2次->取上级结果->结束
    |
    v
[pages/result 结果页]
    |-- 读lastTestResult -> 生成分析文字
    |-- 弹引导弹窗(推荐训练)
    +-- 提供后续: 重测/护眼训练/色彩训练/散光训练
```

AI 对话路径：
```
用户说话
  -> onVoiceStart [录制mp3]
  -> onVoiceEnd [停止录音]
  -> wx.uploadFile [上传到Whisper API]
  -> JSON.parse [解析文字结果]
  -> deepseekApi.chatStream [流式发送给LLM]
  -> onChunkReceived [逐字显示 + TTS逐句播报]
  -> onDone [保存对话历史]
```

---

## 六、为什么这么设计 —— 架构决策

### 6.1 双 AI 引擎 + 降级策略

**问题**：VisionKit 快准但需新版微信+高性能手机。

**方案**：策略模式 + 自动降级。先试 VisionKit，失败自动切 TF.js。用户无感知。

### 6.2 分包加载 (Lazy Loading)

**问题**：TF.js + npm 依赖体积远超微信主包 2MB 限制。

**方案**：把色盲、AI对话、眼保健操、登录拆成4个分包。用到时才下载。首页加载快。

### 6.3 流式响应 vs 一次性响应

**问题**：AI 生成需 3-5 秒，等全部生成完再显示 → 用户盯空白屏幕。

**方案**：SSE 流式响应。边生成边显示（打字机效果），等待感大大降低。

### 6.4 本地存储 vs 服务器存储

**问题**：用户数据存哪？服务器成本+隐私风险。

**方案**：全用微信本地存储 (`wx.setStorageSync`)。零服务器成本，隐私不离开手机，无网络也能看历史。代价是换手机后数据不跟随（可接受）。

### 6.5 为什么不用 React/Vue？

**原因**：微信原生框架对硬件支持最好（摄像头、录音、文件系统等 API 原生集成）。引入框架会增加包体积、拖慢启动，且硬件 API 兼容性不如原生。**最小依赖原则**——平台原生能解决的，不引入第三方框架。

### 6.6 事件驱动 (GestureManager)

**原因**：手势识别结果"不知道也不该知道"上层怎么用。通过 `on('result', fn)` 注册监听，`_emit('result', data)` 通知，彻底解耦。新增检测模式只需注册新监听。

### 6.7 节流 + 防抖 (性能)

**原因**：AI 每秒 30 帧，每帧 `setData` 会卡死。节流到 10fps + 防抖 3-4 帧确认 + 700ms 冷却。人眼无感，性能可控。

---

## 附录：npm 依赖包一览

| 包名 | 用途 |
|------|------|
| `@tensorflow/tfjs-core` | TensorFlow.js 核心库，数学运算引擎 |
| `@tensorflow/tfjs-backend-webgl` | 用手机 GPU 加速 AI 计算 |
| `@tensorflow/tfjs-wechat` | TF.js 的微信平台适配层 |
| `@tensorflow-models/handpose` | Google 预训练手部 21 关键点检测模型 |
| `fetch-wechat` | 在微信里模拟浏览器 fetch API |
| `seedrandom` | 可复现的随机数生成器 |
| `rimraf` | 递归删除文件夹（构建工具用） |

这些包安装在 `node_modules/` 文件夹，微信开发者工具构建时自动打包进小程序。

---

> **文档版本**：v1.0
> **创建时间**：2026-05-15
> **适用项目**：灵眸慧检 (AI Vision Test) 微信小程序
> **讲解风格**：零基础入门，逐行逐函数讲解，代码引用均来自项目实际源码
