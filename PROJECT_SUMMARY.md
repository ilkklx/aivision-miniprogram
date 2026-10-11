# 项目总结 · 灵眸慧检（aivision-miniprogram）

> 本文档是仓库的**自包含项目说明**：目标让任何读者（或 AI）只读这一篇，就能完整了解这个小程序是什么、怎么实现、怎么跑、有哪些已知问题。关键结论标注来源文件。
> 撰写时间：2026-10-10。基于对仓库全部文件的通读核对（含 70 张候选图片的逐张识图筛查）。

---

## 1. 一句话定位

"灵眸慧检"（英文文案 AI Vision Test）是一个**眼健康检测与护眼训练微信小程序**（中国大学生计算机设计大赛参赛作品），面向儿童青少年近视防控场景，把视力表检测、色觉检测、散光初筛、护眼训练做成手机端自助工具。背景数据（PPT 引用）：2022 年我国儿童青少年总体近视率 51.9%（小学 36.7% / 初中 71.4% / 高中 81.2%）。

## 2. 功能模块（来源：app.json）

| 模块 | 路径 | 功能 |
|---|---|---|
| 首页 | pages/index | 四大入口 + 登录入口 + 中英语言切换 + 粒子动画 + 悬浮球 AI 助手 |
| 视力检测 | pages/detect | 13 级 E 字/数字/图形视力表（4.0–5.2），触控滑动或 AI 手势作答，左/右眼切换 |
| 检测结果 | pages/result | 视力/色觉/散光共用报告页（等级分析 + 护眼引导弹窗） |
| 护眼训练 | pages/protect | 追星星/气球/风车 3 个 60 秒游戏 + 周训练分钟统计 |
| 散光检测 | pages/astigmatism | 12 条射线散光表，旋转选择清晰轴位 |
| 散光训练 | pages/astigmatism-train | 经线对齐转盘（15° 步进）+ 旋转 Gabor 对比度训练 + 连续天数 |
| 色彩训练 | pages/color-train | 色差挑战/色彩记忆/渐变排序（色盲感知配色 + HSL 工具） |
| 色觉检测（分包） | package_colorblind | 7 张石原氏图（5/1/36/6/骆驼/猎豹/铃鹿），5 种色觉模拟 + WCAG 对比度 |
| AI 聊天（分包） | package_ai | DeepSeek 流式对话，文字/语音提问 + TTS 朗读 |
| 用户登录（分包） | package_user | 本地头像/昵称登录（无 wx.login、纯本地） |
| 眼保健操（分包） | package_eye_exercises | 6 节图解轮播 |
| 全局组件 | components/ | vision-chart（视力表符号）/ float-ball（悬浮球：拖拽吸附、单击进聊天、长按录音）/ greeting-dialog |

## 3. 技术栈

| 技术 | 用途 | 证据文件 |
|---|---|---|
| 微信原生小程序 | WXML/WXSS/JS，4 个分包 + lazyCodeLoading | app.json |
| VisionKit（wx.createVKSession） | 手势识别主引擎（track hand mode 1, v2） | utils/GestureManager.js |
| TensorFlow.js（纯 NPM 方案） | 手势识别降级引擎（handpose；为修复微信插件权限错误 80082 从插件方案切换） | utils/tfjs-engine.js |
| DeepSeek Chat API（SSE） | AI 健康助手对话 | utils/deepseek-api.js |
| DeepSeek Whisper API | 语音转文字 | package_ai/pages/chat/chat.js |
| DeepSeek TTS API | 文字转语音（分句队列播放） | utils/tts.js |
| Canvas 2D | 手部 21 关键点可视化 | pages/detect/detect.wxml |
| 本地存储 | 全部数据 wx.setStorageSync（无后端、无云开发） | app.js 及各页 stats |
| 色觉模拟算法 | 4 类色盲矩阵 + WCAG 对比度 | utils/color-simulation.js |
| 基础库 3.15.1，appid 使用者自行配置的 AppID | project.config.json | — |

未使用 MediaPipe（`MediaPipe_Migration_Guide.md` 仅为迁移评估文档）。

## 4. 手势识别详解（本项目最复杂模块）

**架构**（utils/GestureManager.js，241 行）：状态机 IDLE→STARTING→RUNNING；`start()` 先试 **VisionKit**，异常则 try/catch 自动降级 **TFJS**；事件机制（on/_emit）向页面抛结果。

