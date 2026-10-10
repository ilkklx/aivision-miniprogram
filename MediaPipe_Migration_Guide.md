# 微信小程序手势识别技术方案迁移评估与设计文档
## (VisionKit 替换为 MediaPipe/OpenCV 方案)

### 1. 现状分析与可行性评估

当前项目中，手势识别基于微信原生的 `VKSession` (VisionKit) 实现。虽然 VisionKit 提供了原生的硬件加速和极低的代码接入成本，但在部分设备上存在兼容性黑洞（如摄像头被占用、底层驱动死锁等），导致 AI 功能无法启动或画面卡死。

**将 VisionKit 替换为 MediaPipe + OpenCV 的可行性：**

*   **技术路径**：通过引入 TensorFlow.js (`@tensorflow/tfjs-core`, `@tensorflow/tfjs-backend-webgl`) 以及其微信小程序适配层 (`@tensorflow/tfjs-wechat`)，加载 MediaPipe Hands 模型（如 `handpose`）。
*   **性能挑战 (FPS)**：
    *   在微信小程序环境中，JS 引擎与 WebGL 的通信开销较大。
    *   MediaPipe Hands 包含两个网络（手掌检测 + 关键点回归），计算量大。
    *   **预估表现**：在 iPhone 12 及以上的高端机型可以勉强达到 20-30 FPS；但在中低端安卓机型上，通常只能维持在 **5-15 FPS**，并且会伴随严重的设备发热和内存溢出 (OOM) 风险。
*   **基础库要求**：需要较高版本的基础库以支持 `OffscreenCanvas` 和 WebGL 2.0，且小程序的代码包体积会显著增加（模型文件通常在 3MB-10MB 之间）。
*   **结论**：**技术上完全可行，但性能代价极高**。在低端机型上，MediaPipe 的流畅度远不如原生的 VisionKit。如果必须替换，建议采用极轻量级的分类模型（如 MobileNet）而非完整的 21 关键点检测网络。

### 2. MediaPipe Hands 与 OpenCV 的集成架构设计

为了最大化性能并保证兼容性，新架构应分为以下几个独立模块：

#### A. 视频流采集层 (Camera Stream)
*   **组件**：原生 `<camera>` 组件。
*   **机制**：使用 `wx.createCameraContext().onCameraFrame()` 获取实时视频帧（`ArrayBuffer` 格式的 RGBA 像素数据）。
*   **优化**：设置 `frame-size="low"` 或 `"medium"` 以减少数据传输量。

#### B. 图像预处理层 (OpenCV.js / WebGL)
*   **职责**：由于小程序中 JS 运算性能低下，直接使用 JS 处理像素数据会导致严重卡顿。
*   **方案 1 (推荐)**：利用 WebGL Shader 进行图像裁剪、缩放和镜像翻转。
*   **方案 2 (备选)**：引入编译为 WASM 的 OpenCV.js 进行图像处理。注意：OpenCV.js 体积庞大（约 8MB），且 WASM 在小程序中的初始化较慢，不建议在对体积敏感的小程序中使用全量 OpenCV。

#### C. AI 推理层 (TFJS + MediaPipe)
*   **环境初始化**：引入 `@tensorflow/tfjs-wechat` 并调用 `plugin.configPlugin()`。
*   **模型加载**：在小程序的 `onLoad` 或使用分包异步加载模型权重文件。
*   **推理执行**：将预处理后的图像转换为 `tf.Tensor`，输入到 `handpose` 模型中获取 21 个关键点坐标。
*   **内存管理**：**至关重要**。必须在每一帧推理结束后调用 `tf.dispose()` 清理中间 Tensor，否则极易 OOM。

#### D. 业务逻辑层 (Gesture Mapping & UI)
*   **职责**：根据关键点计算角度/距离，映射为 5 种基本手势（点击、滑动、缩放、旋转、确认/点赞）。
*   **防抖**：实现滑动窗口滤波，平滑手势抖动。

### 3. 核心代码实现框架 (纯 NPM 方案，无插件依赖)

#### 页面逻辑 (`detect.js`)
```javascript
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/handpose';
const tfjsWechat = require('@tensorflow/tfjs-wechat'); // 使用 NPM 适配器
const fetchWechat = require('fetch-wechat');

Page({
  async onLoad() {
    // 初始化 TFJS 微信适配器 (替代 tfjsPlugin 插件)
    tfjsWechat.setupWechatPlatform({
      fetchFunc: fetchWechat.fetchFunc(),
      tf,
      canvas: wx.createOffscreenCanvas({ type: '2d' })
    });
    
    await tf.setBackend('wechat-webgl');
    this.loadModel();
  },
  // ... 其余逻辑保持不变
});
```

### 4. 兼容性与现有模块对接

*   **UI 层兼容**：底层数据源虽然从 `VKSession` 切换为了 `onCameraFrame` + TFJS，但向上层抛出的数据结构（`landmarks` 数组）可以很容易地转换为与原有逻辑一致的格式。现有的 `analyzeHandDirection` 和 `debounceDirection` 函数可以无缝复用。
*   **降级策略**：由于 TFJS 加载模型较慢且耗内存，原有的“默认稳定触控，可选 AI”的产品形态变得更加必要。如果 `tf.setBackend` 失败或内存不足，直接退回触控模式。

### 5. 性能优化与测试建议 (目标：FPS ≥ 30)

要在这套架构下达到 30 FPS，在小程序中极具挑战性。必须采取以下极限优化：

1.  **跳帧处理 (Frame Skipping)**：
    *   不处理 `onCameraFrame` 传来的每一帧。例如，每隔 2-3 帧才将图像送入模型推理。
    *   在两帧之间，如果手部移动不剧烈，复用上一帧的推理结果。
2.  **内存池化与 `tf.tidy()`**：
    *   **绝对禁止**在每一帧创建新的大数组或未释放的 Tensor。必须使用 `tf.tidy()` 自动回收同步执行的 Tensor，或手动 `dispose()` 异步操作中的 Tensor。
3.  **模型轻量化 (Quantization)**：
    *   默认的 `handpose` 模型可能过于庞大。建议使用 `tfjs-converter` 将模型转换为 `Float16` 或 `Int8` 量化版本，牺牲微小精度换取大幅速度提升。
4.  **Worker 线程 (可选)**：
    *   尝试将数据预处理（如 Uint8Array 转换）放入小程序的 Worker 线程中执行，避免阻塞主 UI 线程的渲染。

### 6. 迁移指南总结

**第一步：环境搭建**
1.  在小程序管理后台添加 `tfjsPlugin` 插件权限。
2.  在项目中通过 npm 安装 `@tensorflow/tfjs-core`, `@tensorflow/tfjs-backend-webgl` 及相关模型库，并构建 npm。

**第二步：代码替换**
1.  移除所有与 `VKSession` 相关的代码（`initVKSession`, `_startVKWithGL`, `startVKFrameLoop`）。
2.  保留原有的手势分析（`detectDirectionGesture` 等）和 UI 更新逻辑。
3.  引入上述 TFJS 架构代码，接管 `camera` 组件的 `onCameraFrame` 数据流。

**第三步：性能调优与发布**
1.  在微信开发者工具的“真机调试”模式下，使用 Performance 面板监控内存增长曲线。如果出现阶梯式上升，立即排查 `tensor.dispose()` 的遗漏。
2.  针对低端机型设置白名单或黑名单，对于性能评分极低的设备，直接禁用 AI 模式选项。