**手势 → 答案映射**（_mapVKGestureToValue）：
- E 字模式：6→270°、2→0°、1→90°、3→180°（点赞/剪刀/手掌/握拳）；
- 数字模式：1→'5'、2→'2'、4→'1'、7→'3'、9→'6'、10→'8'、12→'4'、13→'0'；
- 图形模式：13→circle、2→triangle、1→square。

**关键点规则**（_calculateValueFromPoints，需 ≥21 关键点）：E 字模式用 `atan2(点8-点5)` 算手指方向（容差 40°）；数字模式指伸展计数（指尖-腕距 > 指根-腕距 × 1.15，拇指 × 1.1）；图形模式 `dist(点4,点8) < 0.06` 判圆形。

**接入方式**（pages/detect/detect.js）：**非自动开启**（用户点"启用 AI"才启动，默认触控）；方向需连续 2–4 帧一致（置信度 ≥80 时阈值 3，否则 4）才确认；确认后 700 ms 冷却锁；结果与触控走同一判分链路。

**局限**：① VisionKit 设备兼容性不完整（部分机型不可用）；② TFJS 降级路径需手动 npm 构建，性能预估 iPhone 12+ 20–30 FPS、中低端安卓 5–15 FPS；③ 模拟器不支持手势；④ 图形模式仅完整实现圆形识别。

## 5. AI 聊天链路（DeepSeek）

1. 文字输入或长按悬浮球（≥800 ms）录音；
2. 语音：`wx.uploadFile` → `api.deepseek.com/audio/transcriptions`（whisper-1）；
3. 对话：`chatStream()` 用 `wx.request` + `enableChunked` 解析 SSE；**手写 UTF-8 状态机解码器**修复流式分块拆断中文/emoji 的乱码（技术亮点）；
4. 流式内容按标点分句送 TTS 队列（写入 USER_DATA_PATH 后播放）；
5. 上下文：本地存上限 50 条，只取最近 10 轮；系统提示词原文："你是'灵眸慧检'小程序的AI健康助手，专注于眼部健康和视力保护领域。请用简洁友好的方式回答，每次回复控制在200字以内。"
6. **密钥**：原代码 `utils/config.js` 与 `package_ai/utils/config.js`（死代码副本）各含一份真实 DeepSeek 密钥；**公开前已替换为占位符 `空字符串`**，使用者需自备。

## 6. 如何运行

1. 微信开发者工具导入本目录，基础库 3.15.1；
2. 触控路径开箱即用；手势需 `npm install @tensorflow/tfjs-core @tensorflow/tfjs-backend-webgl @tensorflow/tfjs-wechat @tensorflow-models/handpose fetch-wechat` 后"构建 npm"（package.json 未声明依赖）；
3. AI 聊天需填 Key；摄像头权限声明见 app.json。

## 7. 图片筛查记录（隐私）

从比赛 PPT/作品报告中抽出 70 张候选图，逐张识图筛查：**8 张含真人照片/面部（体检场景、手持手机调试、眼保健操真人演示）全部剔除、不随仓库**；选出 8 张纯界面/架构/流程图存入 `docs/screenshots/`（对应原件：bg1_image4、ppt_image56、bg1_image2、ppt_image32、bg1_image17、ppt_image18、ppt_image9、ppt_image47）。

## 8. 问题与异常清单（通读发现）

1. **密钥**（最高优先级）：两处明文密钥，已脱敏（见 §5.6）；`package_ai/utils/` 为**死代码区**（旧版 deepseek-api.js + 重复 tts.js + config.js 副本，全项目无引用），保留存档；
2. **死代码**：`components/greeting-dialog/`（无引用）、`package_eye_exercises/.../test-image.js`（未注册）；
3. **双扩展名文件**：`bg.png.png`、`logo.png.png`、色盲图 `01.png.png` 等 9 个——代码引用与实际文件名一致，功能无碍；
4. **占位实现**：detect/protect/color-train 中 `playVoice` 均为 console.log 占位；
5. **文案不一致**：i18n.js 眼保健操名称与 eye-exercises.js names 数组不同；
6. appid 写死 使用者自行配置的 AppID（原参赛 appid），使用者可换测试号。

## 9. 存疑点

- bg1_image13（节拍器代码截图）与现版本代码不对应，疑旧版残留；
- ppt_image29（手势通用流程图）与实际实现不完全对应，未入选截图；
- learn.md/study.md 提到 seedrandom、rimraf，package.json 无记录（疑历史依赖）；
- null：package_ai 死代码的新旧版本关系已 grep 确认无隐性引用。
